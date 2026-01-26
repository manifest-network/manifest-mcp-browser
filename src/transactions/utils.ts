import { SigningStargateClient } from '@cosmjs/stargate';
import { ManifestMCPError, ManifestMCPErrorCode, CosmosTxResult } from '../types.js';

/**
 * Safely parse a string to BigInt with proper error handling
 */
export function parseBigInt(value: string, fieldName: string): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Invalid ${fieldName}: "${value}". Expected a valid integer.`
    );
  }
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
