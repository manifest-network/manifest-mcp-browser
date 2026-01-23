import { ManifestQueryClient } from '../client.js';
import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';

/**
 * Route auth query to manifestjs query client
 */
export async function routeAuthQuery(
  queryClient: ManifestQueryClient,
  subcommand: string,
  args: string[]
): Promise<Record<string, unknown>> {
  const auth = queryClient.cosmos.auth.v1beta1;

  switch (subcommand) {
    case 'account': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'account requires address argument'
        );
      }
      const [address] = args;
      const result = await auth.account({ address });
      return { account: result.account };
    }

    case 'accounts': {
      const result = await auth.accounts({});
      return { accounts: result.accounts, pagination: result.pagination };
    }

    case 'params': {
      const result = await auth.params({});
      return { params: result.params };
    }

    case 'module-accounts': {
      const result = await auth.moduleAccounts({});
      return { accounts: result.accounts };
    }

    case 'module-account-by-name': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'module-account-by-name requires name argument'
        );
      }
      const [name] = args;
      const result = await auth.moduleAccountByName({ name });
      return { account: result.account };
    }

    case 'address-bytes-to-string': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'address-bytes-to-string requires address-bytes argument'
        );
      }
      const addressBytes = new Uint8Array(Buffer.from(args[0], 'hex'));
      const result = await auth.addressBytesToString({ addressBytes });
      return { addressString: result.addressString };
    }

    case 'address-string-to-bytes': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'address-string-to-bytes requires address-string argument'
        );
      }
      const [addressString] = args;
      const result = await auth.addressStringToBytes({ addressString });
      return { addressBytes: Buffer.from(result.addressBytes).toString('hex') };
    }

    case 'bech32-prefix': {
      const result = await auth.bech32Prefix({});
      return { bech32Prefix: result.bech32Prefix };
    }

    case 'account-info': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'account-info requires address argument'
        );
      }
      const [address] = args;
      const result = await auth.accountInfo({ address });
      return { info: result.info };
    }

    default:
      throw new ManifestMCPError(
        ManifestMCPErrorCode.UNSUPPORTED_QUERY,
        `Unsupported auth query subcommand: ${subcommand}`,
        {
          availableSubcommands: [
            'account',
            'accounts',
            'params',
            'module-accounts',
            'module-account-by-name',
            'address-bytes-to-string',
            'address-string-to-bytes',
            'bech32-prefix',
            'account-info',
          ],
        }
      );
  }
}
