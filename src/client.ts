import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
import {
  cosmosProtoRegistry,
  cosmosAminoConverters,
  liftedinitProtoRegistry,
  liftedinitAminoConverters,
  strangeloveVenturesProtoRegistry,
  strangeloveVenturesAminoConverters,
  osmosisProtoRegistry,
  osmosisAminoConverters,
  liftedinit,
} from '@manifest-network/manifestjs';
import { Registry } from '@cosmjs/proto-signing';
import { AminoTypes } from '@cosmjs/stargate';
import { ManifestMCPConfig, WalletProvider, ManifestMCPError, ManifestMCPErrorCode } from './types.js';

// Type for the RPC query client from manifestjs liftedinit bundle
// This includes cosmos modules + liftedinit-specific modules (billing, manifest, sku)
export type ManifestQueryClient = Awaited<ReturnType<typeof liftedinit.ClientFactory.createRPCQueryClient>>;

/**
 * Get combined signing client options with all Manifest registries
 */
function getSigningManifestClientOptions() {
  const registry = new Registry([
    ...cosmosProtoRegistry,
    ...liftedinitProtoRegistry,
    ...strangeloveVenturesProtoRegistry,
    ...osmosisProtoRegistry,
  ]);

  const aminoTypes = new AminoTypes({
    ...cosmosAminoConverters,
    ...liftedinitAminoConverters,
    ...strangeloveVenturesAminoConverters,
    ...osmosisAminoConverters,
  });

  return { registry, aminoTypes };
}

/**
 * Manages CosmJS client instances with lazy initialization and singleton pattern
 */
export class CosmosClientManager {
  private static instances: Map<string, CosmosClientManager> = new Map();

  private config: ManifestMCPConfig;
  private walletProvider: WalletProvider;
  private queryClient: ManifestQueryClient | null = null;
  private signingClient: SigningStargateClient | null = null;

  private constructor(config: ManifestMCPConfig, walletProvider: WalletProvider) {
    this.config = config;
    this.walletProvider = walletProvider;
  }

  /**
   * Get or create a singleton instance for the given config
   */
  static getInstance(
    config: ManifestMCPConfig,
    walletProvider: WalletProvider
  ): CosmosClientManager {
    const key = `${config.chainId}:${config.rpcUrl}`;
    let instance = CosmosClientManager.instances.get(key);

    if (!instance) {
      instance = new CosmosClientManager(config, walletProvider);
      CosmosClientManager.instances.set(key, instance);
    }

    return instance;
  }

  /**
   * Clear all cached instances (useful for testing or reconnection)
   */
  static clearInstances(): void {
    CosmosClientManager.instances.clear();
  }

  /**
   * Get the manifestjs RPC query client with all module extensions
   */
  async getQueryClient(): Promise<ManifestQueryClient> {
    if (!this.queryClient) {
      try {
        // Use liftedinit ClientFactory which includes cosmos + liftedinit modules
        this.queryClient = await liftedinit.ClientFactory.createRPCQueryClient({
          rpcEndpoint: this.config.rpcUrl,
        });
      } catch (error) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.RPC_CONNECTION_FAILED,
          `Failed to connect to RPC endpoint: ${error instanceof Error ? error.message : String(error)}`,
          { rpcUrl: this.config.rpcUrl }
        );
      }
    }
    return this.queryClient;
  }

  /**
   * Get a signing client with all Manifest registries (for transactions)
   */
  async getSigningClient(): Promise<SigningStargateClient> {
    if (!this.signingClient) {
      try {
        const signer = await this.walletProvider.getSigner();
        const gasPrice = GasPrice.fromString(this.config.gasPrice);
        const { registry, aminoTypes } = getSigningManifestClientOptions();

        // Note: Registry type from @cosmjs/proto-signing doesn't perfectly match
        // SigningStargateClientOptions due to telescope-generated proto types.
        // This is a known limitation with custom cosmos-sdk module registries.
        this.signingClient = await SigningStargateClient.connectWithSigner(
          this.config.rpcUrl,
          signer,
          {
            registry: registry as Parameters<typeof SigningStargateClient.connectWithSigner>[2] extends { registry?: infer R } ? R : never,
            aminoTypes,
            gasPrice,
          }
        );
      } catch (error) {
        if (error instanceof ManifestMCPError) {
          throw error;
        }
        throw new ManifestMCPError(
          ManifestMCPErrorCode.RPC_CONNECTION_FAILED,
          `Failed to connect signing client: ${error instanceof Error ? error.message : String(error)}`,
          { rpcUrl: this.config.rpcUrl }
        );
      }
    }
    return this.signingClient;
  }

  /**
   * Get the wallet address
   */
  async getAddress(): Promise<string> {
    return this.walletProvider.getAddress();
  }

  /**
   * Get the configuration
   */
  getConfig(): ManifestMCPConfig {
    return this.config;
  }

  /**
   * Disconnect all clients
   */
  disconnect(): void {
    if (this.signingClient) {
      this.signingClient.disconnect();
      this.signingClient = null;
    }
    this.queryClient = null;
  }
}
