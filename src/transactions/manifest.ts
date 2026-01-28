import { SigningStargateClient } from '@cosmjs/stargate';
import { liftedinit } from '@manifest-network/manifestjs';
import { ManifestMCPError, ManifestMCPErrorCode, CosmosTxResult } from '../types.js';
import { throwUnsupportedSubcommand } from '../modules.js';
import { parseAmount, buildTxResult, validateAddress, validateArgsLength, parseColonPair } from './utils.js';

const { MsgPayout, MsgBurnHeldBalance } = liftedinit.manifest.v1;

/**
 * Route manifest transaction to appropriate handler
 */
export async function routeManifestTransaction(
  client: SigningStargateClient,
  senderAddress: string,
  subcommand: string,
  args: string[],
  waitForConfirmation: boolean
): Promise<CosmosTxResult> {
  validateArgsLength(args, 'manifest transaction');

  switch (subcommand) {
    case 'payout': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          'payout requires at least one address:amount pair'
        );
      }

      // Parse payout pairs (format: address:amount ...)
      const payoutPairs = args.map((arg) => {
        const [address, amountStr] = parseColonPair(arg, 'address', 'amount', 'payout pair');
        validateAddress(address, 'payout recipient address');
        const { amount, denom } = parseAmount(amountStr);
        return { address, coin: { denom, amount } };
      });

      const msg = {
        typeUrl: '/liftedinit.manifest.v1.MsgPayout',
        value: MsgPayout.fromPartial({
          authority: senderAddress,
          payoutPairs,
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('manifest', 'payout', result, waitForConfirmation);
    }

    case 'burn-held-balance': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          'burn-held-balance requires at least one amount argument'
        );
      }

      // Parse coins to burn
      const burnCoins = args.map((amountStr) => {
        const { amount, denom } = parseAmount(amountStr);
        return { denom, amount };
      });

      const msg = {
        typeUrl: '/liftedinit.manifest.v1.MsgBurnHeldBalance',
        value: MsgBurnHeldBalance.fromPartial({
          authority: senderAddress,
          burnCoins,
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('manifest', 'burn-held-balance', result, waitForConfirmation);
    }

    default:
      throwUnsupportedSubcommand('tx', 'manifest', subcommand);
  }
}
