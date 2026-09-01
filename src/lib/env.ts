// Environment variable utility that works in both SvelteKit and Node.js script contexts
// Uses process.env which is populated by:
// - Bun: automatically loads .env files
// - SvelteKit/Vite: configured in vite.config.ts to load from .env

// Get environment variable from process.env
function getEnvVar(key: string): string {
  return process.env[key] || "";
}

// Export as constants
export const CURSOR_BEARER_TOKEN = getEnvVar("CURSOR_BEARER_TOKEN");
export const X_CURSOR_CLIENT_VERSION = getEnvVar("X_CURSOR_CLIENT_VERSION");
export const X_REQUEST_ID = getEnvVar("X_REQUEST_ID");
export const X_SESSION_ID = getEnvVar("X_SESSION_ID");
export const DYNAMIC_CSRF_TOKEN = getEnvVar("DYNAMIC_CSRF_TOKEN");
export const DYNAMIC_PORT = getEnvVar("DYNAMIC_PORT");
