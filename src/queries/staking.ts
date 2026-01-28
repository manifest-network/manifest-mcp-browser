import { ManifestQueryClient } from '../client.js';
import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';
import { parseBigInt, defaultPagination } from './utils.js';
import { throwUnsupportedSubcommand } from '../modules.js';

/**
 * Route staking query to manifestjs query client
 */
export async function routeStakingQuery(
  queryClient: ManifestQueryClient,
  subcommand: string,
  args: string[]
): Promise<Record<string, unknown>> {
  const staking = queryClient.cosmos.staking.v1beta1;

  switch (subcommand) {
    case 'delegation': {
      if (args.length < 2) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'delegation requires delegator-address and validator-address arguments'
        );
      }
      const [delegatorAddr, validatorAddr] = args;
      const result = await staking.delegation({
        delegatorAddr,
        validatorAddr,
      });
      return { delegationResponse: result.delegationResponse };
    }

    case 'delegations': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'delegations requires delegator-address argument'
        );
      }
      const [delegatorAddr] = args;
      const result = await staking.delegatorDelegations({ delegatorAddr, pagination: defaultPagination });
      return {
        delegationResponses: result.delegationResponses,
        pagination: result.pagination,
      };
    }

    case 'unbonding-delegation': {
      if (args.length < 2) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'unbonding-delegation requires delegator-address and validator-address arguments'
        );
      }
      const [delegatorAddr, validatorAddr] = args;
      const result = await staking.unbondingDelegation({
        delegatorAddr,
        validatorAddr,
      });
      return { unbond: result.unbond };
    }

    case 'unbonding-delegations': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'unbonding-delegations requires delegator-address argument'
        );
      }
      const [delegatorAddr] = args;
      const result = await staking.delegatorUnbondingDelegations({ delegatorAddr, pagination: defaultPagination });
      return {
        unbondingResponses: result.unbondingResponses,
        pagination: result.pagination,
      };
    }

    case 'redelegations': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'redelegations requires delegator-address argument'
        );
      }
      const [delegatorAddr] = args;
      const srcValidatorAddr = args[1] || '';
      const dstValidatorAddr = args[2] || '';
      const result = await staking.redelegations({
        delegatorAddr,
        srcValidatorAddr,
        dstValidatorAddr,
        pagination: defaultPagination,
      });
      return {
        redelegationResponses: result.redelegationResponses,
        pagination: result.pagination,
      };
    }

    case 'validator': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'validator requires validator-address argument'
        );
      }
      const [validatorAddr] = args;
      const result = await staking.validator({ validatorAddr });
      return { validator: result.validator };
    }

    case 'validators': {
      const status = args[0] || '';
      const result = await staking.validators({ status, pagination: defaultPagination });
      return { validators: result.validators, pagination: result.pagination };
    }

    case 'validator-delegations': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'validator-delegations requires validator-address argument'
        );
      }
      const [validatorAddr] = args;
      const result = await staking.validatorDelegations({ validatorAddr, pagination: defaultPagination });
      return {
        delegationResponses: result.delegationResponses,
        pagination: result.pagination,
      };
    }

    case 'validator-unbonding-delegations': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'validator-unbonding-delegations requires validator-address argument'
        );
      }
      const [validatorAddr] = args;
      const result = await staking.validatorUnbondingDelegations({ validatorAddr, pagination: defaultPagination });
      return {
        unbondingResponses: result.unbondingResponses,
        pagination: result.pagination,
      };
    }

    case 'pool': {
      const result = await staking.pool({});
      return { pool: result.pool };
    }

    case 'params': {
      const result = await staking.params({});
      return { params: result.params };
    }

    case 'historical-info': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'historical-info requires height argument'
        );
      }
      const height = parseBigInt(args[0], 'height');
      const result = await staking.historicalInfo({ height });
      return { hist: result.hist };
    }

    default:
      throwUnsupportedSubcommand('query', 'staking', subcommand);
  }
}
