import { SigningStargateClient } from '@cosmjs/stargate';
import { cosmos } from '@manifest-network/manifestjs';
import { ManifestMCPError, ManifestMCPErrorCode, CosmosTxResult, ManifestMCPConfig } from '../types.js';
import { throwUnsupportedSubcommand } from '../modules.js';
import { parseAmount, buildTxResult, validateAddress, validateArgsLength } from './utils.js';

const { MsgWithdrawDelegatorReward, MsgSetWithdrawAddress, MsgFundCommunityPool } = cosmos.distribution.v1beta1;

/**
 * Route distribution transaction to appropriate handler
 */
export async function routeDistributionTransaction(
  client: SigningStargateClient,
  senderAddress: string,
  subcommand: string,
  args: string[],
  _config: ManifestMCPConfig,
  waitForConfirmation: boolean
): Promise<CosmosTxResult> {
  validateArgsLength(args, 'distribution transaction');

  switch (subcommand) {
    case 'withdraw-rewards': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          'withdraw-rewards requires validator-address argument'
        );
      }

      const [validatorAddress] = args;
      validateAddress(validatorAddress, 'validator address');

      const msg = {
        typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        value: MsgWithdrawDelegatorReward.fromPartial({
          delegatorAddress: senderAddress,
          validatorAddress,
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('distribution', 'withdraw-rewards', result, waitForConfirmation);
    }

    case 'set-withdraw-addr': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          'set-withdraw-addr requires withdraw-address argument'
        );
      }

      const [withdrawAddress] = args;
      validateAddress(withdrawAddress, 'withdraw address');

      const msg = {
        typeUrl: '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress',
        value: MsgSetWithdrawAddress.fromPartial({
          delegatorAddress: senderAddress,
          withdrawAddress,
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('distribution', 'set-withdraw-addr', result, waitForConfirmation);
    }

    case 'fund-community-pool': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          'fund-community-pool requires amount argument'
        );
      }

      const [amountStr] = args;
      const { amount, denom } = parseAmount(amountStr);

      const msg = {
        typeUrl: '/cosmos.distribution.v1beta1.MsgFundCommunityPool',
        value: MsgFundCommunityPool.fromPartial({
          depositor: senderAddress,
          amount: [{ denom, amount }],
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('distribution', 'fund-community-pool', result, waitForConfirmation);
    }

    default:
      throwUnsupportedSubcommand('tx', 'distribution', subcommand);
  }
}
