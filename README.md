# @manifest-network/manifest-mcp-browser

Browser-compatible MCP server for Cosmos SDK blockchain interactions with Manifest Network using CosmJS.

This package provides the same MCP tool interface as `manifest-mcp`, but uses CosmJS instead of CLI for browser compatibility.

## Installation

```bash
npm install @manifest-network/manifest-mcp-browser
```

## Development

```bash
npm run build       # TypeScript compilation to dist/
npm run dev         # Watch mode for TypeScript
npm run lint        # Type-check without emitting
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
```

## Quick Start

### With Any Wallet (cosmos-kit, Web3Auth, etc.)

The MCP server works with any wallet that provides an `OfflineSigner`:

```typescript
import { ManifestMCPServer, WalletProvider } from '@manifest-network/manifest-mcp-browser';
import { OfflineSigner } from '@cosmjs/proto-signing';

// Create a wallet provider from your existing signer
const walletProvider: WalletProvider = {
  getAddress: async () => address,
  getSigner: async () => yourOfflineSigner,
};

const server = new ManifestMCPServer({
  config: {
    chainId: 'manifest-ledger-testnet',
    rpcUrl: 'https://nodes.chandrastation.com/rpc/manifest/',
    gasPrice: '1.0umfx',
  },
  walletProvider,
});
```

### With cosmos-kit

```typescript
import { useChain } from '@cosmos-kit/react';
import { ManifestMCPServer, WalletProvider } from '@manifest-network/manifest-mcp-browser';

function MyComponent() {
  const { address, getOfflineSigner } = useChain('manifest');

  const walletProvider: WalletProvider = {
    getAddress: async () => address!,
    getSigner: async () => getOfflineSigner(),
  };

  const server = new ManifestMCPServer({
    config: {
      chainId: 'manifest-ledger-testnet',
      rpcUrl: 'https://nodes.chandrastation.com/rpc/manifest/',
      gasPrice: '1.0umfx',
    },
    walletProvider,
  });
}
```

### Testing with Mnemonic

For testing or non-interactive environments:

```typescript
import { createMnemonicServer } from '@manifest-network/manifest-mcp-browser';

const server = await createMnemonicServer({
  chainId: 'manifest-ledger-testnet',
  rpcUrl: 'https://nodes.chandrastation.com/rpc/manifest/',
  gasPrice: '1.0umfx',
  mnemonic: 'your twelve word mnemonic phrase here...',
});
```

## MCP Tools

The server exposes the same five tools as `manifest-mcp`:

1. **get_account_info** - Get the wallet's account address
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
  rateLimit?: {
    requestsPerSecond?: number; // Max RPC requests per second (default: 10)
  };
}
```

## Wallet Provider Interface

Any wallet that provides an `OfflineSigner` can be used:

```typescript
interface WalletProvider {
  getAddress(): Promise<string>;
  getSigner(): Promise<OfflineSigner>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}
```

### MnemonicWalletProvider

Built-in provider for testing or non-interactive environments:

```typescript
import { MnemonicWalletProvider } from '@manifest-network/manifest-mcp-browser';

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
} from '@manifest-network/manifest-mcp-browser';

const clientManager = CosmosClientManager.getInstance(config, walletProvider);

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

| Feature | manifest-mcp | @manifest-network/manifest-mcp-browser |
|---------|--------------|---------------------|
| Runtime | Node.js only | Browser + Node.js |
| Blockchain access | CLI (manifestd) | CosmJS/HTTP |
| Module discovery | Dynamic (CLI help) | Static registry |
| Manifest modules | Full support | Full support (manifestjs) |

## Error Handling

All errors are wrapped in `ManifestMCPError` with typed error codes:

```typescript
import { ManifestMCPError, ManifestMCPErrorCode } from '@manifest-network/manifest-mcp-browser';

try {
  await cosmosTx(clientManager, 'bank', 'send', ['...', '1000umfx']);
} catch (error) {
  if (error instanceof ManifestMCPError) {
    console.log(error.code);    // e.g., "TX_FAILED"
    console.log(error.message); // Human-readable message with hints
    console.log(error.details); // Additional context
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CONFIG` | Configuration validation failed |
| `INVALID_ADDRESS` | Bech32 address validation failed |
| `INVALID_MNEMONIC` | Invalid mnemonic phrase |
| `TX_FAILED` | Transaction failed (invalid format, validation error) |
| `TX_BROADCAST_FAILED` | Transaction broadcast failed |
| `QUERY_FAILED` | Query failed (invalid args, RPC error) |
| `UNSUPPORTED_TX` | Unsupported transaction module/subcommand |
| `UNSUPPORTED_QUERY` | Unsupported query module/subcommand |
| `RPC_CONNECTION_FAILED` | Failed to connect to RPC endpoint |
| `WALLET_NOT_CONNECTED` | Wallet not connected or disconnected |

## CORS Requirements

The RPC endpoint must allow cross-origin requests for browser usage. If you encounter CORS errors, you may need to:

1. Use an RPC endpoint that allows CORS
2. Set up a CORS proxy
3. Configure your own RPC node to allow CORS

## Security

### Key Handling

This MCP server is wallet-agnostic. Security depends on the wallet provider you use:

- **cosmos-kit / Keplr / Leap**: Private keys stay in the wallet extension
- **Web3Auth**: Keys are reconstructed client-side using MPC
- **MnemonicWalletProvider**: Mnemonic stored in memory (for testing only)

### MnemonicWalletProvider Security

- Mnemonic is stored in memory during the wallet's lifetime
- Calling `disconnect()` clears the mnemonic and prevents reconnection
- After disconnect, create a new instance if needed
- Not recommended for production browser applications

### Input Validation

All inputs are validated to prevent common attack vectors:

- **Address validation**: Bech32 format validated using `@cosmjs/encoding`
- **Amount format**: Must be `<number><denom>` (e.g., `1000000umfx`)
- **Memo length**: Limited to 256 characters (Cosmos SDK default)
- **Args count**: Limited to 100 arguments per call
- **BigInt parsing**: Empty strings rejected (prevents silent 0n values)
- **Hex strings**: Validated format and length for address-bytes queries
- **HTTPS enforcement**: RPC URLs must use HTTPS (HTTP only allowed for localhost/127.0.0.1/::1)

### Resource Limits

Built-in protections against resource exhaustion:

- **Rate limiting**: RPC requests throttled to 10/second by default (configurable)
- **Pagination**: All list queries default to 100 items (configurable via `--limit` flag, max 1000)
- **Broadcast timeout**: Transactions timeout after 60 seconds
- **Poll interval**: Transaction confirmation polled every 3 seconds

### Best Practices

1. **Use wallet adapters in browsers** - Let users control their own keys via cosmos-kit, Web3Auth, etc.
2. **Never hardcode mnemonics** - Use environment variables or secure vaults for testing
3. **Call disconnect() when done** - Ensures sensitive data is cleared from memory
4. **Use HTTPS RPC endpoints** - Prevent man-in-the-middle attacks

### Error Response Sanitization

Error responses automatically redact sensitive fields to prevent accidental exposure:
- Fields named `mnemonic`, `privateKey`, `secret`, `password`, `seed`, `key`, `token`, `apiKey` are replaced with `[REDACTED]`
- Strings that appear to be mnemonics (12 or 24 words) are replaced with `[REDACTED - possible mnemonic]`

### Browser Security Considerations

- This package makes RPC calls to blockchain nodes - ensure you trust the RPC endpoint
- In browser environments, use HTTPS RPC endpoints to prevent MITM attacks
- Consider Content Security Policy (CSP) headers to restrict allowed endpoints

## License

MIT
