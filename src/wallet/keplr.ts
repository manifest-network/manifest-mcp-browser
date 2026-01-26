import type { OfflineSigner } from '@cosmjs/proto-signing';
import type { Window as KeplrWindow, ChainInfo } from '@keplr-wallet/types';
import { WalletProvider, ManifestMCPError, ManifestMCPErrorCode, ManifestMCPConfig } from '../types.js';

declare global {
  interface Window extends KeplrWindow {}
}

/**
 * Keplr wallet provider for browser environments
 */
export class KeplrWalletProvider implements WalletProvider {
  private config: ManifestMCPConfig;
  private address: string | null = null;
  private signer: OfflineSigner | null = null;

  constructor(config: ManifestMCPConfig) {
    this.config = config;
  }

  /**
   * Check if Keplr is installed
   */
  private getKeplr(): NonNullable<KeplrWindow['keplr']> {
    if (typeof window === 'undefined') {
      throw new ManifestMCPError(
        ManifestMCPErrorCode.KEPLR_NOT_INSTALLED,
        'Keplr is only available in browser environments'
      );
    }

    if (!window.keplr) {
      throw new ManifestMCPError(
        ManifestMCPErrorCode.KEPLR_NOT_INSTALLED,
        'Keplr extension is not installed. Please install Keplr to use this wallet.'
      );
    }

    return window.keplr;
  }

  /**
   * Create chain info for Keplr experimental chain suggestion
   */
  private getChainInfo(): ChainInfo {
    const prefix = this.config.addressPrefix ?? 'manifest';

    return {
      chainId: this.config.chainId,
      chainName: this.config.chainId,
      rpc: this.config.rpcUrl,
      rest: this.config.rpcUrl.replace(/:\d+$/, ':1317'), // Estimate REST endpoint
      bip44: {
        coinType: 118,
      },
      bech32Config: {
        bech32PrefixAccAddr: prefix,
        bech32PrefixAccPub: `${prefix}pub`,
        bech32PrefixValAddr: `${prefix}valoper`,
        bech32PrefixValPub: `${prefix}valoperpub`,
        bech32PrefixConsAddr: `${prefix}valcons`,
        bech32PrefixConsPub: `${prefix}valconspub`,
      },
      currencies: [
        {
          coinDenom: 'MFX',
          coinMinimalDenom: 'umfx',
          coinDecimals: 6,
        },
      ],
      feeCurrencies: [
        {
          coinDenom: 'MFX',
          coinMinimalDenom: 'umfx',
          coinDecimals: 6,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.04,
          },
        },
      ],
      stakeCurrency: {
        coinDenom: 'MFX',
        coinMinimalDenom: 'umfx',
        coinDecimals: 6,
      },
    };
  }

  /**
   * Connect to Keplr and enable the chain
   */
  async connect(): Promise<void> {
    const keplr = this.getKeplr();

    try {
      // Try to enable the chain directly first
      await keplr.enable(this.config.chainId);
    } catch {
      // If chain is not known, suggest it experimentally
      try {
        await keplr.experimentalSuggestChain(this.getChainInfo());
        await keplr.enable(this.config.chainId);
      } catch (error) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.WALLET_CONNECTION_FAILED,
          `Failed to connect to Keplr: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Get the signer
    this.signer = keplr.getOfflineSigner(this.config.chainId);

    // Get the first account's address
    const accounts = await this.signer.getAccounts();
    if (accounts.length === 0) {
      throw new ManifestMCPError(
        ManifestMCPErrorCode.WALLET_CONNECTION_FAILED,
        'No accounts found in Keplr'
      );
    }

    this.address = accounts[0].address;
  }

  /**
   * Disconnect from Keplr
   */
  async disconnect(): Promise<void> {
    this.address = null;
    this.signer = null;
  }

  /**
   * Get the wallet's address
   */
  async getAddress(): Promise<string> {
    if (!this.address) {
      await this.connect();
    }

    if (!this.address) {
      throw new ManifestMCPError(
        ManifestMCPErrorCode.WALLET_NOT_CONNECTED,
        'Wallet is not connected. Call connect() first.'
      );
    }

    return this.address;
  }

  /**
   * Get the offline signer for signing transactions
   */
  async getSigner(): Promise<OfflineSigner> {
    if (!this.signer) {
      await this.connect();
    }

    if (!this.signer) {
      throw new ManifestMCPError(
        ManifestMCPErrorCode.WALLET_NOT_CONNECTED,
        'Wallet is not connected. Call connect() first.'
      );
    }

    return this.signer;
  }
}
