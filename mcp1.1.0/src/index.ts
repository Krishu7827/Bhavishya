import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config, modelRegistry } from './config/index.js';
import { chatCompletionsHandler } from './handlers/chat-completions.js';
import { completionsHandler } from './handlers/completions.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { asyncHandler } from './utils/async-handler.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Routes

// GET /v1/models - List available models
app.get('/v1/models', (_req: Request, res: Response) => {
  res.json({
    object: 'list',
    data: modelRegistry.listModels(),
  });
});

// POST /v1/chat/completions - Chat completions (GitHub Copilot Chat)
app.post('/v1/chat/completions', asyncHandler(chatCompletionsHandler));

// POST /v1/completions - Legacy completions (Inline suggestions)
app.post('/v1/completions', asyncHandler(completionsHandler));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'copilot-custom-endpoint',
    version: '1.1.0',
    description: 'GitHub Copilot compatible endpoint proxying to NVIDIA API',
    endpoints: [
      'GET /v1/models',
      'POST /v1/chat/completions',
      'POST /v1/completions',
    ],
  });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.server.port, config.server.host, () => {
  console.log(`🚀 Server running at http://${config.server.host}:${config.server.port}`);
  console.log(`📡 NVIDIA API: ${config.nvidia.baseUrl}`);
  console.log(`🤖 Default model: ${config.model.defaultModel}`);
});
