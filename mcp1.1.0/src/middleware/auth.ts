import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health check and root
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  // Require /v1/* paths
  if (!req.path.startsWith('/v1/')) {
    return next();
  }

  // If API key is configured, validate it
  if (config.api.apiKey) {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.replace('Bearer ', '') || 
                   req.headers['api-key'] as string;

    if (apiKey !== config.api.apiKey) {
      return res.status(401).json({
        error: {
          message: 'Invalid API key',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      });
    }
  }

  next();
}
