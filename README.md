# Tidepool — a SaucerSwap V2 liquidity vault (Scaffold-HBAR template)

Tidepool is a Scaffold-HBAR template for a vault that **owns one SaucerSwap V2 concentrated-liquidity position**,
issues depositors a **native HTS share token**, **compounds** swap fees back into the position, and **re-centres**
the range when the pool's time-weighted price leaves it. Contracts (Hardhat) and a Next.js dashboard, running on
Hedera testnet.

> Testnet reference code. Not audited, not production-ready, and no yield is implied. Testnet pool prices are set by
> testnet traders and are not market prices.

---

## Why

A SaucerSwap V2 position only earns fees while the pool price is inside its tick range. Once the price leaves the
range the liquidity sits idle, and SaucerSwap V2 fees do not compound on their own: someone has to collect them, add
them back (paying SaucerSwap's HBAR position fee each time), and move the range when the market moves. Every token
team, DAO treasury or protocol that owns liquidity ends up doing this by hand.

## What Tidepool does

- **Vault-held position.** One `TidepoolVault` holds one SaucerSwap V2 LP NFT for one pool.
- **HTS share token.** `initialize()` creates an HTS fungible token (8 decimals) with the vault as treasury and supply
  key and no other keys. Deposits mint shares, withdrawals burn them.
- **Compound.** `compound()` collects fees, swaps idle balances to the range's token ratio through the SaucerSwap
  router, and adds them to the position (minting the first position if none exists).
- **Guarded, permissionless rebalance.** Anyone may call `rebalance()`, but it only succeeds when the pool's **TWAP
  tick is outside the range**, **spot is within `maxTwapDeviation` of the TWAP**, and the **cooldown has elapsed**. It
  then withdraws everything, re-centres a fixed-width range on the TWAP tick, and mints a new position NFT. The old
  NFT stays in the vault with zero liquidity.
- **No owner.** No admin, pause, fee switch or upgrade path. The deployer can only call `initialize()` once.
- **No automation.** Nothing runs in the background: `compound()` and `rebalance()` happen only when someone calls
  them (a person, the dashboard, or your own keeper). The caller pays the SaucerSwap position fee in HBAR; the vault
  refunds any surplus.

## Architecture

```
Next.js dashboard ──JSON-RPC──► TidepoolVault ──► SaucerSwap V2 pool        (slot0, observe → spot + TWAP)
  range chart, deposit,           │            ──► NonfungiblePositionManager (mint / increase / decrease / collect;
  withdraw, keeper actions        │                                            the position is an HTS NFT)
        │                         │            ──► SwapRouter                 (exactInputSingle)
        │ REST                    ├─ HTS system contract 0x167: associate, create/mint/burn share token
        ▼                         └─ exchange-rate system contract 0x168: position fee tinycents → tinybars
Hedera mirror node (vault event history)
```

Full design, maths, threat model and every Hedera-specific pitfall: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Hedera-specific integration

| Area | How Tidepool uses it |
|---|---|
| **HTS share token** | Created, minted and burned by the vault through the HTS system contract (`0x167`). Amounts are `int64`, hence 8 decimals. |
| **HTS association** | The vault associates itself with both pool tokens and the SaucerSwap LP **NFT** collection in `initialize()`. Users associate the share token from their wallet via HIP-719 (`associate()` on the token address); the dashboard shows the button when it is needed. |
| **Solidity on Hedera** | Vault and libraries compile with solc 0.8.28 (evm target paris) and run on Hedera's EVM via the Hashio JSON-RPC relay. |
| **HBAR fees** | SaucerSwap charges its position fee in tinycents on every mint/increase; the vault converts it on-chain with the exchange-rate system contract (`0x168`) and forwards exactly that amount. JSON-RPC `value` is in weibar (18 dp) while contracts see tinybar (8 dp). |
| **WHBAR** | Pools use WHBAR; the dashboard and scripts wrap HBAR through SaucerSwap's WhbarHelper, never the WHBAR contract directly. |
| **Mirror node** | The dashboard's activity feed and the operator scripts read history and account/token IDs from the mirror node REST API. |

## Why this is a useful template

It is the smallest complete, MIT-licensed example of a **contract that owns and manages a SaucerSwap V2 position on
Hedera**, including the parts that differ from Ethereum: HTS association of an NFT collection by a contract, an HTS
share token created by a contract, HBAR-denominated position fees, `int64` token amounts, large HTS gas costs, and
position mints that cannot be pre-simulated. Change the pool, width and windows in one config file to reuse it.

## Setup

Prerequisites: Node.js ≥ 20.18.3, Git with `user.name`/`user.email` set.

**From the template CLI** (needs this repository to be public):
```bash
npm create scaffold-hbar@latest -- --template aditi3175/tidepool-scaffold-hbar
```

**From a clone** (Yarn workspaces; Yarn 3.2.3 ships in `.yarn/releases`, so `corepack enable` or
`node .yarn/releases/yarn-3.2.3.cjs <script>` both work):
```bash
yarn install
yarn hardhat:compile
yarn hardhat:test
yarn next:dev            # http://localhost:3000, dashboard for the testnet vaults
```

With npm, pass extra flags after `--` (`npm run hardhat:deploy -- --network hederaTestnet`); a root `.npmrc` sets
`legacy-peer-deps=true` because the template's Hardhat plugins have a peer-range mismatch.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY_ENCRYPTED` | `packages/hardhat/.env` | Written by `hardhat:account:generate/import`; the key is stored encrypted and decrypted with your password at run time. Never commit `.env`. |
| `HEDERA_RPC_URL` | Hardhat | Optional RPC override (default `https://testnet.hashio.io/api`). |
| `TIDEPOOL_VAULT` | compound, withdraw, deposit, move-price, rebalance | Deployment name to target. Defaults to `TidepoolVault` for compound/withdraw/move-price; **required** for deposit and rebalance. |
| `WITHDRAW_BPS` | withdraw | Share of your balance to withdraw, in basis points (default `1000`). |
| `DEPOSIT0`, `DEPOSIT1` | deposit | Exact token0/token1 amounts (required). |
| `DIRECTION`, `AMOUNT` | move-price | `down` sells token0, `up` sells token1; amount of the input token (both required). |
| `WRAP_HBAR_IF_NEEDED` | move-price | `true` allows wrapping the WHBAR shortfall (asks separately). |
| `ALLOW_MAIN_VAULT_REBALANCE` | rebalance | `true` is required to target the main vault. |
| `TIDEPOOL_DEPLOY_NARROW` | narrow deploy | Set by `hardhat:deploy:narrow`; the narrow deploy is skipped without it. |
| `WRAP_HBAR`, `BUY_HBAR` | smoke | HBAR to wrap / spend on SAUCE (default 20 each). |
| `ROUNDS`, `AMOUNT_HBAR` | simulate-traders | Number of round trips and HBAR per trip (default 3 / 5). |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, `NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL`, `NEXT_PUBLIC_MIRROR_NODE_URL` | frontend | Optional overrides. |

## Local development

There is no local-chain flow: the vault needs live SaucerSwap V2 contracts. Locally you run the unit tests (mocks for
the pool, position manager, router, HTS and exchange-rate system contracts) and the dashboard against testnet:

```bash
yarn hardhat:test
yarn lint && yarn next:check-types && yarn next:build
yarn next:dev
```

In `next:dev`, the first visit to each page (for example `/debug`) takes a while because Next.js compiles routes on
demand; later visits are fast. Production builds are compiled ahead of time. `next:build` and `next:dev` share
`packages/nextjs/.next`, so stop the dev server before building.

## Testnet deployment

```bash
yarn hardhat:account:generate        # or hardhat:account:import (ECDSA key)
# fund the account at https://portal.hedera.com/faucet
yarn hardhat:deploy:testnet          # deploy + initialize (sends 30 HBAR; ~15.3 HBAR pays the HTS token fee, the rest is refunded)
yarn hardhat:verify:sourcify         # Sourcify APIv2; HashScan shows the source
```

Parameters live in `packages/hardhat/tidepool.config.ts` (`TIDEPOOL.hederaTestnet`): the WHBAR/SAUCE 0.30% pool,
±600-tick range, 600 s TWAP window, 50-tick max deviation, 3600 s cooldown, 1% extra swap slippage.

## Dashboard

`yarn next:dev` serves the dashboard on http://localhost:3000 against Hedera testnet. Connect your own wallet
(MetaMask or WalletConnect) on Hedera Testnet; the template's burner wallet is disabled. Amounts are shown in token
units only, with no USD values.

- **Vault selector.** Main Vault or Narrow Demo Vault (marked "Demo", with a warning banner). The main vault's address
  comes from the generated `packages/nextjs/contracts/deployedContracts.ts`; the narrow vault is configured by hand as
  `TidepoolVaultNarrow` in `packages/nextjs/contracts/externalContracts.ts` (same contract, so it reuses the
  generated ABI). The list of vaults is `packages/nextjs/utils/tidepool/vaults.ts`.
- **Vault overview.** Vault holdings (`getTotalAmounts()`, which excludes uncollected fees), idle balances, total
  shares and the share token (HashScan link); for the connected account, its Hedera account ID, shares, percentage of
  supply, estimated slice of the holdings and share-token association.
- **Position.** LP NFT serial (HashScan link), liquidity, range in ticks and prices, spot and TWAP ticks and prices
  and the distance between them, in-range status, a range chart, "Fees owed" (see known limitations) and the vault's
  range settings.
- **Deposit / Withdraw.** Association buttons, an optional HBAR → WHBAR wrap, a SaucerSwap testnet link for SAUCE,
  ratio auto-fill, exact-amount approvals, a preview (an estimate, then the exact result from a simulation once the
  approval is in place), 1% minimums, a Max button for withdrawals, and step-by-step status with HashScan links.
- **Keeper panel.** Compound and Rebalance, marked permissionless. Each shows a checklist of the contract's conditions
  (initialized, TWAP readable, spot within `maxTwapDeviation`, tokens to add or a position to rebalance, cooldown
  checked against chain time, TWAP outside the range, position fee quoted), the position fee, the HBAR sent, the gas
  limit and maximum gas cost, why an action is unavailable, and the resulting transaction and position.
- **Activity.** Deposits, withdrawals, fees collected, compounds and rebalances (old → new range) from the vault's
  last 50 mirror-node logs, with amounts and HashScan links. `CallResponseEvent` is hidden.

**Transactions.** `deposit` and `withdraw` are simulated before sending (the Scaffold-HBAR default). `compound` and
`rebalance` can mint a SaucerSwap position, which `eth_call`/`eth_estimateGas` cannot simulate on Hedera
(`INVALID_NFT_ID`), so the dashboard sends only these two with `disableSimulate: true` and a fixed 8,000,000 gas
limit, after the read-only checklist passes. If the state changes between the check and execution, the contract
reverts and only gas is charged. The dashboard sends `quoteMintFee()` + 0.1 HBAR; the vault refunds the unused part.

**Errors.** Vault custom errors (`PriceDeviation`, `CooldownActive`, `SlippageExceeded`, …) appear as plain-language
messages, and rejecting a request in the wallet shows "Transaction cancelled" rather than an error. This comes from
two small edits to the template's `utils/scaffold-hbar/getParsedError.ts` and `hooks/scaffold-hbar/useTransactor.tsx`.
When a keeper transaction reverts on chain, the panel looks up the reason on the mirror node.

## Using the vault

**Deposit.** Deposits are proportional to what the vault already holds (the first deposit sets the ratio) and sit
idle until the next compound, so depositing pays no SaucerSwap fee. In the dashboard: associate the tokens if
prompted, wrap HBAR if needed, enter an amount (the other side auto-fills), approve and deposit. From the CLI:
`yarn hardhat:smoke` (buys test tokens and deposits your balances) or `yarn hardhat:deposit` (exact amounts).

**Compound.** `yarn hardhat:compound`, or "Open position" / "Compound" in the dashboard's keeper panel. Both use a
fixed 8M gas limit, because a position mint cannot be pre-simulated on Hedera (`eth_estimateGas` returns
`INVALID_NFT_ID`). The CLI script sends `quoteMintFee()` + 1 HBAR, the dashboard `quoteMintFee()` + 0.1 HBAR; the vault
refunds the surplus either way.

**Withdraw.** `yarn hardhat:withdraw` (10% by default) or the dashboard's Withdraw tab. Approve the vault for your
shares, then withdraw: the vault collects fees, removes your share of the liquidity and idle balances, burns your
shares and sends WHBAR/SAUCE. Withdrawals do not check the TWAP, so you can always exit; your minimum amounts protect
you.

## Optional: narrow-vault rebalance demo

A rebalance only happens after the pool TWAP leaves the range. Doing that to the main vault (±600 ticks) would take
hundreds of HBAR of swaps, so the template includes a **separate test vault** with ±60 ticks and a 600 s cooldown
(`TIDEPOOL_NARROW`, deployed as `TidepoolVaultNarrow`). The main vault and its NFT are never touched.

> **Shared-pool warning.** Moving the price trades on the *shared* SaucerSwap WHBAR/SAUCE testnet pool. It moves the
> price for every LP and trader in that pool, including the main vault's position, until you swap back. Keep the move
> small and restore it afterwards.

```bash
# PowerShell: set variables with $env:NAME="value"; bash: NAME=value yarn ...
yarn hardhat:deploy:narrow                                             # deploy + initialize the test vault
TIDEPOOL_VAULT=TidepoolVaultNarrow DEPOSIT0=2 DEPOSIT1=93 yarn hardhat:deposit
TIDEPOOL_VAULT=TidepoolVaultNarrow yarn hardhat:compound               # opens the first position
TIDEPOOL_VAULT=TidepoolVaultNarrow DIRECTION=down AMOUNT=142.1 WRAP_HBAR_IF_NEEDED=true yarn hardhat:move-price
# wait until the TWAP (600 s window) has left the range and is within 50 ticks of spot (~7-10 minutes)
TIDEPOOL_VAULT=TidepoolVaultNarrow yarn hardhat:rebalance
TIDEPOOL_VAULT=TidepoolVaultNarrow DIRECTION=up AMOUNT=<SAUCE received> yarn hardhat:move-price   # restore the pool
```

The same flow in Windows PowerShell (variables persist for the session; `npm run` works the same way as `yarn`):
```powershell
yarn hardhat:deploy:narrow
$env:TIDEPOOL_VAULT="TidepoolVaultNarrow"; $env:DEPOSIT0="2"; $env:DEPOSIT1="93"; yarn hardhat:deposit
yarn hardhat:compound
$env:DIRECTION="down"; $env:AMOUNT="142.1"; $env:WRAP_HBAR_IF_NEEDED="true"; yarn hardhat:move-price
yarn hardhat:rebalance
$env:DIRECTION="up"; $env:AMOUNT="<SAUCE received>"; Remove-Item Env:WRAP_HBAR_IF_NEEDED; yarn hardhat:move-price
```

`hardhat:deploy:narrow` sets `TIDEPOOL_DEPLOY_NARROW=true` itself, inside Node (`scripts/runNarrowDeployWithPK.ts`), so it
needs no shell-specific syntax; every other deploy command leaves the narrow deploy script skipped.

Safety built into the scripts: `move-price` quotes with SaucerSwap's QuoterV2 and prints the resulting tick before
asking `yes`, and never wraps HBAR without `WRAP_HBAR_IF_NEEDED=true` plus a separate `yes`. `rebalance` has no
default vault, refuses the main vault without `ALLOW_MAIN_VAULT_REBALANCE=true`, runs read-only preflight checks
(initialized, position exists, cooldown elapsed, TWAP outside the range, |spot − TWAP| ≤ max deviation) and sends
nothing if any fails, then verifies the new NFT, range and the old NFT's zero liquidity after mining.
`AMOUNT=142.1` was sized for the pool state at the time of our test; re-quote before using it.

A narrow deployment adds a `TidepoolVaultNarrow` entry to `packages/nextjs/contracts/deployedContracts.ts` on every
later deploy; do not commit it. The dashboard's Narrow Demo Vault tab already reads this vault from
`packages/nextjs/contracts/externalContracts.ts`, whose entry takes precedence over a generated one with the same name.

## Live Hedera testnet evidence

All links are HashScan (testnet). IDs are public on-chain identifiers.

| Item | Reference |
|---|---|
| Main vault `TidepoolVault` | [`0x2d209297642C4bb27c30ef37Fb18bCF842D55624`](https://hashscan.io/testnet/contract/0x2d209297642C4bb27c30ef37Fb18bCF842D55624) (0.0.10710646) · share token 0.0.10710796 · LP NFT 0.0.1310436 #378 |
| Narrow test vault `TidepoolVaultNarrow` | [`0x91EdDBE42CFF874FdAFC2c1463Ca734A10C6E905`](https://hashscan.io/testnet/contract/0x91EdDBE42CFF874FdAFC2c1463Ca734A10C6E905) (0.0.10716411) · share token 0.0.10716482 |
| Pool (WHBAR/SAUCE 0.30%) | [`0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7`](https://hashscan.io/testnet/contract/0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7) (0.0.2661057) |

| Step | Transaction | Result |
|---|---|---|
| Main: initialize (associations + share token) | [`0x1dff79f5…6ef9`](https://hashscan.io/testnet/transaction/0x1dff79f5e1e395c0a14278265fd1aefff4d6161bae7e06c63e408bf0ade06ef9) | 2,313,512 gas |
| Main: deposit | [`0x0bf5cee5…4947`](https://hashscan.io/testnet/transaction/0x0bf5cee5c29d39a8265db2f2ccca438d9069a03c2510c75da3f629bb069d4947) | 20 WHBAR + 925.31 SAUCE |
| Main: first compound (mints NFT #378) | [`0xcb477c3b…8d3f`](https://hashscan.io/testnet/transaction/0xcb477c3bf895a49167bd05d6a67487c306e2e34dbcb47480a5d98c3cbeb08d3f) | range [−8340, −7140), 5,128,563 gas |
| Main: fee-bearing compound (`increaseLiquidity` on #378) | [`0xd157a337…6fcf`](https://hashscan.io/testnet/transaction/0xd157a33729021803d9ecb4e3bda04c0384dbed874fe35ad0dfc71bad58896fcf) | collected 137,667 WHBAR / 63,557 SAUCE units |
| Main: 10% withdraw | [`0xd9a6a9fd…eacf`](https://hashscan.io/testnet/transaction/0xd9a6a9fdd9f0f4f7a51b6d0b313944ac0006d34be5b34ccab89ebb82a53eaacf) | 360,910 gas |
| Narrow: first compound (mints NFT #380) | [`0x2285403b…93c6`](https://hashscan.io/testnet/transaction/0x2285403b1b13a3398825cc260bc96530efc9b62ebe782d1288b6aa15425093c6) | range [−7800, −7680) |
| Price move down (142.1 WHBAR → SAUCE) | [`0xf05334b2…1a48`](https://hashscan.io/testnet/transaction/0xf05334b2922d2ed8bf7a73ffbbead85afa9e43ddf27a8c278fb9e6da70301a48) | spot −7699 → −7850 |
| **Narrow: rebalance (#380 → #381)** | [`0x890be6b4…08aa`](https://hashscan.io/testnet/transaction/0x890be6b4eea509a050e8f1eabf7150b536748fc2403910cda3de755d44c608aa) | TWAP −7850 → range [−7920, −7800); #380 liquidity → 0; 5,257,516 gas |
| Restore: approve SAUCE | [`0x181dd5f3…1e4a`](https://hashscan.io/testnet/transaction/0x181dd5f3635fc3fe7200ea6203cc554e4e29e323693210e36cbf4d311b151e4a) | |
| Restore: swap back | [`0xf109b4c1…d796`](https://hashscan.io/testnet/transaction/0xf109b4c14b747d67a2e6d78d4b966d08dae3c6ff938ca39d8f59e8728575d796) | 6,518.359326 SAUCE → 141.42039494 WHBAR, spot back to −7700 |

The full log (including the first, gas-limited `initialize` attempt and the fee-generating swaps) is in
[`docs/ARCHITECTURE.md` §17a](docs/ARCHITECTURE.md).

## Known limitations and assumptions

- Not audited. Testnet only; mainnet addresses in the docs are untested.
- One pool per vault and one strategy (a fixed-width range around the TWAP).
- `compound()` and `rebalance()` are manual/permissionless calls; there is no scheduler or keeper included.
- Each compound/rebalance costs SaucerSwap's position fee (≈0.64 HBAR on testnet) plus ~5–6 HBAR of gas; compounding
  small fees loses money.
- The swap-to-ratio step ignores its own price impact, so some tokens can stay idle until the next compound (seen on
  testnet: 5.46 SAUCE on the main vault, 7.63 SAUCE on the narrow vault after rebalance).
- `getTotalAmounts()` excludes fees not yet collected.
- The dashboard's "Fees owed" is SaucerSwap's `tokensOwed` from `positions()`, which only changes when the position is
  touched (collect, increase or decrease liquidity). It is not the live claimable fee amount; exact pending fees need
  fee-growth maths the dashboard does not do. The activity feed's collected-fees total covers only the loaded events.
- Old LP NFTs remain in the vault with zero liquidity after a rebalance (they are not burned).
- `compound()`/`rebalance()` cannot be pre-simulated on Hedera (see above), so they use a fixed gas limit.
- The TWAP guard depends on the pool's observation history; pools with an observation cardinality of 1 cannot be used
  until it is increased.

## Licence

MIT — see [`LICENCE`](LICENCE). Uses `@uniswap/v4-core` MIT libraries, `@hiero-ledger/hiero-contracts` (Apache-2.0)
and OpenZeppelin (MIT) as dependencies; no GPL/BUSL code is copied.
