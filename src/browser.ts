/**
 * Browser-compatible entry point for manifest-mcp-browser
 *
 * Use any wallet that provides an OfflineSigner (cosmos-kit, Web3Auth, etc.)
 */

// Core types and errors
export {
  ManifestMCPConfig,
  WalletProvider,
  CosmosQueryResult,
  CosmosTxResult,
  ModuleInfo,
  AvailableModules,
  ManifestMCPError,
  ManifestMCPErrorCode,
  AccountInfo,
} from './types.js';

// Configuration
export {
  createConfig,
  createValidatedConfig,
  validateConfig,
  parseGasPrice,
} from './config.js';

// Wallet provider for testing
export { MnemonicWalletProvider } from './wallet/mnemonic.js';

// Client manager
export { CosmosClientManager } from './client.js';

// Query and transaction execution
export { cosmosQuery, cosmosTx } from './cosmos.js';

// Module discovery
export {
  getAvailableModules,
  getModuleSubcommands,
  getSupportedModules,
  isSubcommandSupported,
} from './modules.js';

// MCP Server
export { ManifestMCPServer, ManifestMCPServerOptions } from './index.js';

/**
 * Create a ManifestMCPServer with mnemonic wallet (for testing or non-interactive use)
 *
 * @example
 * ```typescript
 * import { createMnemonicServer } from 'manifest-mcp-browser/browser';
 *
 * const server = await createMnemonicServer({
 *   chainId: 'manifest-ledger-testnet',
 *   rpcUrl: 'https://nodes.chandrastation.com/rpc/manifest/',
 *   gasPrice: '1.0umfx',
 *   mnemonic: 'your twelve word mnemonic phrase here...',
 * });
 * ```
 */
export async function createMnemonicServer(config: {
  chainId: string;
  rpcUrl: string;
  gasPrice: string;
  gasAdjustment?: number;
  addressPrefix?: string;
  mnemonic: string;
}): Promise<import('./index.js').ManifestMCPServer> {
  const { ManifestMCPServer } = await import('./index.js');
  const { MnemonicWalletProvider } = await import('./wallet/mnemonic.js');

  const { mnemonic, ...mcpConfig } = config;
  const walletProvider = new MnemonicWalletProvider(mcpConfig, mnemonic);
  await walletProvider.connect();

  return new ManifestMCPServer({
    config: mcpConfig,
    walletProvider,
  });
}
