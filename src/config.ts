import { ManifestMCPConfig, ManifestMCPError, ManifestMCPErrorCode } from './types.js';

/**
 * Default gas adjustment multiplier
 */
const DEFAULT_GAS_ADJUSTMENT = 1.3;

/**
 * Default address prefix for Manifest Network
 */
const DEFAULT_ADDRESS_PREFIX = 'manifest';

/**
 * Default requests per second for rate limiting
 */
const DEFAULT_REQUESTS_PER_SECOND = 10;

/**
 * Validate a URL string
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if URL uses HTTPS or is localhost (HTTP allowed for local dev)
 */
function isSecureOrLocalUrl(url: string): { secure: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    const isLocalhost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]';

    if (parsed.protocol === 'https:') {
      return { secure: true };
    }

    if (parsed.protocol === 'http:' && isLocalhost) {
      return { secure: true }; // HTTP allowed for localhost
    }

    return {
      secure: false,
      reason: `RPC URL must use HTTPS (got ${parsed.protocol}//). HTTP is only allowed for localhost.`,
    };
  } catch {
    return { secure: false, reason: 'Invalid URL format' };
  }
}

/**
 * Validate gas price format (e.g., "1.0umfx")
 */
function isValidGasPrice(gasPrice: string): boolean {
  // Gas price should be a number followed by a denomination
  return /^\d+(\.\d+)?[a-zA-Z]+$/.test(gasPrice);
}

/**
 * Validate chain ID format
 */
function isValidChainId(chainId: string): boolean {
  // Chain ID should be alphanumeric with hyphens
  return /^[a-zA-Z0-9][\w-]*$/.test(chainId);
}

/**
 * Create a configuration object with defaults applied
 */
export function createConfig(input: ManifestMCPConfig): ManifestMCPConfig {
  return {
    chainId: input.chainId,
    rpcUrl: input.rpcUrl,
    gasPrice: input.gasPrice,
    gasAdjustment: input.gasAdjustment ?? DEFAULT_GAS_ADJUSTMENT,
    addressPrefix: input.addressPrefix ?? DEFAULT_ADDRESS_PREFIX,
    rateLimit: {
      requestsPerSecond: input.rateLimit?.requestsPerSecond ?? DEFAULT_REQUESTS_PER_SECOND,
    },
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a configuration object
 */
export function validateConfig(config: Partial<ManifestMCPConfig>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!config.chainId) {
    errors.push('chainId is required');
  } else if (!isValidChainId(config.chainId)) {
    errors.push('chainId must be alphanumeric with hyphens (e.g., "manifest-ledger-testnet")');
  }

  if (!config.rpcUrl) {
    errors.push('rpcUrl is required');
  } else if (!isValidUrl(config.rpcUrl)) {
    errors.push('rpcUrl must be a valid URL');
  } else {
    const securityCheck = isSecureOrLocalUrl(config.rpcUrl);
    if (!securityCheck.secure) {
      errors.push(securityCheck.reason!);
    }
  }

  if (!config.gasPrice) {
    errors.push('gasPrice is required');
  } else if (!isValidGasPrice(config.gasPrice)) {
    errors.push('gasPrice must be a number followed by denomination (e.g., "1.0umfx")');
  }

  // Optional fields
  if (config.gasAdjustment !== undefined) {
    if (typeof config.gasAdjustment !== 'number' || config.gasAdjustment <= 0) {
      errors.push('gasAdjustment must be a positive number');
    }
  }

  if (config.addressPrefix !== undefined) {
    if (!/^[a-z]+$/.test(config.addressPrefix)) {
      errors.push('addressPrefix must be lowercase letters only');
    }
  }

  if (config.rateLimit !== undefined) {
    if (config.rateLimit.requestsPerSecond !== undefined) {
      if (
        typeof config.rateLimit.requestsPerSecond !== 'number' ||
        config.rateLimit.requestsPerSecond <= 0 ||
        !Number.isInteger(config.rateLimit.requestsPerSecond)
      ) {
        errors.push('rateLimit.requestsPerSecond must be a positive integer');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create and validate a configuration, throwing on invalid config
 */
export function createValidatedConfig(input: ManifestMCPConfig): ManifestMCPConfig {
  const validation = validateConfig(input);

  if (!validation.valid) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.INVALID_CONFIG,
      `Invalid configuration: ${validation.errors.join(', ')}`,
      { errors: validation.errors }
    );
  }

  return createConfig(input);
}

