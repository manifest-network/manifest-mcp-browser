import { ModuleInfo, AvailableModules, ManifestMCPError, ManifestMCPErrorCode } from './types.js';

/**
 * Static module registry for browser-compatible module discovery
 * All modules use manifestjs for full protobuf support
 */

interface SubcommandInfo {
  name: string;
  description: string;
}

interface ModuleRegistry {
  [moduleName: string]: {
    description: string;
    subcommands: SubcommandInfo[];
  };
}

/**
 * Query modules registry
 */
const QUERY_MODULES: ModuleRegistry = {
  bank: {
    description: 'Querying commands for the bank module',
    subcommands: [
      { name: 'balance', description: 'Query account balance for a specific denom' },
      { name: 'balances', description: 'Query all balances for an account' },
      { name: 'spendable-balances', description: 'Query spendable balances for an account' },
      { name: 'total-supply', description: 'Query total supply of all tokens' },
      { name: 'total', description: 'Query total supply of all tokens (alias for total-supply)' },
      { name: 'supply-of', description: 'Query supply of a specific denom' },
      { name: 'params', description: 'Query bank parameters' },
      { name: 'denom-metadata', description: 'Query metadata for a specific denom' },
      { name: 'denoms-metadata', description: 'Query metadata for all denoms' },
      { name: 'send-enabled', description: 'Query send enabled status for denoms' },
    ],
  },
  staking: {
    description: 'Querying commands for the staking module',
    subcommands: [
      { name: 'delegation', description: 'Query a delegation' },
      { name: 'delegations', description: 'Query all delegations for a delegator' },
      { name: 'unbonding-delegation', description: 'Query an unbonding delegation' },
      { name: 'unbonding-delegations', description: 'Query all unbonding delegations for a delegator' },
      { name: 'redelegations', description: 'Query redelegations' },
      { name: 'validator', description: 'Query a validator' },
      { name: 'validators', description: 'Query all validators' },
      { name: 'validator-delegations', description: 'Query all delegations to a validator' },
      { name: 'validator-unbonding-delegations', description: 'Query all unbonding delegations from a validator' },
      { name: 'pool', description: 'Query staking pool' },
      { name: 'params', description: 'Query staking parameters' },
      { name: 'historical-info', description: 'Query historical info at a height' },
    ],
  },
  distribution: {
    description: 'Querying commands for the distribution module',
    subcommands: [
      { name: 'rewards', description: 'Query distribution rewards for a delegator' },
      { name: 'commission', description: 'Query validator commission' },
      { name: 'community-pool', description: 'Query community pool coins' },
      { name: 'params', description: 'Query distribution parameters' },
      { name: 'validator-outstanding-rewards', description: 'Query validator outstanding rewards' },
      { name: 'slashes', description: 'Query slashes for a validator' },
      { name: 'delegator-validators', description: 'Query validators for a delegator' },
      { name: 'delegator-withdraw-address', description: 'Query delegator withdraw address' },
    ],
  },
  gov: {
    description: 'Querying commands for the governance module',
    subcommands: [
      { name: 'proposal', description: 'Query a proposal by ID' },
      { name: 'proposals', description: 'Query all proposals' },
      { name: 'vote', description: 'Query a vote on a proposal' },
      { name: 'votes', description: 'Query all votes on a proposal' },
      { name: 'deposit', description: 'Query a deposit on a proposal' },
      { name: 'deposits', description: 'Query all deposits on a proposal' },
      { name: 'tally', description: 'Query tally of a proposal' },
      { name: 'params', description: 'Query governance parameters' },
    ],
  },
  auth: {
    description: 'Querying commands for the auth module',
    subcommands: [
      { name: 'account', description: 'Query account by address' },
      { name: 'accounts', description: 'Query all accounts' },
      { name: 'params', description: 'Query auth parameters' },
      { name: 'module-accounts', description: 'Query all module accounts' },
      { name: 'module-account-by-name', description: 'Query module account by name' },
      { name: 'address-bytes-to-string', description: 'Convert address bytes to string' },
      { name: 'address-string-to-bytes', description: 'Convert address string to bytes' },
      { name: 'bech32-prefix', description: 'Query bech32 prefix' },
      { name: 'account-info', description: 'Query account info' },
    ],
  },
  billing: {
    description: 'Querying commands for the Manifest billing module',
    subcommands: [
      { name: 'params', description: 'Query billing parameters' },
      { name: 'lease', description: 'Query a lease by UUID' },
      { name: 'leases', description: 'Query all leases' },
      { name: 'leases-by-tenant', description: 'Query leases by tenant address' },
      { name: 'leases-by-provider', description: 'Query leases by provider' },
      { name: 'leases-by-sku', description: 'Query leases by SKU UUID' },
      { name: 'credit-account', description: 'Query credit account for a tenant' },
      { name: 'credit-accounts', description: 'Query all credit accounts' },
      { name: 'credit-address', description: 'Query credit address for a tenant' },
      { name: 'withdrawable-amount', description: 'Query withdrawable amount for a lease' },
      { name: 'provider-withdrawable', description: 'Query withdrawable amount for a provider' },
      { name: 'credit-estimate', description: 'Query credit estimate for a tenant' },
    ],
  },
};

/**
 * Transaction modules registry
 */
const TX_MODULES: ModuleRegistry = {
  bank: {
    description: 'Bank transaction subcommands',
    subcommands: [
      { name: 'send', description: 'Send tokens to another account' },
      { name: 'multi-send', description: 'Send tokens to multiple accounts' },
    ],
  },
  staking: {
    description: 'Staking transaction subcommands',
    subcommands: [
      { name: 'delegate', description: 'Delegate tokens to a validator' },
      { name: 'unbond', description: 'Unbond tokens from a validator' },
      { name: 'undelegate', description: 'Unbond tokens from a validator (alias for unbond)' },
      { name: 'redelegate', description: 'Redelegate tokens from one validator to another' },
    ],
  },
  distribution: {
    description: 'Distribution transaction subcommands',
    subcommands: [
      { name: 'withdraw-rewards', description: 'Withdraw rewards from a validator' },
      { name: 'set-withdraw-addr', description: 'Set withdraw address' },
      { name: 'fund-community-pool', description: 'Fund the community pool' },
    ],
  },
  gov: {
    description: 'Governance transaction subcommands',
    subcommands: [
      { name: 'vote', description: 'Vote on a proposal' },
      { name: 'weighted-vote', description: 'Weighted vote on a proposal' },
      { name: 'deposit', description: 'Deposit tokens for a proposal' },
    ],
  },
  billing: {
    description: 'Manifest billing transaction subcommands',
    subcommands: [
      { name: 'fund-credit', description: 'Fund credit for a tenant' },
      { name: 'create-lease', description: 'Create a new lease' },
      { name: 'close-lease', description: 'Close one or more leases' },
      { name: 'withdraw', description: 'Withdraw earnings from leases' },
    ],
  },
  manifest: {
    description: 'Manifest module transaction subcommands',
    subcommands: [
      { name: 'payout', description: 'Execute a payout to multiple addresses' },
      { name: 'burn-held-balance', description: 'Burn held balance' },
    ],
  },
};

/**
 * Get all available query and transaction modules
 */
export function getAvailableModules(): AvailableModules {
  const queryModules: ModuleInfo[] = Object.entries(QUERY_MODULES).map(
    ([name, info]) => ({
      name,
      description: info.description,
    })
  );

  const txModules: ModuleInfo[] = Object.entries(TX_MODULES).map(
    ([name, info]) => ({
      name,
      description: info.description,
    })
  );

  return {
    queryModules,
    txModules,
  };
}

/**
 * Get available subcommands for a specific module
 */
export function getModuleSubcommands(
  type: 'query' | 'tx',
  module: string
): ModuleInfo[] {
  const registry = type === 'query' ? QUERY_MODULES : TX_MODULES;
  const moduleInfo = registry[module];

  if (!moduleInfo) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.UNKNOWN_MODULE,
      `Unknown ${type} module: ${module}`,
      { availableModules: Object.keys(registry) }
    );
  }

  return moduleInfo.subcommands.map((sub) => ({
    name: sub.name,
    description: sub.description,
  }));
}

/**
 * Check if a module/subcommand combination is supported
 */
export function isSubcommandSupported(
  type: 'query' | 'tx',
  module: string,
  subcommand: string
): boolean {
  const registry = type === 'query' ? QUERY_MODULES : TX_MODULES;
  const moduleInfo = registry[module];

  if (!moduleInfo) {
    return false;
  }

  return moduleInfo.subcommands.some((s) => s.name === subcommand);
}

/**
 * Get supported modules list
 */
export function getSupportedModules(): {
  query: { [module: string]: string[] };
  tx: { [module: string]: string[] };
} {
  const result = {
    query: {} as { [module: string]: string[] },
    tx: {} as { [module: string]: string[] },
  };

  for (const [module, info] of Object.entries(QUERY_MODULES)) {
    result.query[module] = info.subcommands.map((s) => s.name);
  }

  for (const [module, info] of Object.entries(TX_MODULES)) {
    result.tx[module] = info.subcommands.map((s) => s.name);
  }

  return result;
}
