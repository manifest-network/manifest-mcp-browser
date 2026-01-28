# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-compatible MCP (Model Context Protocol) server for Cosmos SDK blockchain interactions with Manifest Network using CosmJS. This is a browser-friendly alternative to `manifest-mcp` that uses CosmJS/HTTP instead of CLI.

## Build Commands

```bash
npm run build       # TypeScript compilation to dist/
npm run dev         # Watch mode for TypeScript
npm run lint        # Type-check without emitting (tsc --noEmit)
npm test            # Run tests with vitest
npm run test:watch  # Run tests in watch mode
```

## Architecture

### Entry Point

- `src/index.ts` - Main entry point, exports `ManifestMCPServer` class, `createMnemonicServer()`, and all public APIs

### Core Components

**ManifestMCPServer** (`src/index.ts`)
- Wraps MCP SDK `Server` to handle tool requests
- Exposes 5 MCP tools: `get_account_info`, `cosmos_query`, `cosmos_tx`, `list_modules`, `list_module_subcommands`

**CosmosClientManager** (`src/client.ts`)
- Singleton pattern per chainId:rpcUrl combination
- Provides lazy-initialized query client (manifestjs RPC) and signing client (CosmJS Stargate)
- Registers all Manifest protobuf types from `@manifest-network/manifestjs`

**Wallet Providers** (`src/wallet/`)
- `WalletProvider` interface defines `getAddress()` and `getSigner()` methods (wallet-agnostic)
- Any wallet providing `OfflineSigner` works (cosmos-kit, Web3Auth, Keplr, Leap, etc.)
- `MnemonicWalletProvider` - Built-in provider using `DirectSecp256k1HdWallet` for testing

### Query/Transaction Routing

**cosmos.ts** - Main router that validates module/subcommand names and dispatches to module handlers

**queries/** - Module-specific query handlers
- Each file exports `route{Module}Query()` function
- Uses manifestjs RPC query client (`liftedinit.ClientFactory.createRPCQueryClient`)
- Shared utilities in `utils.ts`: `parseBigInt()`, `parseInteger()`, `createPagination()`, `extractPaginationArgs()`
- All paginated queries support `--limit` flag (default: 100, max: 1000)

**transactions/** - Module-specific transaction handlers
- Each file exports `route{Module}Transaction()` function
- Uses CosmJS `SigningStargateClient` with Manifest registries
- Uses manifestjs enums (e.g., `VoteOption` from `cosmos.gov.v1`)
- Shared utilities in `utils.ts`:
  - `requireArgs()` - Validate required argument count with helpful error messages
  - `parseAmount()` - Parse amount strings with helpful error hints
  - `parseBigIntWithCode()` - Base implementation used by both queries and transactions
  - `validateAddress()` - Bech32 validation using `@cosmjs/encoding`
  - `validateMemo()` - Enforce 256 char limit (Cosmos SDK default)
  - `validateArgsLength()` - Enforce 100 args max to prevent DoS
  - `extractFlag()` - Extract `--flag value` pairs from args
  - `buildTxResult()` - Build transaction result objects

**modules.ts** - Static registry of all supported modules and subcommands (no dynamic CLI discovery)

### Supported Modules

Query: bank, staking, distribution, gov, auth, billing
Transaction: bank, staking, distribution, gov, billing, manifest

### Key Dependencies

- `@manifest-network/manifestjs` - Protobuf types, registries, RPC client factory, and enums (e.g., `VoteOption`)
- `@modelcontextprotocol/sdk` - MCP server implementation
- `@cosmjs/stargate` - Signing client, gas price parsing
- `@cosmjs/encoding` - Bech32 address validation (`fromBech32`)
- `@cosmjs/proto-signing` - Wallet and signer interfaces

### Security Features

**Input Validation:**
- Bech32 address validation using `@cosmjs/encoding`
- Amount format validation with helpful error hints
- Memo length limit (256 chars, Cosmos SDK default)
- Args array length limit (100 max)
- BigInt empty string rejection (prevents silent 0n)
- Hex string validation for address-bytes queries
- HTTPS enforcement for RPC URLs (HTTP only allowed for localhost/127.0.0.1/::1)

**Resource Limits:**
- Rate limiting via `limiter` package (default: 10 requests/second, configurable)
- Default pagination limit of 100 items for all list queries
- Transaction broadcast timeout (60 seconds)
- Broadcast poll interval (3 seconds)

**Sensitive Data:**
- Error responses sanitize sensitive fields (mnemonic, privateKey, secret, etc.)
- Mnemonic cleared on wallet disconnect
- No logging of sensitive data

### Error Handling

All errors use `ManifestMCPError` class with typed `ManifestMCPErrorCode` enum (see `src/types.ts`).

### Type Exports

`ManifestQueryClient` type in `client.ts` is derived from manifestjs `liftedinit.ClientFactory.createRPCQueryClient` return type.
