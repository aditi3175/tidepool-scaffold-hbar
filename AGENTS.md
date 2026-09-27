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
npm run next:dev                 # frontend on http://localhost:3000 (Main Vault / Narrow Demo Vault selector, testnet)
npm run hardhat:test             # unit tests (mocks; no network needed)
npm run hardhat:compile
npm run lint && npm run next:check-types && npm run next:build

npm run hardhat:account:generate # encrypted deployer key in packages/hardhat/.env
npm run hardhat:deploy:testnet   # deploy + initialize (sends 30 HBAR for the HTS token fee; the rest is refunded)
npm run hardhat:smoke            # associate, wrap, buy SAUCE, deposit, open position; prints HashScan links
npm run hardhat:compound         # compound() only (fixed 8M gas; TIDEPOOL_VAULT picks the vault, default main)
npm run hardhat:withdraw         # 10% partial withdraw with two "yes" prompts (WITHDRAW_BPS, TIDEPOOL_VAULT)
npm run hardhat:simulate-traders # swap back and forth so the position earns fees
npm run hardhat:verify:sourcify  # Sourcify APIv2 (hardhat-verify's Sourcify v1 routes return 404)

# Optional narrow-vault rebalance demo (separate vault; moves the SHARED testnet pool price)
npm run hardhat:deploy:narrow    # deploys "TidepoolVaultNarrow" (+/-60 ticks, 600 s cooldown); main vault untouched
npm run hardhat:deposit          # requires TIDEPOOL_VAULT, DEPOSIT0, DEPOSIT1; exact amounts only
npm run hardhat:move-price       # requires DIRECTION=down|up and AMOUNT; quotes first, asks "yes"
npm run hardhat:rebalance        # requires TIDEPOOL_VAULT; read-only preflight, then fixed 8M gas
```

Every operator script asks for the deployer password. `deposit`, `withdraw`, `move-price` and `rebalance` also
print what they will send and wait for an explicit `yes`; `smoke`, `compound` and `simulate-traders` send as soon
as the password is accepted. Never run them from an agent without the user's go-ahead.

## Where things are

- `packages/hardhat/contracts/tidepool/TidepoolVault.sol` — the vault (no owner, no upgrades)
- `packages/hardhat/contracts/tidepool/libraries/RangeMath.sol` — TWAP, range and swap-ratio maths (MIT, Uniswap v4-core libs only)
- `packages/hardhat/contracts/tidepool/interfaces/ISaucerSwapV2.sol` — the SaucerSwap V2 surface used
- `packages/hardhat/contracts/tidepool/test/Mocks.sol` — test doubles; `MockHts`/`MockExchangeRate` are etched at 0x167/0x168
- `packages/hardhat/tidepool.config.ts` — per-network pool, manager, router and vault parameters
  (`TIDEPOOL` = main vault; `TIDEPOOL_NARROW` = the rebalance demo vault)
- `packages/hardhat/deploy/01_deploy_tidepool_vault_narrow.ts` — skipped unless `TIDEPOOL_DEPLOY_NARROW=true`
- `packages/hardhat/scripts/tidepool*.ts` — testnet operator scripts; shared helpers in `tidepoolScriptUtils.ts`
- `packages/nextjs/app/page.tsx` + `packages/nextjs/app/_components/tidepool/*` — dashboard (VaultSelector,
  VaultOverview, PositionPanel, UserActions with DepositCard/WithdrawCard, KeeperPanel, ActivityFeed, shared `ui.tsx`)
- `packages/nextjs/hooks/tidepool/` — `useVault` (vault, idle balances, `positions()`, chain time), `useUserPosition`,
  `useHtsAccount`, `useKeeperStatus` (keeper checklist and fee/gas quotes), `useTxFeedback` (inline tx status and
  mirror-node revert reasons), `useSelectedVault`, `useWalletGate`, `useVaultActivity`
- `packages/nextjs/utils/tidepool/` — `vaults.ts` (selectable vaults), `constants.ts` (gas limits, ABIs), `errors.ts`
  (plain-language custom errors), `hashscan.ts`, `math.ts`
- `packages/nextjs/contracts/externalContracts.ts` — the narrow demo vault (`TidepoolVaultNarrow`) for the frontend

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
8. **Gas is not Ethereum-sized.** Each HTS association or allowance approval costs ~700-780k gas. The vault grants
   the manager and router standing allowances once, in `initialize()` (capped at each token's max supply when it is
   finite, since HTS rejects anything larger; `type(int64).max` otherwise), so `compound()`/`rebalance()`
   make no approvals (the deployed testnet vaults predate this and make six per call). Observed on testnet with the
   old per-call approvals: `initialize` 2.31M, first `compound` 5.13M,
   `rebalance` 5.26M, `withdraw` 0.36M. Hedera charged the gas used, not the limit.
9. **Position mints cannot be simulated.** `eth_call`/`eth_estimateGas` return `INVALID_NFT_ID` for any SaucerSwap
   V2 position mint (first `compound`, every `rebalance`), even when the real transaction succeeds. Send those with
   a fixed gas limit (8M) after read-only precondition checks; estimate everything else x 1.3.
10. **Deployment records.** `deployments/` is git-ignored. After any deploy, `generateTsAbis` rewrites
    `packages/nextjs/contracts/deployedContracts.ts` from every local record; if a `TidepoolVaultNarrow` record exists
    it is added too; do not commit the narrow entry. The frontend reads the main vault (`TidepoolVault`) from
    `deployedContracts.ts` and the narrow demo vault from `externalContracts.ts`, whose entry wins over a generated one.

## Frontend conventions

Scaffold hooks: `useScaffoldReadContract`, `useScaffoldWriteContract`, `useDeployedContractInfo`, `useTransactor`.
DaisyUI classes. `~~` import alias. `"use client"` on pages with hooks. Prefer `type` over `interface`.

- **Vault selector.** `utils/tidepool/vaults.ts` lists the Main Vault (`TidepoolVault`, generated
  `deployedContracts.ts`) and the Narrow Demo Vault (`TidepoolVaultNarrow`, hand-written `externalContracts.ts`,
  reusing the generated ABI).
  Never hand-edit `deployedContracts.ts`; add or change frontend-only vaults in `externalContracts.ts` and `vaults.ts`.
- **Simulation.** `deposit`/`withdraw` go through `useScaffoldWriteContract` with its default simulation.
  `compound`/`rebalance` use `disableSimulate: true` and a fixed `GAS.keeper` (8,000,000) because a SaucerSwap mint
  returns `INVALID_NFT_ID` in `eth_call`; `useKeeperStatus` performs the read-only precondition checks that gate the
  buttons. Do not disable simulation anywhere else.
- **Errors.** `utils/tidepool/errors.ts` maps the vault's custom errors to plain language; the template's
  `getParsedError.ts` and `useTransactor.tsx` call it, and wallet rejections show "Transaction cancelled".
- **Wallets.** The burner wallet is disabled (`enableBurnerWallet: false` in `scaffold.config.ts`).
