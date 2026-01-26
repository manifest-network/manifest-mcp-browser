import { SigningStargateClient } from '@cosmjs/stargate';
import { fromBech32 } from '@cosmjs/encoding';
import { ManifestMCPError, ManifestMCPErrorCode, CosmosTxResult } from '../types.js';

/** Maximum number of arguments allowed */
export const MAX_ARGS = 100;

/** Maximum memo length (Cosmos SDK default) */
export const MAX_MEMO_LENGTH = 256;

/**
 * Validate args array length
 */
export function validateArgsLength(args: string[], context: string): void {
  if (args.length > MAX_ARGS) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Too many arguments for ${context}: ${args.length}. Maximum allowed: ${MAX_ARGS}`
    );
  }
}

/**
 * Validate a bech32 address using @cosmjs/encoding
 */
export function validateAddress(address: string, fieldName: string, expectedPrefix?: string): void {
  if (!address || address.trim() === '') {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.INVALID_ADDRESS,
      `${fieldName} is required`
    );
  }

  try {
    const { prefix } = fromBech32(address);
    if (expectedPrefix && prefix !== expectedPrefix) {
      throw new ManifestMCPError(
        ManifestMCPErrorCode.INVALID_ADDRESS,
        `Invalid ${fieldName}: "${address}". Expected prefix "${expectedPrefix}", got "${prefix}"`
      );
    }
  } catch (error) {
    if (error instanceof ManifestMCPError) {
      throw error;
    }
    throw new ManifestMCPError(
      ManifestMCPErrorCode.INVALID_ADDRESS,
      `Invalid ${fieldName}: "${address}". Not a valid bech32 address.`
    );
  }
}

/**
 * Validate memo length
 */
export function validateMemo(memo: string): void {
  if (memo.length > MAX_MEMO_LENGTH) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Memo too long: ${memo.length} characters. Maximum allowed: ${MAX_MEMO_LENGTH}`
    );
  }
}

/**
 * Safely parse a string to BigInt with proper error handling and configurable error code.
 * This is the base implementation used by both transaction and query utilities.
 */
export function parseBigIntWithCode(
  value: string,
  fieldName: string,
  errorCode: ManifestMCPErrorCode
): bigint {
  // Check for empty string explicitly (BigInt('') returns 0n, not an error)
  if (!value || value.trim() === '') {
    throw new ManifestMCPError(
      errorCode,
      `Invalid ${fieldName}: empty value. Expected a valid integer.`
    );
  }

  try {
    return BigInt(value);
  } catch {
    throw new ManifestMCPError(
      errorCode,
      `Invalid ${fieldName}: "${value}". Expected a valid integer.`
    );
  }
}

/**
 * Safely parse a string to BigInt with proper error handling (for transactions)
 */
export function parseBigInt(value: string, fieldName: string): bigint {
  return parseBigIntWithCode(value, fieldName, ManifestMCPErrorCode.TX_FAILED);
}

/**
 * Parse amount string into coin (e.g., "1000umfx" -> { amount: "1000", denom: "umfx" })
 * Supports simple denoms (umfx), IBC denoms (ibc/...), and factory denoms (factory/creator/subdenom)
 */
export function parseAmount(amountStr: string): { amount: string; denom: string } {
  // Regex supports alphanumeric denoms with slashes and underscores for IBC/factory denoms
  const match = amountStr.match(/^(\d+)([a-zA-Z][a-zA-Z0-9/_]*)$/);
  if (!match) {
    // Provide specific hints based on common mistakes
    let hint = '';
    if (!amountStr || amountStr.trim() === '') {
      hint = ' Received empty string.';
    } else if (amountStr.includes(' ')) {
      hint = ' Remove the space between number and denom.';
    } else if (amountStr.includes(',')) {
      hint = ' Do not use commas in the number.';
    } else if (/^\d+$/.test(amountStr)) {
      hint = ' Missing denomination (e.g., add "umfx" after the number).';
    } else if (/^[a-zA-Z]/.test(amountStr)) {
      hint = ' Amount must start with a number, not the denomination.';
    }

    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Invalid amount format: "${amountStr}".${hint} Expected format: <number><denom> (e.g., "1000000umfx" or "1000000factory/address/subdenom")`,
      { receivedValue: amountStr, expectedFormat: '<number><denom>', example: '1000000umfx' }
    );
  }
  return { amount: match[1], denom: match[2] };
}

/**
 * Build transaction result from DeliverTxResponse
 */
export function buildTxResult(
  module: string,
  subcommand: string,
  result: Awaited<ReturnType<SigningStargateClient['signAndBroadcast']>>,
  waitForConfirmation: boolean
): CosmosTxResult {
  const txResult: CosmosTxResult = {
    module,
    subcommand,
    transactionHash: result.transactionHash,
    code: result.code,
    height: String(result.height),
    rawLog: result.rawLog || undefined,
    gasUsed: String(result.gasUsed),
    gasWanted: String(result.gasWanted),
  };

  if (waitForConfirmation) {
    txResult.confirmed = result.code === 0;
    txResult.confirmationHeight = String(result.height);
  }

  return txResult;
}
