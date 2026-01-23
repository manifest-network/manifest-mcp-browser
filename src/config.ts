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

/**
 * Parse gas price string into amount and denom
 */
export function parseGasPrice(gasPrice: string): { amount: string; denom: string } {
  const match = gasPrice.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
  if (!match) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.INVALID_CONFIG,
      `Invalid gas price format: ${gasPrice}`
    );
  }
  return {
    amount: match[1],
    denom: match[2],
  };
}
