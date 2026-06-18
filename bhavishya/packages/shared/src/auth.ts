/**
 * Auth tokens issued by the backend
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * OAuth callback parameters
 */
export interface OAuthCallbackParams {
  code: string;
  state?: string;
}

/**
 * Token exchange payload
 */
export interface TokenExchangePayload {
  code: string;
  codeVerifier: string;
}

/**
 * Refresh token payload
 */
export interface RefreshTokenPayload {
  refreshToken: string;
}

/**
 * Publisher JWT payload (decoded)
 */
export interface PublisherJWTPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * Session JWT payload (for model gateway access)
 */
export interface SessionJWTPayload {
  sub: string;
  modelId: string;
  type: 'session';
  iat: number;
  exp: number;
}

/**
 * Stored credentials on CLI
 */
export interface StoredCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  publisherId: string;
  email: string;
  name: string;
}
