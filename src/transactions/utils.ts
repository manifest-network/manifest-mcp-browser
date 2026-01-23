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
 */
export function parseAmount(amountStr: string): { amount: string; denom: string } {
  const match = amountStr.match(/^(\d+)([a-zA-Z][a-zA-Z0-9]*)$/);
  if (!match) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Invalid amount format: ${amountStr}. Expected format: <number><denom> (e.g., "1000umfx")`
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
