import { Request, Response, NextFunction } from 'express';

interface OpenAIError extends Error {
  type: string;
  code?: string;
  status?: number;
}

export function errorHandler(err: OpenAIError, _req: Request, _res: Response, next: NextFunction) {
  const res = _res as Response;
  const status = err.status || 500;
  
  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      type: err.type || 'internal_error',
      code: err.code || 'internal_error',
    },
  });
}

export class MissingFieldError extends Error {
  constructor(field: string) {
    super(`Missing required field: ${field}`);
    this.type = 'invalid_request_error';
    this.code = 'missing_field';
  }

  type: string = 'invalid_request_error';
  code: string = 'missing_field';
  status: number = 400;
}

export class InternalError extends Error {
  constructor(message: string) {
    super(message);
  }
  
  type: string = 'internal_error';
  code: string = 'internal_error';
  status: number = 500;
}
