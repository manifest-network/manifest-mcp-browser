import { ManifestQueryClient } from '../client.js';
import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';
import { parseBigInt, defaultPagination } from './utils.js';

/**
 * Route distribution query to manifestjs query client
 */
export async function routeDistributionQuery(
  queryClient: ManifestQueryClient,
  subcommand: string,
  args: string[]
): Promise<Record<string, unknown>> {
  const distribution = queryClient.cosmos.distribution.v1beta1;

  switch (subcommand) {
    case 'rewards': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'rewards requires delegator-address argument'
        );
      }
      const [delegatorAddress] = args;
      const validatorAddress = args[1];

      if (validatorAddress) {
        // Get rewards from specific validator
        const result = await distribution.delegationRewards({
          delegatorAddress,
          validatorAddress,
        });
        return { rewards: result.rewards };
      } else {
        // Get rewards from all validators
        const result = await distribution.delegationTotalRewards({ delegatorAddress });
        return {
          rewards: result.rewards,
          total: result.total,
        };
      }
    }

    case 'commission': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'commission requires validator-address argument'
        );
      }
      const [validatorAddress] = args;
      const result = await distribution.validatorCommission({ validatorAddress });
      return { commission: result.commission };
    }

    case 'community-pool': {
      const result = await distribution.communityPool({});
      return { pool: result.pool };
    }

    case 'params': {
      const result = await distribution.params({});
      return { params: result.params };
    }

    case 'validator-outstanding-rewards': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'validator-outstanding-rewards requires validator-address argument'
        );
      }
      const [validatorAddress] = args;
      const result = await distribution.validatorOutstandingRewards({ validatorAddress });
      return { rewards: result.rewards };
    }

    case 'slashes': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'slashes requires validator-address argument'
        );
      }
      const [validatorAddress] = args;
      const startingHeight = args[1] ? parseBigInt(args[1], 'starting-height') : BigInt(0);
      const endingHeight = args[2] ? parseBigInt(args[2], 'ending-height') : BigInt(Number.MAX_SAFE_INTEGER);
      const result = await distribution.validatorSlashes({
        validatorAddress,
        startingHeight,
        endingHeight,
        pagination: defaultPagination,
      });
      return { slashes: result.slashes, pagination: result.pagination };
    }

    case 'delegator-validators': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'delegator-validators requires delegator-address argument'
        );
      }
      const [delegatorAddress] = args;
      const result = await distribution.delegatorValidators({ delegatorAddress });
      return { validators: result.validators };
    }

    case 'delegator-withdraw-address': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'delegator-withdraw-address requires delegator-address argument'
        );
      }
      const [delegatorAddress] = args;
      const result = await distribution.delegatorWithdrawAddress({ delegatorAddress });
      return { withdrawAddress: result.withdrawAddress };
    }

    default:
      throw new ManifestMCPError(
        ManifestMCPErrorCode.UNSUPPORTED_QUERY,
        `Unsupported distribution query subcommand: ${subcommand}`,
        {
          availableSubcommands: [
            'rewards',
            'commission',
            'community-pool',
            'params',
            'validator-outstanding-rewards',
            'slashes',
            'delegator-validators',
            'delegator-withdraw-address',
          ],
        }
      );
  }
}
