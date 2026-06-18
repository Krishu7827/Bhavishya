// Common constants used across modules

export const MAX_MODELS_PER_PUBLISHER = 10;
export const SESSION_DURATION_SECONDS = 3600; // 1 hour
export const DEFAULT_SUGGESTION_LIMIT = 5;

// Security: Blocked IP ranges for publisher baseUrl validation
export const BLOCKED_IP_RANGES = [
  '127.0.0.0/8',      // Localhost
  '10.0.0.0/8',       // Private
  '172.16.0.0/12',    // Private
  '192.168.0.0/16',   // Private
  '169.254.0.0/16',   // Link-local
  '0.0.0.0/8',        // Current network
  '::1/128',          // IPv6 localhost
  'fe80::/10',        // IPv6 link-local
  'fc00::/7',         // IPv6 private
];
