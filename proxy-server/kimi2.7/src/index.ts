import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios from 'axios';
import * as dotenv from 'dotenv';

/**
 * Cloudflare AI Proxy Server
 * 
 * This server acts as an OpenAI-compatible proxy for Cloudflare's Workers AI REST API.
 * It translates standard OpenAI chat completion requests into Cloudflare's format,
 * handles Server-Sent Events (SSE) streaming, and manages authentication.
 */

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Cloudflare configuration
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
// Default model to use if the client doesn't specify one
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || '@cf/moonshotai/kimi-k2.7-code';

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error('❌ Missing CF_ACCOUNT_ID or CF_API_TOKEN in environment variables');
  process.exit(1);
}

// Cloudflare AI endpoint
const CF_API_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/v1/chat/completions`;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'kimi2.7-proxy' });
});

// OpenAI-compatible endpoint
app.post('/v1/chat/completions', async (req: Request, res: Response) => {
  try {
    const { model, messages, stream, tools, tool_choice, ...rest } = req.body;

    // Always use Kimi-k2.7-code model
    const normalizedModel = '@cf/moonshotai/kimi-k2.7-code';

    console.log(`[${new Date().toISOString()}] Request: requested=${model}, using=${normalizedModel}, stream=${stream}`);

    // Build request body for Cloudflare
    const cfRequestBody: any = {
      model: normalizedModel,
      messages,
      ...rest,
    };

    // Forward tools and tool_choice if provided
    if (tools) {
      cfRequestBody.tools = tools;
    }
    if (tool_choice) {
      cfRequestBody.tool_choice = tool_choice;
    }

    // Set stream option
    if (stream) {
      cfRequestBody.stream = true;
    }

    // Prepare headers
    const headers: any = {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    };

    if (stream) {
      headers['Accept'] = 'text/event-stream';
    }

    // Make request to Cloudflare
    const response = await axios({
      method: 'POST',
      url: CF_API_URL,
      data: cfRequestBody,
      headers,
      responseType: stream ? 'stream' : 'json',
      timeout: 120000, // 2 minutes timeout
    });

    if (stream) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Pipe the stream directly
      response.data.pipe(res);

      // Handle stream errors
      response.data.on('error', (error: Error) => {
        console.error('Stream error:', error);
        res.end();
      });

      // Handle client disconnect
      req.on('close', () => {
        response.data.destroy();
      });
    } else {
      // Handle non-streaming response
      res.json(response.data);
    }
  } catch (error: any) {
    console.error('Proxy error:', error.message);

    if (error.response) {
      // Error from Cloudflare API
      res.status(error.response.status || 500).json({
        error: {
          message: error.response.data?.error?.message || error.message,
          type: 'cloudflare_api_error',
          code: error.response.status,
        },
      });
    } else if (error.request) {
      // Network error
      res.status(502).json({
        error: {
          message: 'Failed to reach Cloudflare API',
          type: 'network_error',
          code: 502,
        },
      });
    } else {
      // Internal error
      res.status(500).json({
        error: {
          message: 'Internal proxy error',
          type: 'internal_error',
          code: 500,
        },
      });
    }
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      type: 'internal_error',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Kimi2.7 Proxy Server running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🤖 OpenAI-compatible endpoint: http://localhost:${PORT}/v1/chat/completions`);
  console.log(`☁️  Cloudflare Account: ${CF_ACCOUNT_ID}`);
  console.log(`📊 Model mapping: @cf/ prefix auto-added if missing`);
});

export default app;
