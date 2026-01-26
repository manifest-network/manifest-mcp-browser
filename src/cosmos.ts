import { CosmosClientManager } from './client.js';
import { CosmosQueryResult, CosmosTxResult, ManifestMCPError, ManifestMCPErrorCode } from './types.js';
import { getSupportedModules } from './modules.js';
import { routeBankQuery } from './queries/bank.js';
import { routeStakingQuery } from './queries/staking.js';
import { routeDistributionQuery } from './queries/distribution.js';
import { routeGovQuery } from './queries/gov.js';
import { routeAuthQuery } from './queries/auth.js';
import { routeBillingQuery } from './queries/billing.js';
import { routeBankTransaction } from './transactions/bank.js';
import { routeStakingTransaction } from './transactions/staking.js';
import { routeDistributionTransaction } from './transactions/distribution.js';
import { routeGovTransaction } from './transactions/gov.js';
import { routeBillingTransaction } from './transactions/billing.js';
import { routeManifestTransaction } from './transactions/manifest.js';

// Validation pattern for module/subcommand names (alphanumeric, hyphens, underscores)
// First character must not be a hyphen to prevent potential issues
const VALID_NAME_PATTERN = /^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/;

/**
 * Validate that a string is safe for use as a module or subcommand name
 */
function validateName(name: string, field: string): void {
  if (!name || !VALID_NAME_PATTERN.test(name)) {
    throw new ManifestMCPError(
      ManifestMCPErrorCode.QUERY_FAILED,
      `Invalid ${field}: "${name}". Only alphanumeric characters, hyphens, and underscores are allowed.`
    );
  }
}

// Get module lists from the authoritative registry
const supportedModules = getSupportedModules();
const QUERY_MODULES = Object.keys(supportedModules.query);
const TX_MODULES = Object.keys(supportedModules.tx);

/**
 * Execute a Cosmos query via manifestjs RPC client
 */
export async function cosmosQuery(
  clientManager: CosmosClientManager,
  module: string,
  subcommand: string,
  args: string[] = []
): Promise<CosmosQueryResult> {
  validateName(module, 'module');
  validateName(subcommand, 'subcommand');

  const queryClient = await clientManager.getQueryClient();

  let result: Record<string, unknown>;

  try {
    switch (module) {
      case 'bank':
        result = await routeBankQuery(queryClient, subcommand, args);
        break;
      case 'staking':
        result = await routeStakingQuery(queryClient, subcommand, args);
        break;
      case 'distribution':
        result = await routeDistributionQuery(queryClient, subcommand, args);
        break;
      case 'gov':
        result = await routeGovQuery(queryClient, subcommand, args);
        break;
      case 'auth':
        result = await routeAuthQuery(queryClient, subcommand, args);
        break;
      case 'billing':
        result = await routeBillingQuery(queryClient, subcommand, args);
        break;
      default:
        throw new ManifestMCPError(
          ManifestMCPErrorCode.UNKNOWN_MODULE,
          `Unknown query module: ${module}`,
          { availableModules: QUERY_MODULES }
        );
    }

    return {
      module,
      subcommand,
      result,
    };
  } catch (error) {
    if (error instanceof ManifestMCPError) {
      throw error;
    }
    throw new ManifestMCPError(
      ManifestMCPErrorCode.QUERY_FAILED,
      `Query ${module} ${subcommand} failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Execute a Cosmos transaction via manifestjs signing client
 */
export async function cosmosTx(
  clientManager: CosmosClientManager,
  module: string,
  subcommand: string,
  args: string[] = [],
  waitForConfirmation: boolean = false
): Promise<CosmosTxResult> {
  validateName(module, 'module');
  validateName(subcommand, 'subcommand');

  const signingClient = await clientManager.getSigningClient();
  const senderAddress = await clientManager.getAddress();
  const config = clientManager.getConfig();

  try {
    switch (module) {
      case 'bank':
        return await routeBankTransaction(
          signingClient,
          senderAddress,
          subcommand,
          args,
          config,
          waitForConfirmation
        );
      case 'staking':
        return await routeStakingTransaction(
          signingClient,
          senderAddress,
          subcommand,
          args,
          config,
          waitForConfirmation
        );
      case 'distribution':
        return await routeDistributionTransaction(
          signingClient,
          senderAddress,
          subcommand,
          args,
          config,
          waitForConfirmation
        );
      case 'gov':
        return await routeGovTransaction(
          signingClient,
          senderAddress,
          subcommand,
          args,
          config,
          waitForConfirmation
        );
      case 'billing':
        return await routeBillingTransaction(
          signingClient,
          senderAddress,
          subcommand,
          args,
          config,
          waitForConfirmation
        );
      case 'manifest':
        return await routeManifestTransaction(
          signingClient,
          senderAddress,
          subcommand,
          args,
          config,
          waitForConfirmation
        );
      default:
        throw new ManifestMCPError(
          ManifestMCPErrorCode.UNKNOWN_MODULE,
          `Unknown tx module: ${module}`,
          { availableModules: TX_MODULES }
        );
    }
  } catch (error) {
    if (error instanceof ManifestMCPError) {
      // Re-throw with enriched context if not already present
      if (!error.details?.module) {
        throw new ManifestMCPError(
          error.code,
          error.message,
          { ...error.details, module, subcommand, args }
        );
      }
      throw error;
    }
    throw new ManifestMCPError(
      ManifestMCPErrorCode.TX_FAILED,
      `Tx ${module} ${subcommand} failed: ${error instanceof Error ? error.message : String(error)}`,
      { module, subcommand, args }
    );
  }
}
