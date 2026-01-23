import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';

/**
 * Safely parse a string to BigInt with proper error handling
 */
export function parseBigInt(value: string, fieldName: string): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.QUERY_FAILED,
      `Invalid ${fieldName}: "${value}". Expected a valid integer.`
    );
  }
}

/**
 * Safely parse a string to integer with proper error handling
 */
export function parseInt(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.QUERY_FAILED,
      `Invalid ${fieldName}: "${value}". Expected a valid integer.`
    );
  }
  return parsed;
}
