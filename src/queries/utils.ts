import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';
import { parseBigIntWithCode } from '../transactions/utils.js';

/** Default page size limit for paginated queries to prevent resource exhaustion */
export const DEFAULT_PAGE_LIMIT = BigInt(100);

/**
 * Default pagination configuration for queries
 * Uses Cosmos SDK pagination format
 */
export const defaultPagination = {
  key: new Uint8Array(),
  offset: BigInt(0),
  limit: DEFAULT_PAGE_LIMIT,
  countTotal: false,
  reverse: false,
};

/**
 * Safely parse a string to BigInt with proper error handling (for queries)
 */
export function parseBigInt(value: string, fieldName: string): bigint {
  return parseBigIntWithCode(value, fieldName, ManifestMCPErrorCode.QUERY_FAILED);
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
