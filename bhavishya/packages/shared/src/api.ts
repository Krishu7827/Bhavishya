/**
 * Common API response types
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Error codes used across the system
 */
export enum ErrorCode {
  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  OAUTH_FAILED = 'OAUTH_FAILED',
  PKCE_VERIFICATION_FAILED = 'PKCE_VERIFICATION_FAILED',

  // Model errors
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_LIMIT_EXCEEDED = 'MODEL_LIMIT_EXCEEDED',
  UNAUTHORIZED_MODEL_ACCESS = 'UNAUTHORIZED_MODEL_ACCESS',

  // Session errors
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  INVALID_SESSION_TOKEN = 'INVALID_SESSION_TOKEN',

  // Gateway errors
  UPSTREAM_ERROR = 'UPSTREAM_ERROR',
  TRANSLATION_ERROR = 'TRANSLATION_ERROR',
  INVALID_BASE_URL = 'INVALID_BASE_URL',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * API-specific request/response DTOs
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  timestamp: Date;
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  code: ErrorCode;
  timestamp: string;
  path: string;
}
