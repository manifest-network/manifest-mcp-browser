# manifest-mcp-browser

Browser-compatible MCP server for Cosmos SDK blockchain interactions with Manifest Network using CosmJS.

This package provides the same MCP tool interface as `manifest-mcp`, but uses CosmJS instead of CLI for browser compatibility.

## Installation

```bash
npm install manifest-mcp-browser
```

## Development

```bash
npm run build         # TypeScript compilation to dist/
npm run build:browser # Bundle browser entry point with esbuild
npm run build:all     # Run both builds
npm run dev           # Watch mode for TypeScript
npm run lint          # Type-check without emitting
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
```

## Quick Start

### Browser with Keplr

```typescript
import { createBrowserServer } from 'manifest-mcp-browser/browser';

const server = await createBrowserServer({
  chainId: 'manifest-ledger-testnet',
  rpcUrl: 'https://nodes.chandrastation.com/rpc/manifest/',
  gasPrice: '1.0umfx',
});

// The server is now ready to handle MCP requests
```

### Node.js with Mnemonic

```typescript
import { createMnemonicServer } from 'manifest-mcp-browser/browser';

const server = await createMnemonicServer({
  chainId: 'manifest-ledger-testnet',
  rpcUrl: 'https://nodes.chandrastation.com/rpc/manifest/',
  gasPrice: '1.0umfx',
  mnemonic: 'your twelve word mnemonic phrase here...',
});
```

### Manual Setup

```typescript
import {
  ManifestMCPServer,
  KeplrWalletProvider,
  MnemonicWalletProvider,
} from 'manifest-mcp-browser';

// With Keplr
const keplrWallet = new KeplrWalletProvider({
  chainId: 'manifest-ledger-testnet',
  rpcUrl: 'https://nodes.chandrastation.com/rpc/manifest/',
  gasPrice: '1.0umfx',
});
await keplrWallet.connect();

const server = new ManifestMCPServer({
  config: {
    chainId: 'manifest-ledger-testnet',
    rpcUrl: 'https://nodes.chandrastation.com/rpc/manifest/',
    gasPrice: '1.0umfx',
  },
  walletProvider: keplrWallet,
});
```

## MCP Tools

The server exposes the same five tools as `manifest-mcp`:

1. **get_account_info** - Get account address and wallet type
2. **cosmos_query** - Execute any supported Cosmos SDK query
3. **cosmos_tx** - Execute any supported Cosmos SDK transaction
4. **list_modules** - List available query and transaction modules
5. **list_module_subcommands** - List subcommands for a specific module

## Supported Operations

### Query Modules

| Module | Subcommands |
|--------|-------------|
| bank | balance, balances, spendable-balances, total-supply (alias: total), supply-of, params, denom-metadata, denoms-metadata, send-enabled |
| staking | delegation, delegations, unbonding-delegation, unbonding-delegations, redelegations, validator, validators, validator-delegations, validator-unbonding-delegations, pool, params, historical-info |
| distribution | rewards, commission, community-pool, params, validator-outstanding-rewards, slashes, delegator-validators, delegator-withdraw-address |
| gov | proposal, proposals, vote, votes, deposit, deposits, tally, params |
| auth | account, accounts, params, module-accounts, module-account-by-name, address-bytes-to-string, address-string-to-bytes, bech32-prefix, account-info |
| billing | params, lease, leases, leases-by-tenant, leases-by-provider, leases-by-sku, credit-account, credit-accounts, credit-address, withdrawable-amount, provider-withdrawable, credit-estimate |

### Transaction Modules

| Module | Subcommands |
|--------|-------------|
| bank | send, multi-send |
| staking | delegate, unbond (alias: undelegate), redelegate |
| distribution | withdraw-rewards, set-withdraw-addr, fund-community-pool |
| gov | vote, weighted-vote, deposit |
| billing | fund-credit, create-lease, close-lease, withdraw |
| manifest | payout, burn-held-balance |

## Configuration

```typescript
interface ManifestMCPConfig {
  chainId: string;        // Chain ID (e.g., "manifest-ledger-testnet")
  rpcUrl: string;         // RPC endpoint URL
  gasPrice: string;       // Gas price with denomination (e.g., "1.0umfx")
  gasAdjustment?: number; // Gas adjustment multiplier (default: 1.3)
  addressPrefix?: string; // Address prefix (default: "manifest")
}
```

## Wallet Providers

### KeplrWalletProvider

For browser environments with Keplr extension installed.

```typescript
const wallet = new KeplrWalletProvider(config);
await wallet.connect();  // Prompts user to approve
const address = await wallet.getAddress();
```

### MnemonicWalletProvider

For non-interactive or testing environments.

```typescript
const wallet = new MnemonicWalletProvider(config, mnemonic);
await wallet.connect();
const address = await wallet.getAddress();
```

## Direct CosmJS Usage

You can also use the CosmJS client manager directly:

```typescript
import {
  CosmosClientManager,
  cosmosQuery,
  cosmosTx,
  MnemonicWalletProvider,
} from 'manifest-mcp-browser';

const wallet = new MnemonicWalletProvider(config, mnemonic);
const clientManager = CosmosClientManager.getInstance(config, wallet);

// Query balance
const balance = await cosmosQuery(
  clientManager,
  'bank',
  'balance',
  ['manifest1...', 'umfx']
);

// Send tokens
const result = await cosmosTx(
  clientManager,
  'bank',
  'send',
  ['manifest1recipient...', '1000umfx'],
  true  // wait for confirmation
);
```

## Differences from manifest-mcp

| Feature | manifest-mcp | manifest-mcp-browser |
|---------|--------------|---------------------|
| Runtime | Node.js only | Browser + Node.js |
| Blockchain access | CLI (manifestd) | CosmJS/HTTP |
| Module discovery | Dynamic (CLI help) | Static registry |
| Custom modules | Full support | Limited support |
| Keplr support | No | Yes |

## Error Handling

All errors are wrapped in `ManifestMCPError` with error codes:

```typescript
import { ManifestMCPError, ManifestMCPErrorCode } from 'manifest-mcp-browser';

try {
  await cosmosTx(clientManager, 'bank', 'send', ['...', '1000umfx']);
} catch (error) {
  if (error instanceof ManifestMCPError) {
    console.log(error.code);    // e.g., "TX_FAILED"
    console.log(error.message); // Human-readable message
    console.log(error.details); // Additional context
  }
}
```

## CORS Requirements

The RPC endpoint must allow cross-origin requests for browser usage. If you encounter CORS errors, you may need to:

1. Use an RPC endpoint that allows CORS
2. Set up a CORS proxy
3. Configure your own RPC node to allow CORS

## License

MIT
