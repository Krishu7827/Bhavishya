// Vertex AI -> OpenAI-compatible proxy
// Forwards requests to Vertex AI's built-in OpenAI compatibility endpoint,
// attaching a fresh GCP access token on every call, and working around a
// current Gemini 3.x ecosystem-wide gap: Vertex requires a `thought_signature`
// to be echoed back on every tool call in multi-turn conversations, but the
// standard OpenAI tool-calling schema has no place for it, so most clients
// (including Copilot) drop it when they reconstruct history. This proxy
// captures the signature from Vertex's response and quietly reinjects it
// into the next request, so Copilot never needs to know it exists.

import express from 'express';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.GCP_PROJECT_ID;
// Gemini 3.x models (including gemini-3.5-flash) are currently only
// deployed on Vertex's global endpoint, not on per-region endpoints like
// us-central1 -- using a region here will 404 even though the model exists.
const LOCATION = process.env.GCP_LOCATION || 'global';
const PORT = process.env.PORT || 8787;

if (!PROJECT_ID) {
  console.error('Set GCP_PROJECT_ID before starting (export GCP_PROJECT_ID=your-project-id)');
  process.exit(1);
}

const VERTEX_HOST =
  LOCATION === 'global' ? 'aiplatform.googleapis.com' : `${LOCATION}-aiplatform.googleapis.com`;
const VERTEX_BASE = `https://${VERTEX_HOST}/v1/projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/openapi`;

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

const app = express();
app.use(express.json({ limit: '50mb' }));

async function freshToken() {
  const token = await auth.getAccessToken();
  if (!token) throw new Error('Failed to obtain GCP access token');
  return token;
}

// tool_call.id -> thought_signature string
const signatureCache = new Map();

// Checks the handful of places a signature has been observed to show up,
// since the exact field name on the OpenAI-compat surface isn't fully
// nailed down in public docs yet.
function extractSignature(obj) {
  if (!obj) return null;
  return (
    obj.extra_content?.google?.thought_signature ||
    obj.thought_signature ||
    obj.thoughtSignature ||
    obj.provider_specific_fields?.thought_signature ||
    null
  );
}

function cacheSignaturesFromToolCalls(toolCalls, fallbackHolder) {
  if (!Array.isArray(toolCalls)) return;
  for (const tc of toolCalls) {
    const sig = extractSignature(tc) || extractSignature(fallbackHolder);
    if (tc.id && sig) {
      signatureCache.set(tc.id, sig);
      console.log(`[proxy] cached thought_signature for tool_call ${tc.id}`);
    }
  }
}

// Patches cached signatures back into assistant messages that contain tool
// calls but are missing them, before forwarding to Vertex.
function injectSignatures(messages) {
  return messages.map((m) => {
    if (m.role !== 'assistant' || !Array.isArray(m.tool_calls)) return m;
    const tool_calls = m.tool_calls.map((tc) => {
      if (!tc.id || extractSignature(tc)) return tc;
      const sig = signatureCache.get(tc.id);
      if (!sig) return tc;
      console.log(`[proxy] reinjecting thought_signature for tool_call ${tc.id}`);
      return {
        ...tc,
        extra_content: {
          ...(tc.extra_content || {}),
          google: { ...(tc.extra_content?.google || {}), thought_signature: sig },
        },
        thought_signature: sig, // harmless alias in case this is the field actually read
      };
    });
    return { ...m, tool_calls };
  });
}

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const token = await freshToken();
    
    // Reinject cached thought signatures into the request
    const modifiedBody = reinjectThoughtSignatures(JSON.parse(JSON.stringify(req.body)));
    
    const upstream = await fetch(`${VERTEX_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(modifiedBody),
    }) as any;

    if (req.body.stream) {
      res.status(upstream.status);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      for await (const chunk of upstream.body) {
        res.write(chunk);
      }
      res.end();
    } else {
      const data = await upstream.text();
      
      // Check for upstream errors and extract clean message for Copilot
      if (!upstream.ok) {
        try {
          const errorBody = JSON.parse(data);
          const errorMsg = errorBody?.error?.message || errorBody?.error || 'Upstream request failed';
          console.error('Vertex error:', errorMsg);
          // Return a clean error that Copilot can display
          res.status(upstream.status).json({
            error: {
              message: errorMsg,
              type: 'vertex_error',
              code: upstream.status
            }
          });
          return;
        } catch (e) {
          // Not JSON, forward raw error
          console.error('Vertex error (raw):', data);
          res.status(upstream.status).json({
            error: { message: data || 'Upstream request failed', type: 'vertex_error' }
          });
          return;
        }
      }
      
      // Cache any thought signatures from the response
      try {
        const parsed = JSON.parse(data);
        cacheThoughtSignature(parsed);
      } catch (e) {
        // Not JSON or parse error, just forward it
      }
      res.status(upstream.status);
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    }
  } catch (err: any) {
    console.error('Proxy error:', err);
    res.status(500).json({
      error: { message: err.message || 'Proxy failed', type: 'proxy_error' },
    });
  }
});

// Some clients (including VS Code's model picker) probe this to confirm
// the endpoint is alive and to list available models.
app.get('/v1/models', async (_req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'google/gemini-3.5-flash', object: 'model', owned_by: 'google' },
      { id: 'gemini-2.0-flash-001', object: 'model', owned_by: 'google' },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Vertex AI proxy listening on http://localhost:${PORT}/v1`);
  console.log(`Forwarding to ${VERTEX_BASE}`);
});