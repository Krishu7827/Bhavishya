/**
 * Gateway-specific types for session management
 */

export interface GatewaySession {
  id: string;
  modelId: string;
  publisherId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface GatewayConfig {
  gatewayUrl: string;
  sessionDuration: number;
}

export interface ProxiedRequest {
  sessionToken: string;
  body: unknown;
  headers: Record<string, string>;
}

export interface ProxiedResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * Decrypted model credentials for gateway proxying
 */
export interface ModelCredentials {
  modelId: string;
  baseUrl: string;
  apiKey: string;
}
