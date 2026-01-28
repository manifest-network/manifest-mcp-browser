import type { OfflineSigner } from '@cosmjs/proto-signing';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per second (default: 10) */
  readonly requestsPerSecond?: number;
}

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
  /** Address prefix (e.g., "manifest") */
  readonly addressPrefix?: string;
  /** Rate limiting configuration */
  readonly rateLimit?: RateLimitConfig;
}

/**
 * Wallet provider interface for different wallet implementations
 *
 * Any wallet that provides an OfflineSigner works (Keplr, Web3Auth, Leap, cosmos-kit, etc.)
 */
export interface WalletProvider {
  /** Get the wallet's address */
  getAddress(): Promise<string>;
  /** Get the offline signer for signing transactions */
  getSigner(): Promise<OfflineSigner>;
  /** Optional: Connect to the wallet */
  connect?(): Promise<void>;
  /** Optional: Disconnect from the wallet */
  disconnect?(): Promise<void>;
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
  readonly confirmed?: boolean;
  readonly confirmationHeight?: string;
  readonly gasUsed?: string;
  readonly gasWanted?: string;
  readonly events?: readonly {
    readonly type: string;
    readonly attributes: readonly { readonly key: string; readonly value: string }[];
  }[];
}

/**
 * Module information for discovery
 */
export interface ModuleInfo {
  readonly name: string;
  readonly description: string;
  readonly args?: string; // Usage hint for arguments
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
}

// ============================================================================
// Query Result Types
// ============================================================================

/**
 * Pagination response from Cosmos SDK queries
 */
export interface PaginationResponse {
  readonly nextKey?: Uint8Array;
  readonly total?: bigint;
}

/**
 * Base interface for paginated query results
 */
export interface PaginatedResult {
  readonly pagination?: PaginationResponse;
}

/**
 * Coin type from Cosmos SDK
 */
export interface Coin {
  readonly denom: string;
  readonly amount: string;
}

/**
 * DecCoin type from Cosmos SDK (for rewards, etc.)
 */
export interface DecCoin {
  readonly denom: string;
  readonly amount: string;
}

// Bank query results
export interface BalanceResult {
  readonly balance?: Coin;
}

export interface BalancesResult extends PaginatedResult {
  readonly balances: readonly Coin[];
}

export interface TotalSupplyResult extends PaginatedResult {
  readonly supply: readonly Coin[];
}

export interface SupplyOfResult {
  readonly amount?: Coin;
}

export interface DenomMetadataResult {
  readonly metadata?: unknown;
}

export interface DenomsMetadataResult extends PaginatedResult {
  readonly metadatas: readonly unknown[];
}

export interface SendEnabledResult extends PaginatedResult {
  readonly sendEnabled: readonly unknown[];
}

export interface BankParamsResult {
  readonly params?: unknown;
}

// Staking query results
export interface DelegationResult {
  readonly delegationResponse?: unknown;
}

export interface DelegationsResult extends PaginatedResult {
  readonly delegationResponses: readonly unknown[];
}

export interface UnbondingDelegationResult {
  readonly unbond?: unknown;
}

export interface UnbondingDelegationsResult extends PaginatedResult {
  readonly unbondingResponses: readonly unknown[];
}

export interface RedelegationsResult extends PaginatedResult {
  readonly redelegationResponses: readonly unknown[];
}

export interface ValidatorResult {
  readonly validator?: unknown;
}

export interface ValidatorsResult extends PaginatedResult {
  readonly validators: readonly unknown[];
}

export interface StakingPoolResult {
  readonly pool?: unknown;
}

export interface StakingParamsResult {
  readonly params?: unknown;
}

export interface HistoricalInfoResult {
  readonly hist?: unknown;
}

// Distribution query results
export interface RewardsResult {
  readonly rewards: readonly DecCoin[];
  readonly total?: readonly DecCoin[];
}

export interface CommissionResult {
  readonly commission?: unknown;
}

export interface CommunityPoolResult {
  readonly pool: readonly DecCoin[];
}

export interface DistributionParamsResult {
  readonly params?: unknown;
}

export interface ValidatorOutstandingRewardsResult {
  readonly rewards?: unknown;
}

export interface SlashesResult extends PaginatedResult {
  readonly slashes: readonly unknown[];
}

export interface DelegatorValidatorsResult {
  readonly validators: readonly string[];
}

export interface DelegatorWithdrawAddressResult {
  readonly withdrawAddress: string;
}

// Gov query results
export interface ProposalResult {
  readonly proposal?: unknown;
}

export interface ProposalsResult extends PaginatedResult {
  readonly proposals: readonly unknown[];
}

export interface VoteResult {
  readonly vote?: unknown;
}

export interface VotesResult extends PaginatedResult {
  readonly votes: readonly unknown[];
}

export interface DepositResult {
  readonly deposit?: unknown;
}

export interface DepositsResult extends PaginatedResult {
  readonly deposits: readonly unknown[];
}

export interface TallyResult {
  readonly tally?: unknown;
}

export interface GovParamsResult {
  readonly votingParams?: unknown;
  readonly depositParams?: unknown;
  readonly tallyParams?: unknown;
  readonly params?: unknown;
}

// Auth query results
export interface AuthAccountResult {
  readonly account?: unknown;
}

export interface AuthAccountsResult extends PaginatedResult {
  readonly accounts: readonly unknown[];
}

export interface AuthParamsResult {
  readonly params?: unknown;
}

export interface ModuleAccountsResult {
  readonly accounts: readonly unknown[];
}

export interface AddressBytesToStringResult {
  readonly addressString: string;
}

export interface AddressStringToBytesResult {
  readonly addressBytes: string;
}

export interface Bech32PrefixResult {
  readonly bech32Prefix: string;
}

export interface AccountInfoResult {
  readonly info?: unknown;
}

// Billing query results
export interface BillingParamsResult {
  readonly params?: unknown;
}

export interface LeaseResult {
  readonly lease?: unknown;
}

export interface LeasesResult extends PaginatedResult {
  readonly leases: readonly unknown[];
}

export interface CreditAccountResult {
  readonly creditAccount?: unknown;
}

export interface CreditAccountsResult extends PaginatedResult {
  readonly creditAccounts: readonly unknown[];
}

export interface CreditAddressResult {
  readonly creditAddress: string;
}

export interface WithdrawableAmountResult {
  readonly amounts: readonly Coin[];
}

export interface ProviderWithdrawableResult {
  readonly amounts: readonly Coin[];
}

export interface CreditEstimateResult {
  readonly estimate: unknown;
}

// Group query results
export interface GroupInfoResult {
  readonly info?: unknown;
}

export interface GroupPolicyInfoResult {
  readonly info?: unknown;
}

export interface GroupMembersResult extends PaginatedResult {
  readonly members: readonly unknown[];
}

export interface GroupsResult extends PaginatedResult {
  readonly groups: readonly unknown[];
}

export interface GroupPoliciesResult extends PaginatedResult {
  readonly groupPolicies: readonly unknown[];
}

export interface GroupProposalResult {
  readonly proposal?: unknown;
}

export interface GroupProposalsResult extends PaginatedResult {
  readonly proposals: readonly unknown[];
}

export interface GroupVoteResult {
  readonly vote?: unknown;
}

export interface GroupVotesResult extends PaginatedResult {
  readonly votes: readonly unknown[];
}

export interface GroupTallyResult {
  readonly tally?: unknown;
}

// SKU query results
export interface SkuParamsResult {
  readonly params?: unknown;
}

export interface ProviderResult {
  readonly provider?: unknown;
}

export interface ProvidersResult extends PaginatedResult {
  readonly providers: readonly unknown[];
}

export interface SkuResult {
  readonly sku?: unknown;
}

export interface SkusResult extends PaginatedResult {
  readonly skus: readonly unknown[];
}

/**
 * Union type of all query results for type-safe handling
 */
export type QueryResult =
  | BalanceResult
  | BalancesResult
  | TotalSupplyResult
  | SupplyOfResult
  | DenomMetadataResult
  | DenomsMetadataResult
  | SendEnabledResult
  | BankParamsResult
  | DelegationResult
  | DelegationsResult
  | UnbondingDelegationResult
  | UnbondingDelegationsResult
  | RedelegationsResult
  | ValidatorResult
  | ValidatorsResult
  | StakingPoolResult
  | StakingParamsResult
  | HistoricalInfoResult
  | RewardsResult
  | CommissionResult
  | CommunityPoolResult
  | DistributionParamsResult
  | ValidatorOutstandingRewardsResult
  | SlashesResult
  | DelegatorValidatorsResult
  | DelegatorWithdrawAddressResult
  | ProposalResult
  | ProposalsResult
  | VoteResult
  | VotesResult
  | DepositResult
  | DepositsResult
  | TallyResult
  | GovParamsResult
  | AuthAccountResult
  | AuthAccountsResult
  | AuthParamsResult
  | ModuleAccountsResult
  | AddressBytesToStringResult
  | AddressStringToBytesResult
  | Bech32PrefixResult
  | AccountInfoResult
  | BillingParamsResult
  | LeaseResult
  | LeasesResult
  | CreditAccountResult
  | CreditAccountsResult
  | CreditAddressResult
  | WithdrawableAmountResult
  | ProviderWithdrawableResult
  | CreditEstimateResult
  | SkuParamsResult
  | ProviderResult
  | ProvidersResult
  | SkuResult
  | SkusResult
  | GroupInfoResult
  | GroupPolicyInfoResult
  | GroupMembersResult
  | GroupsResult
  | GroupPoliciesResult
  | GroupProposalResult
  | GroupProposalsResult
  | GroupVoteResult
  | GroupVotesResult
  | GroupTallyResult;

/**
 * Result from a Cosmos query
 */
export interface CosmosQueryResult {
  readonly module: string;
  readonly subcommand: string;
  readonly result: QueryResult;
}
