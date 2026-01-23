import type { OfflineSigner } from '@cosmjs/proto-signing';

/**
 * Configuration for the Manifest MCP Browser server
 */
export interface ManifestMCPConfig {
  /** Chain ID (e.g., "manifest-ledger-testnet") */
  readonly chainId: string;
  /** RPC endpoint URL */
  readonly rpcUrl: string;
  /** Gas price with denomination (e.g., "1.0umfx") */
  readonly gasPrice: string;
  /** Gas adjustment multiplier (default: 1.3) */
  readonly gasAdjustment?: number;
  /** Address prefix (e.g., "manifest") */
  readonly addressPrefix?: string;
}

/**
 * Supported wallet types
 */
export type WalletType = 'keplr' | 'mnemonic';

/**
 * Wallet provider interface for different wallet implementations
 */
export interface WalletProvider {
  /** The type of wallet provider */
  readonly type: WalletType;
  /** Get the wallet's address */
  getAddress(): Promise<string>;
  /** Get the offline signer for signing transactions */
  getSigner(): Promise<OfflineSigner>;
  /** Optional: Connect to the wallet (for Keplr) */
  connect?(): Promise<void>;
  /** Optional: Disconnect from the wallet */
  disconnect?(): Promise<void>;
}

/**
 * Result from a Cosmos query
 */
export interface CosmosQueryResult {
  readonly module: string;
  readonly subcommand: string;
  readonly result: Record<string, unknown>;
}

/**
 * Result from a Cosmos transaction
 */
export interface CosmosTxResult {
  readonly module: string;
  readonly subcommand: string;
  readonly transactionHash: string;
  readonly code: number;
  readonly height: string;
  readonly rawLog?: string;
  confirmed?: boolean;
  confirmationHeight?: string;
  readonly gasUsed?: string;
  readonly gasWanted?: string;
}

/**
 * Module information for discovery
 */
export interface ModuleInfo {
  readonly name: string;
  readonly description: string;
}

/**
 * Available modules listing
 */
export interface AvailableModules {
  readonly queryModules: readonly ModuleInfo[];
  readonly txModules: readonly ModuleInfo[];
}

/**
 * Error codes for ManifestMCPError
 */
export enum ManifestMCPErrorCode {
  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_CONFIG = 'MISSING_CONFIG',

  // Wallet errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
  KEPLR_NOT_INSTALLED = 'KEPLR_NOT_INSTALLED',
  INVALID_MNEMONIC = 'INVALID_MNEMONIC',

  // Client errors
  CLIENT_NOT_INITIALIZED = 'CLIENT_NOT_INITIALIZED',
  RPC_CONNECTION_FAILED = 'RPC_CONNECTION_FAILED',

  // Query errors
  QUERY_FAILED = 'QUERY_FAILED',
  UNSUPPORTED_QUERY = 'UNSUPPORTED_QUERY',
  INVALID_ADDRESS = 'INVALID_ADDRESS',

  // Transaction errors
  TX_FAILED = 'TX_FAILED',
  TX_SIMULATION_FAILED = 'TX_SIMULATION_FAILED',
  TX_BROADCAST_FAILED = 'TX_BROADCAST_FAILED',
  TX_CONFIRMATION_TIMEOUT = 'TX_CONFIRMATION_TIMEOUT',
  UNSUPPORTED_TX = 'UNSUPPORTED_TX',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',

  // Module errors
  UNKNOWN_MODULE = 'UNKNOWN_MODULE',
  UNKNOWN_SUBCOMMAND = 'UNKNOWN_SUBCOMMAND',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for Manifest MCP Browser errors
 */
export class ManifestMCPError extends Error {
  public readonly code: ManifestMCPErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ManifestMCPErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ManifestMCPError';
    this.code = code;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ManifestMCPError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Account information
 */
export interface AccountInfo {
  readonly address: string;
  readonly walletType: WalletType;
}
