/**
 * Shared API error type and helper for consistent route responses.
 * Used by OpenClaw adapter and API routes.
 */

export type ApiError = {
  error: { code: string; message: string };
};

export function apiError(code: string, message: string): ApiError {
  return { error: { code, message } };
}

/** Common error codes for OpenClaw routes */
export const OPENCLAW_ERROR_CODES = {
  NOT_FOUND: "OPENCLAW_NOT_FOUND",
  TIMEOUT: "OPENCLAW_TIMEOUT",
  PARSE_ERROR: "OPENCLAW_PARSE_ERROR",
  CLI_ERROR: "OPENCLAW_CLI_ERROR",
  GATEWAY_UNREACHABLE: "OPENCLAW_GATEWAY_UNREACHABLE",
} as const;
