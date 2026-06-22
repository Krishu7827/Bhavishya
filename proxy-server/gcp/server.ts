// Vertex AI -> OpenAI-compatible proxy
// Forwards requests to Vertex AI's built-in OpenAI compatibility endpoint,
// attaching a fresh GCP access token on every call.
//
// WHY THIS EXISTS:
// Gemini 3.x thinking models require a `thought_signature` to be echoed back
// on every subsequent tool call in multi-turn conversations. The OpenAI schema
// has no field for it, so clients like Copilot silently drop it when they
// reconstruct history. This proxy captures signatures from Vertex responses —
// including *streaming* ones — and reinjects them into the next outgoing
// request so the client never needs to know they exist.
//
// IMPORTANT: thought_signatures are NOT static or reusable.
// Each one is cryptographically bound to a specific generation (the model's
// internal reasoning state for that exact tool call). You cannot cache them
// permanently or share them across conversations — they must be captured
// per-turn and echoed back in the same conversation thread.

import 'dotenv/config';
import express from 'express';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || 'global';
const PORT = process.env.PORT || 8787;

/** Default model to use if not specified in the request */
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'google/gemini-3.1-pro-preview';

if (!PROJECT_ID) {
  console.error('Set GCP_PROJECT_ID before starting (export GCP_PROJECT_ID=your-project-id)');
  process.exit(1);
}

// Gemini 3.x models are only on the global endpoint, not per-region.
const VERTEX_HOST =
  LOCATION === 'global' ? 'aiplatform.googleapis.com' : `${LOCATION}-aiplatform.googleapis.com`;
const VERTEX_BASE = `https://${VERTEX_HOST}/v1/projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/openapi`;

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

const app = express();
app.use(express.json({ limit: '50mb' }));

async function freshToken(): Promise<string> {
  const token = await auth.getAccessToken();
  if (!token) throw new Error('Failed to obtain GCP access token');
  return token;
}

// ─── Signature cache ─────────────────────────────────────────────────────────
// Maps tool_call.id -> thought_signature string.
// Lives in memory for the duration of a single proxy run.
// Signatures are NOT permanent — they are per-generation and per-conversation.
const signatureCache = new Map<string, string>();

// All the field names Vertex has been observed to use on the OpenAI-compat
// surface (the exact location isn't nailed down in public docs yet).
function extractSignature(obj: any): string | null {
  if (!obj) return null;
  return (
    obj.thought_signature ||
    obj.thoughtSignature ||
    obj.extra_content?.google?.thought_signature ||
    obj.provider_specific_fields?.thought_signature ||
    null
  );
}

// ─── Non-streaming: extract signatures from a complete response body ──────────
function cacheSignaturesFromResponse(parsed: any): void {
  const message = parsed?.choices?.[0]?.message;
  if (!message) return;

  const toolCalls: any[] = message.tool_calls || [];
  for (const tc of toolCalls) {
    // Signature may live on the tool call itself, on the parent message, or
    // as a top-level field on the response object (all observed in the wild).
    const sig =
      extractSignature(tc) ||
      extractSignature(message) ||
      extractSignature(parsed);

    if (tc.id && sig) {
      signatureCache.set(tc.id, sig);
      console.log(`[proxy] cached signature for tool_call ${tc.id} (non-stream)`);
    }
  }
}

// ─── Streaming: parse SSE on the fly, cache signatures, forward chunks ────────
// This is the critical path that was missing in the original code.
// Copilot always uses stream:true, so without this the cache stayed empty
// and injection never fired, causing the 400 on every multi-turn tool call.
async function* streamWithSignatureCapture(body: AsyncIterable<Uint8Array>): AsyncGenerator<Uint8Array> {
  const decoder = new TextDecoder();

  // Accumulate per-index because a single tool call may arrive spread across
  // multiple SSE chunks (id in chunk 1, thought_signature in chunk 2, etc.).
  const accumulated: Record<number, { id?: string; sig?: string }> = {};

  for await (const chunk of body) {
    // Parse the chunk for signatures BEFORE yielding so the cache is ready
    // as soon as the stream is consumed, not after.
    const text = decoder.decode(chunk, { stream: true });

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;

      try {
        const parsed = JSON.parse(trimmed.slice(6));
        const delta = parsed?.choices?.[0]?.delta;

        if (Array.isArray(delta?.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = typeof tc.index === 'number' ? tc.index : 0;
            if (!accumulated[idx]) accumulated[idx] = {};

            if (tc.id) accumulated[idx].id = tc.id;

            // Signature can be on the tool_call delta, on the message delta,
            // or on the top-level parsed object.
            const sig =
              extractSignature(tc) ||
              extractSignature(delta) ||
              extractSignature(parsed);

            if (sig) accumulated[idx].sig = sig;
          }
        }
      } catch {
        // Ignore malformed SSE lines — just forward the chunk.
      }
    }

    yield chunk; // Forward to client immediately (low-latency streaming).
  }

  // Stream fully consumed — persist all signatures we found.
  for (const entry of Object.values(accumulated)) {
    if (entry.id && entry.sig) {
      signatureCache.set(entry.id, entry.sig);
      console.log(`[proxy] cached signature for tool_call ${entry.id} (stream)`);
    }
  }
}

// ─── Injection: patch cached signatures back into outgoing assistant messages ─
function injectSignatures(messages: any[]): any[] {
  return messages.map((m) => {
    if (m.role !== 'assistant' || !Array.isArray(m.tool_calls)) return m;

    const tool_calls = m.tool_calls.map((tc: any) => {
      // Skip if signature is already present.
      if (!tc.id || extractSignature(tc)) return tc;

      const sig = signatureCache.get(tc.id);
      if (!sig) {
        console.warn(`[proxy] ⚠ no cached signature for tool_call ${tc.id} — Vertex may reject this turn`);
        return tc;
      }

      console.log(`[proxy] reinjecting signature for tool_call ${tc.id}`);
      return {
        ...tc,
        // Both field names, in case Vertex reads one or the other:
        thought_signature: sig,
        extra_content: {
          ...(tc.extra_content ?? {}),
          google: {
            ...(tc.extra_content?.google ?? {}),
            thought_signature: sig,
          },
        },
      };
    });

    return { ...m, tool_calls };
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const token = await freshToken();

    // Apply default model if not specified in the request
    const requestedModel = DEFAULT_MODEL;

    // Deep-clone to avoid mutating req.body, then inject signatures.
    const modifiedMessages = injectSignatures(
      JSON.parse(JSON.stringify(req.body.messages ?? []))
    );
    const modifiedBody = { ...req.body, model: requestedModel, messages: modifiedMessages };

    console.log('[proxy] →', {
      model: modifiedBody.model,
      messages: modifiedBody.messages?.length,
      stream: !!modifiedBody.stream,
      cacheSize: signatureCache.size,
    });

    const upstream = await fetch(`${VERTEX_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(modifiedBody),
    }) as any;

    // ── Streaming response ──────────────────────────────────────────────────
    if (req.body.stream) {
      res.status(upstream.status);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (!upstream.ok) {
        // Surface the error as a valid SSE error event so Copilot shows it.
        const errText = await upstream.text();
        console.error('[proxy] upstream stream error:', errText);
        res.write(
          `data: ${JSON.stringify({
            error: { message: errText, type: 'vertex_error', code: upstream.status },
          })}\n\ndata: [DONE]\n\n`
        );
        res.end();
        return;
      }

      // Parse and forward — signatures are cached inside the generator.
      for await (const chunk of streamWithSignatureCapture(upstream.body)) {
        res.write(chunk);
      }
      res.end();
      return;
    }

    // ── Non-streaming response ──────────────────────────────────────────────
    const data = await upstream.text();

    if (!upstream.ok) {
      try {
        const errorBody = JSON.parse(data);
        const errorMsg =
          errorBody?.error?.message ||
          JSON.stringify(errorBody?.error) ||
          'Upstream request failed';
        console.error('[proxy] upstream error:', errorMsg);
        res.status(upstream.status).json({
          error: { message: errorMsg, type: 'vertex_error', code: upstream.status },
        });
      } catch {
        console.error('[proxy] upstream error (raw):', data);
        res.status(upstream.status).json({
          error: { message: data || 'Upstream request failed', type: 'vertex_error' },
        });
      }
      return;
    }

    try {
      cacheSignaturesFromResponse(JSON.parse(data));
    } catch {
      // Not JSON — just forward as-is.
    }

    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(data);
  } catch (err: any) {
    console.error('[proxy] error:', err);
    res.status(500).json({
      error: { message: err.message || 'Proxy failed', type: 'proxy_error' },
    });
  }
});

// VS Code's model picker probes this to confirm the endpoint is live.
app.get('/v1/models', async (_req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'google/gemini-3.5-flash',       object: 'model', owned_by: 'google' },
      { id: 'google/gemini-3.1-pro-preview', object: 'model', owned_by: 'google' },
      { id: 'gemini-2.0-flash-001',           object: 'model', owned_by: 'google' },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Vertex AI proxy listening on http://localhost:${PORT}/v1`);
  console.log(`Forwarding to ${VERTEX_BASE}`);
});