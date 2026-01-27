import { SigningStargateClient } from '@cosmjs/stargate';
import { fromHex } from '@cosmjs/encoding';
import { liftedinit } from '@manifest-network/manifestjs';
import { ManifestMCPError, ManifestMCPErrorCode, CosmosTxResult, ManifestMCPConfig } from '../types.js';
import { parseAmount, buildTxResult, parseBigInt, validateAddress, validateArgsLength } from './utils.js';
import { getSubcommandUsage } from '../modules.js';

const { MsgFundCredit, MsgCreateLease, MsgCloseLease, MsgWithdraw } = liftedinit.billing.v1;

/** Maximum meta hash length in bytes (64 bytes for SHA-512) */
const MAX_META_HASH_BYTES = 64;

/**
 * Validate and parse a hex string into Uint8Array
 * Uses @cosmjs/encoding for hex validation and conversion
 */
function parseMetaHash(hexString: string): Uint8Array {
  // Check even length first to avoid fractional byte counts in error messages
  if (hexString.length % 2 !== 0) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Invalid meta-hash: hex string must have even length. Got ${hexString.length} characters.`
    );
  }

  // Check max length (64 bytes = 128 hex chars)
  const byteLength = hexString.length / 2;
  if (byteLength > MAX_META_HASH_BYTES) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Invalid meta-hash: exceeds maximum ${MAX_META_HASH_BYTES} bytes. Got ${byteLength} bytes (${hexString.length} hex chars).`
    );
  }

  try {
    return fromHex(hexString);
  } catch (error) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Invalid meta-hash: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Route billing transaction to appropriate handler
 */
export async function routeBillingTransaction(
  client: SigningStargateClient,
  senderAddress: string,
  subcommand: string,
  args: string[],
  _config: ManifestMCPConfig,
  waitForConfirmation: boolean
): Promise<CosmosTxResult> {
  validateArgsLength(args, 'billing transaction');

  switch (subcommand) {
    case 'fund-credit': {
      if (args.length < 2) {
        const usage = getSubcommandUsage('tx', 'billing', 'fund-credit');
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          `fund-credit requires tenant-address and amount arguments. Received ${args.length} argument(s): [${args.map(a => `"${a}"`).join(', ')}]. Usage: fund-credit ${usage || '<tenant-address> <amount>'}`,
          { receivedArgs: args, expectedArgs: ['tenant-address', 'amount'], usage }
        );
      }

      const [tenant, amountStr] = args;
      validateAddress(tenant, 'tenant address');
      const { amount, denom } = parseAmount(amountStr);

      const msg = {
        typeUrl: '/liftedinit.billing.v1.MsgFundCredit',
        value: MsgFundCredit.fromPartial({
          sender: senderAddress,
          tenant,
          amount: { denom, amount },
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('billing', 'fund-credit', result, waitForConfirmation);
    }

    case 'create-lease': {
      // Parse optional --meta-hash flag (can appear anywhere in args)
      let metaHash: Uint8Array | undefined;
      const metaHashIndex = args.indexOf('--meta-hash');

      if (metaHashIndex !== -1) {
        const hexHash = args[metaHashIndex + 1];
        if (!hexHash || hexHash.startsWith('--')) {
          const usage = getSubcommandUsage('tx', 'billing', 'create-lease');
          throw new ManifestMCPError(
            ManifestMCPErrorCode.TX_FAILED,
            `--meta-hash flag requires a hex value. Usage: create-lease ${usage ?? '<args>'}`
          );
        }
        // Validate and convert hex string to Uint8Array (max 64 bytes)
        metaHash = parseMetaHash(hexHash);
      }

      // Filter out --meta-hash and its value to get item args
      const itemArgs = args.filter((_, index) => {
        if (metaHashIndex === -1) return true;
        return index !== metaHashIndex && index !== metaHashIndex + 1;
      });

      if (itemArgs.length < 1) {
        const usage = getSubcommandUsage('tx', 'billing', 'create-lease');
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          `create-lease requires at least one sku-uuid:quantity pair. Usage: create-lease ${usage ?? '<args>'}`,
          { usage }
        );
      }

      // Parse items (format: sku-uuid:quantity ...)
      const items = itemArgs.map((arg) => {
        const [skuUuid, quantityStr] = arg.split(':');
        if (!skuUuid || !quantityStr) {
          throw new ManifestMCPError(
            ManifestMCPErrorCode.TX_FAILED,
            `Invalid lease item format: ${arg}. Expected format: sku-uuid:quantity`
          );
        }
        return { skuUuid, quantity: parseBigInt(quantityStr, 'quantity') };
      });

      const msg = {
        typeUrl: '/liftedinit.billing.v1.MsgCreateLease',
        value: MsgCreateLease.fromPartial({
          tenant: senderAddress,
          items,
          metaHash: metaHash ?? new Uint8Array(),
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('billing', 'create-lease', result, waitForConfirmation);
    }

    case 'close-lease': {
      if (args.length < 1) {
        const usage = getSubcommandUsage('tx', 'billing', 'close-lease');
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          `close-lease requires at least one lease-uuid argument. Usage: close-lease ${usage || '<lease-uuid>...'}`,
          { usage }
        );
      }

      // MsgCloseLease can close multiple leases at once
      const leaseUuids = args;
      const reason = ''; // Optional reason, could be added as a flag later

      const msg = {
        typeUrl: '/liftedinit.billing.v1.MsgCloseLease',
        value: MsgCloseLease.fromPartial({
          sender: senderAddress,
          leaseUuids,
          reason,
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('billing', 'close-lease', result, waitForConfirmation);
    }

    case 'withdraw': {
      if (args.length < 1) {
        const usage = getSubcommandUsage('tx', 'billing', 'withdraw');
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          `withdraw requires at least one lease-uuid argument or provider-uuid with --provider flag. Usage: withdraw ${usage ?? '<args>'}`,
          { usage }
        );
      }

      // Check if using provider-wide withdrawal
      const providerFlagIndex = args.indexOf('--provider');
      const limitFlagIndex = args.indexOf('--limit');
      let leaseUuids: string[] = [];
      let providerUuid = '';
      let limit = BigInt(0); // 0 means use default (50)

      if (providerFlagIndex !== -1) {
        // Provider-wide withdrawal mode
        providerUuid = args[providerFlagIndex + 1] || '';
        if (!providerUuid || providerUuid.startsWith('--')) {
          throw new ManifestMCPError(
            ManifestMCPErrorCode.TX_FAILED,
            'withdraw with --provider flag requires provider-uuid argument'
          );
        }

        // Track consumed arg indices to detect extra arguments
        const consumedIndices = new Set<number>([providerFlagIndex, providerFlagIndex + 1]);

        // Parse optional --limit flag (only valid with --provider)
        if (limitFlagIndex !== -1) {
          const limitStr = args[limitFlagIndex + 1] || '';
          if (!limitStr || limitStr.startsWith('--')) {
            throw new ManifestMCPError(
              ManifestMCPErrorCode.TX_FAILED,
              'withdraw with --limit flag requires a number argument (1-100)'
            );
          }
          limit = parseBigInt(limitStr, 'limit');
          if (limit < BigInt(1) || limit > BigInt(100)) {
            throw new ManifestMCPError(
              ManifestMCPErrorCode.TX_FAILED,
              `Invalid limit: ${limit}. Must be between 1 and 100.`
            );
          }
          consumedIndices.add(limitFlagIndex);
          consumedIndices.add(limitFlagIndex + 1);
        }

        // Check for any extra arguments that weren't consumed
        const extraArgs = args.filter((_, index) => !consumedIndices.has(index));
        if (extraArgs.length > 0) {
          const usage = getSubcommandUsage('tx', 'billing', 'withdraw');
          throw new ManifestMCPError(
            ManifestMCPErrorCode.TX_FAILED,
            `Provider-wide withdrawal does not accept additional arguments. ` +
            `Got unexpected: ${extraArgs.map(a => `"${a}"`).join(', ')}. ` +
            `For lease-specific withdrawal, omit --provider flag. Usage: withdraw ${usage ?? '<args>'}`
          );
        }
      } else {
        // Lease-specific withdrawal mode
        // Check for unexpected flags
        const unexpectedFlags = args.filter(arg => arg.startsWith('--'));
        if (unexpectedFlags.length > 0) {
          const usage = getSubcommandUsage('tx', 'billing', 'withdraw');
          throw new ManifestMCPError(
            ManifestMCPErrorCode.TX_FAILED,
            `Unexpected flag(s) in lease-specific withdrawal mode: ${unexpectedFlags.join(', ')}. ` +
            `Use --provider for provider-wide withdrawal. Usage: withdraw ${usage ?? '<args>'}`
          );
        }

        leaseUuids = args;
      }

      const msg = {
        typeUrl: '/liftedinit.billing.v1.MsgWithdraw',
        value: MsgWithdraw.fromPartial({
          sender: senderAddress,
          leaseUuids,
          providerUuid,
          limit,
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('billing', 'withdraw', result, waitForConfirmation);
    }

    default:
      throw new ManifestMCPError(
        ManifestMCPErrorCode.UNSUPPORTED_TX,
        `Unsupported billing transaction subcommand: ${subcommand}`,
        { availableSubcommands: ['fund-credit', 'create-lease', 'close-lease', 'withdraw'] }
      );
  }
}
