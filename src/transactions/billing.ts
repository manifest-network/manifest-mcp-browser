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
  // Check max length before parsing (64 bytes = 128 hex chars)
  if (hexString.length > MAX_META_HASH_BYTES * 2) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Invalid meta-hash: exceeds maximum ${MAX_META_HASH_BYTES} bytes. Got ${hexString.length / 2} bytes (${hexString.length} hex chars).`
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
      // Parse optional --meta-hash flag
      let metaHash: Uint8Array | undefined;
      let itemArgs = args;

      if (args.length >= 2 && args[0] === '--meta-hash') {
        const hexHash = args[1];
        // Validate and convert hex string to Uint8Array (max 64 bytes)
        metaHash = parseMetaHash(hexHash);
        itemArgs = args.slice(2);
      }

      if (itemArgs.length < 1) {
        const usage = getSubcommandUsage('tx', 'billing', 'create-lease');
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          `create-lease requires at least one sku-uuid:quantity pair. Usage: create-lease [--meta-hash <hex>] ${usage || '<sku-uuid:quantity>...'}`,
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
          `withdraw requires at least one lease-uuid argument or provider-uuid with --provider flag. Usage: withdraw ${usage || '<lease-uuid>... OR --provider <provider-uuid> [--limit <n>]'}`,
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
        if (!providerUuid) {
          throw new ManifestMCPError(
            ManifestMCPErrorCode.TX_FAILED,
            'withdraw with --provider flag requires provider-uuid argument'
          );
        }

        // Parse optional --limit flag (only valid with --provider)
        if (limitFlagIndex !== -1) {
          const limitStr = args[limitFlagIndex + 1] || '';
          if (!limitStr) {
            throw new ManifestMCPError(
              ManifestMCPErrorCode.TX_FAILED,
              'withdraw with --limit flag requires a number argument'
            );
          }
          limit = parseBigInt(limitStr, 'limit');
          if (limit < BigInt(1) || limit > BigInt(100)) {
            throw new ManifestMCPError(
              ManifestMCPErrorCode.TX_FAILED,
              `Invalid limit: ${limit}. Must be between 1 and 100.`
            );
          }
        }
      } else {
        // Lease-specific withdrawal mode
        // Filter out any flags that might have been passed by mistake
        leaseUuids = args.filter(arg => !arg.startsWith('--'));

        if (limitFlagIndex !== -1) {
          throw new ManifestMCPError(
            ManifestMCPErrorCode.TX_FAILED,
            '--limit flag is only valid with --provider mode'
          );
        }
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
