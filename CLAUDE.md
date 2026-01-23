# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-compatible MCP (Model Context Protocol) server for Cosmos SDK blockchain interactions with Manifest Network using CosmJS. This is a browser-friendly alternative to `manifest-mcp` that uses CosmJS/HTTP instead of CLI.

## Build Commands

```bash
npm run build         # TypeScript compilation to dist/
npm run build:browser # Bundle browser entry point with esbuild
npm run build:all     # Run both builds
npm run dev           # Watch mode for TypeScript
npm run lint          # Type-check without emitting (tsc --noEmit)
npm test              # Run tests with vitest
npm run test:watch    # Run tests in watch mode
```

## Architecture

### Entry Points

- `src/index.ts` - Main entry point, exports `ManifestMCPServer` class and all public APIs
- `src/browser.ts` - Browser-specific entry with `createBrowserServer()` and `createMnemonicServer()` factory functions

### Core Components

**ManifestMCPServer** (`src/index.ts`)
- Wraps MCP SDK `Server` to handle tool requests
- Exposes 5 MCP tools: `get_account_info`, `cosmos_query`, `cosmos_tx`, `list_modules`, `list_module_subcommands`

**CosmosClientManager** (`src/client.ts`)
- Singleton pattern per chainId:rpcUrl combination
- Provides lazy-initialized query client (manifestjs RPC) and signing client (CosmJS Stargate)
- Registers all Manifest protobuf types from `@manifest-network/manifestjs`

**Wallet Providers** (`src/wallet/`)
- `WalletProvider` interface defines `getAddress()` and `getSigner()` methods
- `KeplrWalletProvider` - Browser wallet integration with chain suggestion support
- `MnemonicWalletProvider` - Uses `DirectSecp256k1HdWallet` for non-interactive/testing use

### Query/Transaction Routing

**cosmos.ts** - Main router that validates module/subcommand names and dispatches to module handlers

**queries/** - Module-specific query handlers
- Each file exports `route{Module}Query()` function
- Uses manifestjs RPC query client (`liftedinit.ClientFactory.createRPCQueryClient`)
- Shared utilities in `utils.ts`: `parseBigInt()` and `parseInt()` for safe argument parsing

**transactions/** - Module-specific transaction handlers
- Each file exports `route{Module}Transaction()` function
- Uses CosmJS `SigningStargateClient` with Manifest registries
- Shared utilities in `utils.ts`: `parseAmount()` and `buildTxResult()`

**modules.ts** - Static registry of all supported modules and subcommands (no dynamic CLI discovery)

### Supported Modules

Query: bank, staking, distribution, gov, auth, billing
Transaction: bank, staking, distribution, gov, billing, manifest

### Key Dependencies

- `@manifest-network/manifestjs` - Protobuf types, registries, and RPC client factory
- `@modelcontextprotocol/sdk` - MCP server implementation
- `@cosmjs/*` - Signing, encoding, stargate client

### Error Handling

All errors use `ManifestMCPError` class with typed `ManifestMCPErrorCode` enum (see `src/types.ts`).

### Type Exports

`ManifestQueryClient` type in `client.ts` is derived from manifestjs `liftedinit.ClientFactory.createRPCQueryClient` return type.
