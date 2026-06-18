/**
 * Request payload for model suggestion
 */
export interface SuggestRequest {
  query: string;
}

/**
 * A single model suggestion with match explanation
 */
export interface ModelSuggestion {
  modelId: string;
  modelName: string;
  publisherName: string;
  description: string;
  tags: string[];
  matchScore: number;
  whyMatched: string;
}

/**
 * Response from /suggest endpoint
 */
export interface SuggestResponse {
  suggestions: ModelSuggestion[];
  query: string;
}

/**
 * Request to create a session for a model
 */
export interface CreateSessionRequest {
  modelId: string;
}

/**
 * Response from session creation
 */
export interface CreateSessionResponse {
  sessionToken: string;
  gatewayUrl: string;
  expiresAt: number;
}
