// Configuration constants

export const API_BASE_URL = process.env.FUTURE_API_URL || 'http://localhost:3002';
export const GATEWAY_URL = process.env.FUTURE_GATEWAY_URL || 'http://localhost:3002';

// OAuth settings
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const OAUTH_REDIRECT_PORT = 33456;
export const OAUTH_REDIRECT_HOST = '127.0.0.1';
