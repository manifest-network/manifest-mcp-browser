import { ManifestQueryClient } from '../client.js';
import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';
import { defaultPagination } from './utils.js';
import { throwUnsupportedSubcommand } from '../modules.js';

/**
 * Route bank query to manifestjs query client
 */
export async function routeBankQuery(
  queryClient: ManifestQueryClient,
  subcommand: string,
  args: string[]
): Promise<Record<string, unknown>> {
  const bank = queryClient.cosmos.bank.v1beta1;

  switch (subcommand) {
    case 'balance': {
      if (args.length < 2) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'balance requires address and denom arguments'
        );
      }
      const [address, denom] = args;
      const result = await bank.balance({ address, denom });
      return { balance: result.balance };
    }

    case 'balances': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'balances requires address argument'
        );
      }
      const [address] = args;
      const result = await bank.allBalances({ address, resolveDenom: false, pagination: defaultPagination });
      return { balances: result.balances, pagination: result.pagination };
    }

    case 'spendable-balances': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'spendable-balances requires address argument'
        );
      }
      const [address] = args;
      const result = await bank.spendableBalances({ address, pagination: defaultPagination });
      return { balances: result.balances, pagination: result.pagination };
    }

    case 'total-supply':
    case 'total': {
      const result = await bank.totalSupply({ pagination: defaultPagination });
      return { supply: result.supply, pagination: result.pagination };
    }

    case 'supply-of': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'supply-of requires denom argument'
        );
      }
      const [denom] = args;
      const result = await bank.supplyOf({ denom });
      return { amount: result.amount };
    }

    case 'params': {
      const result = await bank.params({});
      return { params: result.params };
    }

    case 'denom-metadata': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'denom-metadata requires denom argument'
        );
      }
      const [denom] = args;
      const result = await bank.denomMetadata({ denom });
      return { metadata: result.metadata };
    }

    case 'denoms-metadata': {
      const result = await bank.denomsMetadata({ pagination: defaultPagination });
      return { metadatas: result.metadatas, pagination: result.pagination };
    }

    case 'send-enabled': {
      const denoms = args.length > 0 ? args : [];
      const result = await bank.sendEnabled({ denoms, pagination: defaultPagination });
      return { sendEnabled: result.sendEnabled, pagination: result.pagination };
    }

    default:
      throwUnsupportedSubcommand('query', 'bank', subcommand);
  }
}
