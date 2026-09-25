# Agent instructions — Tidepool

Briefing for coding agents (Cursor, Claude Code, Codex). `CLAUDE.md` imports this file.

Tidepool is a Scaffold-HBAR template: a vault that holds one SaucerSwap V2 concentrated-liquidity
position, issues an HTS share token, compounds fees, and re-centres the range on the pool's TWAP.
Hardhat (`packages/hardhat`) + Next.js App Router (`packages/nextjs`). Hedera testnet only: the
vault needs live SaucerSwap V2 contracts, so there is no local-chain flow.

## Commands

Use the package manager this project was created with (see `packageManager` in the root `package.json`).
With npm, pass extra flags after `--` (`npm run hardhat:deploy -- --network hederaTestnet`);
without the `--`, npm swallows `--network`.

```bash
npm run next:dev                 # frontend on http://localhost:3000 (reads the committed testnet vault)
npm run hardhat:test             # unit tests (mocks; no network needed)
npm run hardhat:compile
npm run lint && npm run next:check-types && npm run next:build

npm run hardhat:account:generate # encrypted deployer key in packages/hardhat/.env
npm run hardhat:deploy:testnet   # deploy + initialize (sends 30 HBAR for the HTS token fee; the rest is refunded)
npm run hardhat:smoke            # associate, wrap, buy SAUCE, deposit, open position; prints HashScan links
npm run hardhat:simulate-traders # swap back and forth so the position earns fees
npm run hardhat:verify:sourcify  # Sourcify APIv2 (hardhat-verify's Sourcify v1 routes return 404)
```

## Where things are

- `packages/hardhat/contracts/tidepool/TidepoolVault.sol` — the vault (no owner, no upgrades)
- `packages/hardhat/contracts/tidepool/libraries/RangeMath.sol` — TWAP, range and swap-ratio maths (MIT, Uniswap v4-core libs only)
- `packages/hardhat/contracts/tidepool/interfaces/ISaucerSwapV2.sol` — the SaucerSwap V2 surface used
- `packages/hardhat/contracts/tidepool/test/Mocks.sol` — test doubles; `MockHts`/`MockExchangeRate` are etched at 0x167/0x168
- `packages/hardhat/tidepool.config.ts` — per-network pool, manager, router and vault parameters
- `packages/nextjs/hooks/tidepool/*`, `packages/nextjs/app/_components/tidepool/*` — dashboard

## Rules that are easy to get wrong on Hedera

1. **Amounts in HTS are int64.** Share token has 8 decimals; convert with `SafeCast.toInt64`.
2. **Association.** The vault self-associates with token0, token1 and the LP NFT in `initialize()`.
   Users must associate the share token (HIP-719: call `associate()` on the token address) unless
   their account has free auto-association slots. Read `isAssociated()` with `account` set — never through a multicall.
3. **HBAR units.** JSON-RPC `value` is weibar (18 decimals); contracts see tinybar (8). Multiply tinybars by `1e10` in the UI.
4. **SaucerSwap position fee.** Every `mint`/`increaseLiquidity` costs `factory.mintFee()` tinycents, paid in HBAR.
   The vault forwards exactly `tinycentsToTinybars(fee) + 1` (the manager's own rounding slop). Callers of
   `compound()`/`rebalance()` pay it via `msg.value`; the vault refunds the rest.
5. **WHBAR.** Never call or approve the WHBAR *contract* (0.0.15057) directly. Wrap/unwrap through SaucerSwap's
   `WhbarHelper` (testnet 0.0.5286055). Approving the WHBAR *token* to the position manager or router is normal.
6. **Licences.** Do not copy Uniswap v3 periphery/core code (GPL / BUSL). Import MIT files from `@uniswap/v4-core/src/libraries`.
7. **TWAP.** `observe()` reverts (`OLD`) when the pool's observation history is shorter than `twapWindow`;
   the vault surfaces it as `TwapUnavailable`. Pools with cardinality 1 need `increaseObservationCardinalityNext`.

## Frontend conventions

Scaffold hooks: `useScaffoldReadContract`, `useScaffoldWriteContract`, `useDeployedContractInfo`, `useTransactor`.
DaisyUI classes. `~~` import alias. `"use client"` on pages with hooks. Prefer `type` over `interface`.
