import { ManifestQueryClient } from '../client.js';
import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';
import { defaultPagination } from './utils.js';
import { throwUnsupportedSubcommand } from '../modules.js';

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
      const result = await auth.accounts({ pagination: defaultPagination });
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
      const hexString = args[0];
      // Validate hex format: must be valid hex characters with even length
      if (!/^[0-9a-fA-F]*$/.test(hexString)) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          `Invalid hex string: "${hexString}". Must contain only hexadecimal characters (0-9, a-f, A-F)`
        );
      }
      if (hexString.length % 2 !== 0) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          `Invalid hex string length: ${hexString.length}. Must have an even number of characters`
        );
      }
      // Limit size to prevent DoS (256 bytes = 512 hex chars, more than enough for any address)
      if (hexString.length > 512) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          `Hex string too long: ${hexString.length} characters. Maximum allowed: 512`
        );
      }
      const addressBytes = new Uint8Array(Buffer.from(hexString, 'hex'));
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
      throwUnsupportedSubcommand('query', 'auth', subcommand);
  }
}
