import { ManifestQueryClient } from '../client.js';
import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';
import { parseBigInt } from './utils.js';

/**
 * Route billing module query to manifestjs query client
 */
export async function routeBillingQuery(
  queryClient: ManifestQueryClient,
  subcommand: string,
  args: string[]
): Promise<Record<string, unknown>> {
  const billing = queryClient.liftedinit.billing.v1;

  switch (subcommand) {
    case 'params': {
      const result = await billing.params({});
      return { params: result.params };
    }

    case 'lease': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'lease requires lease-uuid argument'
        );
      }
      const [leaseUuid] = args;
      const result = await billing.lease({ leaseUuid });
      return { lease: result.lease };
    }

    case 'leases': {
      // stateFilter: 0 = LEASE_STATE_UNSPECIFIED (returns all)
      const result = await billing.leases({ stateFilter: 0 });
      return { leases: result.leases, pagination: result.pagination };
    }

    case 'leases-by-tenant': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'leases-by-tenant requires tenant-address argument'
        );
      }
      const [tenant] = args;
      const result = await billing.leasesByTenant({ tenant, stateFilter: 0 });
      return { leases: result.leases, pagination: result.pagination };
    }

    case 'leases-by-provider': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'leases-by-provider requires provider-uuid argument'
        );
      }
      const [providerUuid] = args;
      const result = await billing.leasesByProvider({ providerUuid, stateFilter: 0 });
      return { leases: result.leases, pagination: result.pagination };
    }

    case 'leases-by-sku': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'leases-by-sku requires sku-uuid argument'
        );
      }
      const [skuUuid] = args;
      const result = await billing.leasesBySKU({ skuUuid, stateFilter: 0 });
      return { leases: result.leases, pagination: result.pagination };
    }

    case 'credit-account': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'credit-account requires tenant-address argument'
        );
      }
      const [tenant] = args;
      const result = await billing.creditAccount({ tenant });
      return { creditAccount: result.creditAccount };
    }

    case 'credit-accounts': {
      const result = await billing.creditAccounts({});
      return { creditAccounts: result.creditAccounts, pagination: result.pagination };
    }

    case 'credit-address': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'credit-address requires tenant-address argument'
        );
      }
      const [tenant] = args;
      const result = await billing.creditAddress({ tenant });
      return { creditAddress: result.creditAddress };
    }

    case 'withdrawable-amount': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'withdrawable-amount requires lease-uuid argument'
        );
      }
      const [leaseUuid] = args;
      const result = await billing.withdrawableAmount({ leaseUuid });
      return { amounts: result.amounts };
    }

    case 'provider-withdrawable': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'provider-withdrawable requires provider-uuid argument'
        );
      }
      const [providerUuid] = args;
      // limit: max leases to process (default 100, max 1000)
      const limit = args[1] ? parseBigInt(args[1], 'limit') : BigInt(100);
      const result = await billing.providerWithdrawable({ providerUuid, limit });
      return { amounts: result.amounts };
    }

    case 'credit-estimate': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'credit-estimate requires tenant-address argument'
        );
      }
      const [tenant] = args;
      const result = await billing.creditEstimate({ tenant });
      return { estimate: result };
    }

    default:
      throw new ManifestMCPError(
        ManifestMCPErrorCode.UNSUPPORTED_QUERY,
        `Unsupported billing query subcommand: ${subcommand}`,
        {
          availableSubcommands: [
            'params',
            'lease',
            'leases',
            'leases-by-tenant',
            'leases-by-provider',
            'leases-by-sku',
            'credit-account',
            'credit-accounts',
            'credit-address',
            'withdrawable-amount',
            'provider-withdrawable',
            'credit-estimate',
          ],
        }
      );
  }
}
