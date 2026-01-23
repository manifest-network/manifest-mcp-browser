import { DirectSecp256k1HdWallet, OfflineSigner } from '@cosmjs/proto-signing';
import { WalletProvider, WalletType, ManifestMCPError, ManifestMCPErrorCode, ManifestMCPConfig } from '../types.js';

/**
 * Mnemonic-based wallet provider for non-browser environments or testing
 */
export class MnemonicWalletProvider implements WalletProvider {
  public readonly type: WalletType = 'mnemonic';
  private config: ManifestMCPConfig;
  private mnemonic: string;
  private wallet: DirectSecp256k1HdWallet | null = null;
  private address: string | null = null;

  constructor(config: ManifestMCPConfig, mnemonic: string) {
    this.config = config;
    this.mnemonic = mnemonic;
  }

  /**
   * Initialize the wallet from the mnemonic
   */
  private async initWallet(): Promise<void> {
    if (this.wallet) {
      return;
    }

    const prefix = this.config.addressPrefix ?? 'manifest';

    try {
      this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
        prefix,
      });

      const accounts = await this.wallet.getAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts derived from mnemonic');
      }

      this.address = accounts[0].address;
    } catch (error) {
      throw new ManifestMCPError(
        ManifestMCPErrorCode.INVALID_MNEMONIC,
        `Failed to create wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Connect (initialize) the wallet
   */
  async connect(): Promise<void> {
    await this.initWallet();
  }

  /**
   * Disconnect (clear) the wallet
   */
  async disconnect(): Promise<void> {
    this.wallet = null;
    this.address = null;
  }

  /**
   * Get the wallet's address
   */
  async getAddress(): Promise<string> {
    await this.initWallet();

    if (!this.address) {
      throw new ManifestMCPError(
        ManifestMCPErrorCode.WALLET_NOT_CONNECTED,
        'Wallet failed to initialize'
      );
    }

    return this.address;
  }

  /**
   * Get the offline signer for signing transactions
   */
  async getSigner(): Promise<OfflineSigner> {
    await this.initWallet();

    if (!this.wallet) {
      throw new ManifestMCPError(
        ManifestMCPErrorCode.WALLET_NOT_CONNECTED,
        'Wallet failed to initialize'
      );
    }

    return this.wallet;
  }
}
