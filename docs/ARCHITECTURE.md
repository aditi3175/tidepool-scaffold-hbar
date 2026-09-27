# Tidepool — Architecture and Build Specification

> **A SaucerSwap V2 liquidity vault, packaged as a Scaffold-HBAR template.**
> Target: Hedera **Scaffold-HBAR Template Bounty** (submissions close **Sun 4 Oct 2026, 11:59 PM ET**).
> Document version 1.0 · research and verification done 24–25 Sep 2026.

---

## 0. How to use this document

This file is the single source of truth for building Tidepool from an empty directory to a submitted,
gate-passing template. It is written so that a developer **or an AI coding agent** can follow it top to
bottom without outside context.

- **Section 9 contains the complete source code.** Every Solidity, TypeScript and config listing in it
  was compiled, linted, type-checked, unit-tested and (for the frontend) production-built on 25 Sep 2026
  inside a real `npm create scaffold-hbar@latest` project. Copy it exactly. The same files also sit
  next to this document in `reference-implementation/`.
- **Every factual claim carries an evidence tag:**

| Tag | Meaning |
|---|---|
| **[CHAIN]** | Checked against Hedera **testnet** directly (mirror node REST or `eth_call` through `testnet.hashio.io`) on 24–25 Sep 2026. |
| **[SRC]** | Read in source code: SaucerSwap V2 repos, `hiero-contracts`, `create-scaffold-hbar` CLI, Uniswap v4-core, the Scaffold-HBAR blank template. |
| **[DOCS]** | Stated in official documentation (Hedera, SaucerSwap, Sourcify). |
| **[BUILD]** | Proven by running it: compile, unit tests, lint, `next build`, route checks, Zod validation. |
| **[SPIKE]** | **Not yet proven on a live network.** Must be confirmed on Day 1 (section 15). Treat it as a risk until then. |

All items originally tagged [SPIKE] were proven on Hedera testnet on 25 Sep 2026 and are now tagged [CHAIN]; the
transactions are listed in section 17a.

- If reality disagrees with this document (an address changed, a package version moved), **reality wins**:
  re-verify with the commands given, fix the document, and continue.

---

## 1. The product

### 1.1 Problem

A SaucerSwap V2 position is *concentrated*: it earns swap fees only while the pool price is inside the
position's tick range. When the price leaves the range, the position earns nothing. SaucerSwap's own docs
note that V2 fees "do not compound automatically" [DOCS]: they accrue as `tokensOwed` until someone calls
`collect`, and someone has to put them back to work.

So every Hedera token team, DAO treasury or protocol that owns liquidity has to watch its range, collect fees,
re-add them, and re-centre the range by hand. Each re-add costs a SaucerSwap position fee (paid in HBAR), so
naive automation can lose money.

### 1.2 Solution

**Tidepool** is a vault contract that:

1. holds **one** SaucerSwap V2 position NFT for **one** pool;
2. issues depositors a **native HTS fungible share token**, created by the vault itself through the HTS
   system contract (`0x167`);
3. **compounds**: collects fees, swaps idle balances to the range's ratio through the SaucerSwap router,
   and adds them to the position;
4. **rebalances**: when the pool's **time-weighted average price (TWAP)** leaves the range, it withdraws
   everything, re-centres a fixed-width range on the TWAP tick, swaps to the right ratio, and mints a new position;
5. refuses to act when the spot price has been pushed away from the TWAP (sandwich guard).

`compound()` and `rebalance()` are **permissionless**. Whoever calls them pays SaucerSwap's HBAR position fee via
`msg.value`, and the vault refunds any excess. There is **no owner, no admin key, no upgrade path**. The only
privileged call is the one-time `initialize()` by the deployer.

A Next.js dashboard draws the range, spot and TWAP ticks, lets users associate tokens, wrap HBAR, deposit,
withdraw, compound and rebalance, and shows history read from the Hedera mirror node.

### 1.3 Who it is for

| User | What they get |
|---|---|
| **Builders** (the bounty's audience) | A small, MIT-licensed, documented reference for "a contract that owns and manages a SaucerSwap V2 position", including every Hedera-specific trap. |
| Token teams / DAOs / protocols | A starting point for protocol-owned liquidity that tends itself. |
| Depositors | A share token that represents a managed position. |

### 1.4 Why this is load-bearing Hedera + SaucerSwap work

- **Without SaucerSwap V2, nothing is left.** The template uses SaucerSwap's factory (`getPool`, `mintFee`), pool
  (`slot0`, `observe`, `tickSpacing`), NonfungiblePositionManager (`mint`, `increaseLiquidity`, `decreaseLiquidity`,
  `collect`, `positions`) and SwapRouter (`exactInputSingle`). The TWAP comes from the pool's own oracle.
- **Hedera-native services:** HTS share token created, minted and burned by the contract (`0x167`); HTS association
  of the vault to both pool tokens and to the LP **NFT** (SaucerSwap positions are HTS NFTs); HIP-719 association from
  EVM wallets; the exchange-rate system contract (`0x168`) to convert SaucerSwap's tinycent fee into tinybars on-chain;
  WHBAR handling via SaucerSwap's WhbarHelper; history from the mirror node REST API.

### 1.5 Prior art and positioning

- SaucerSwap runs "auto pools" in its app, and Bonzo runs Beefy-style CLM vaults on mainnet. Tidepool does not
  compete with them. That they exist is the evidence that the pattern is needed. Tidepool is the small,
  **MIT-licensed, forkable** version that builders can own.
- As of 24 Sep 2026, no public Scaffold-HBAR bounty entry manages a liquidity position. Entries touching SaucerSwap
  swap, quote or seed a pool once.
- Credit in the README: SaucerSwap V2 (Uniswap v3 fork), Uniswap v4-core maths (MIT), `hiero-contracts` (Apache-2.0).

### 1.6 Non-goals (keep scope honest)

- One pool per vault, one strategy (fixed width, re-centre on TWAP). No strategy plug-ins.
- No single-sided "zap" deposits, no LARI reward handling, no HSS automation (keepers are documented instead).
- No mainnet deployment claims. The template ships mainnet addresses only as documentation (section 3.4).

---

## 2. Bounty fit

### 2.1 Eligibility gate (pass/fail) and how Tidepool meets each item

| Gate item (from the brief) | How Tidepool passes | Evidence |
|---|---|---|
| Scaffolds via `npm create scaffold-hbar@latest --template owner/repo` | Repo root has the same shape as the official blank template (yarn-form scripts, `template.json`, `packages/hardhat`, `packages/nextjs`). Dry run from GitHub on Day 9. | [SRC] CLI downloads `owner/repo[#ref]` with giget |
| Valid `template.json` | Section 9.1; validated against the CLI's own Zod schema. | [BUILD] |
| `README.md` and `AGENTS.md` | Both in the repo root (AGENTS.md full text in 13.1). | [SRC] |
| Install, lint, build pass from a fresh scaffold | Root `.npmrc` with `legacy-peer-deps=true`; webpack alias for x402 optional peers; CI workflow. | [BUILD] |
| App boots, core routes OK | `/`, `/debug`, `/blockexplorer`, `/api/hedera/account` → 200. | [BUILD] |
| One verifiable testnet transaction + HashScan link | Many, listed in section 17a and the README (e.g. deposit `0x0bf5cee5…4947`, rebalance `0x890be6b4…08aa`). | [CHAIN] |
| No secrets / `.env` committed | Deployer key is encrypted into `packages/hardhat/.env` by the template's own scripts; `.env` is gitignored. | [SRC] |
| MIT licence, original work | All Tidepool code is original MIT. Third-party code is **imported as npm dependencies**, never copied: `@uniswap/v4-core` (only files whose SPDX header is MIT), `@hiero-ledger/hiero-contracts` (Apache-2.0), OpenZeppelin (MIT). | [SRC] |
| Harness spec + validators if the Harness was used | Only if you use Hedera Harness. If you do, commit its spec and validators. | — |

### 2.2 Rubric (100 points) and where Tidepool earns them

| Criterion | Pts | Tidepool's answer |
|---|---|---|
| Ecosystem integration and value | 35 | SaucerSwap V2 is the product: factory, pool oracle, position manager, router. Removing it leaves nothing. A builder gains "a contract that manages a CL position", which is hard to build alone. |
| Docs quality | 30 | README with a 60-second path, range-maths explainer, "when does compounding pay", and the Hedera landmines (section 7), each with a reproduction. |
| Code quality | 20 | ~530-line vault, no owner, custom errors, reentrancy guard, 17 unit tests incl. inflation-attack and sandwich-guard tests, CI. |
| Hedera service depth | 15 | HTS token created, minted and burned by a contract; contract self-association incl. an HTS **NFT**; HIP-719; `0x168` exchange rate; tinybar/weibar; WHBAR helper; mirror node. |

The brief's rubric wording is authoritative. Read it again before submitting.

---

## 3. Verified facts register

### 3.1 SaucerSwap V2 on Hedera testnet [CHAIN] (24 Sep 2026)

| Contract / token | Hedera ID | EVM address | Checked |
|---|---|---|---|
| SaucerSwapV2Factory | 0.0.1197038 | `0x00000000000000000000000000000000001243ee` | `mintFee()` = **500000000** tinycents (5 US cents); `feeAmountTickSpacing`: 500→10, 1500→30, 3000→60, 10000→200 |
| NonfungiblePositionManager | 0.0.1308184 | `0x000000000000000000000000000000000013f618` | `nft()` = 0.0.1310436; `WHBAR()` = 0.0.15057; `whbar()` = 0.0.15058; `factory()` = 0.0.1197038 |
| SwapRouter | 0.0.1414040 | `0x0000000000000000000000000000000000159398` | `WHBAR()`, `whbar()`, `factory()` as above; used by traders 22–23 Sep |
| QuoterV2 | 0.0.1390002 | `0x00000000000000000000000000000000001535b2` | exists |
| LP NFT (HTS) | 0.0.1310436 | `0x000000000000000000000000000000000013fee4` | — |
| WHBAR contract | 0.0.15057 | `0x0000000000000000000000000000000000003ad1` | **do not call directly** (section 7.9) |
| WHBAR token (HTS, 8 dp) | 0.0.15058 | `0x0000000000000000000000000000000000003ad2` | — |
| SAUCE token (HTS, 6 dp) | 0.0.1183558 | `0x0000000000000000000000000000000000120f46` | — |
| USDC (SaucerSwap testnet, 6 dp) | 0.0.5449 | `0x0000000000000000000000000000000000001549` | not Circle's testnet USDC (0.0.429274) |
| **WhbarHelper** | 0.0.5286055 | `0x000000000000000000000000000000000050a8a7` | `deposit()` (`0xd0e30db0`) and `unwrapWhbar(uint256)` (`0xa65292ae`) called on 21 and 25 Sep |

### 3.2 The demo pool [CHAIN]

| Pool | Address | token0 / token1 | Fee | Spacing | Tick | Liquidity | Observation cardinality |
|---|---|---|---|---|---|---|---|
| **WHBAR/SAUCE** (use this) | `0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7` | WHBAR / SAUCE | 3000 | 60 | −7665 | 1.204e12 | **1000** (oldest observation ≈ 90 days old) |
| WHBAR/USDC | `0x914B98992d7eD602D1f5d9084ECe8160Fc0e741a` | USDC / WHBAR | 3000 | 60 | 38874 | 1.200e11 | **1** |

- On WHBAR/SAUCE, `observe([600,0])`, `observe([1800,0])` and `observe([3600,0])` all returned sane mean ticks (−7665, −7664, −7661).
- Tick −7665 ≈ 1.0001^−7665 × 10^(8−6) ≈ **46.5 SAUCE per HBAR** on testnet.
- **Testnet prices are not market prices.** The WHBAR/USDC testnet pool implies ≈ $2.05/HBAR while the
  exchange-rate system contract says ≈ $0.078. Irrelevant for LP maths; say so in the UI (the page does).

### 3.3 Hedera platform facts

| Fact | Evidence |
|---|---|
| `0x168.tinycentsToTinybars(500000000)` = **64079561** tinybars (≈ 0.64 HBAR) at testnet's rate (1 HBAR = 7.8028 ¢) | [CHAIN] `eth_call` |
| So **each compound or rebalance costs ≈ 0.64 HBAR** in SaucerSwap position fees on testnet | derived |
| JSON-RPC `msg.value` has **18 decimals** (weibar), the EVM and HAPI have **8** (tinybar); relay converts | [DOCS] docs.hedera.com "HBAR" page |
| Fees: TokenCreate $1.00, TokenMint/Burn $0.001, TokenAssociate $0.05, EVM dispatch surcharge +20%, gas $0.0000000852/unit | [DOCS] mainnet fees page |
| HTS token amounts are `int64` | [SRC] `IHederaTokenService.mintToken(address,int64,bytes[])` |
| HIP-719: EVM accounts can call `associate()` / `isAssociated()` on an HTS token address | [SRC] `hiero-contracts/token-service/IHRC719.sol` |
| New auto-created (hollow / EVM-alias) accounts get `max_automatic_token_associations = -1` (unlimited); portal-created ED25519 accounts showed `0` | [CHAIN] mirror node; [DOCS] HIP-904 |
| viem's `hederaTestnet` chain has **no multicall3** entry, so wagmi batches become individual `eth_call`s | [SRC] `viem/chains/definitions/hederaTestnet.js` |
| Sourcify v1 endpoints return **404**; v2 (`/v2/verify/{chainId}/{address}`) works | [CHAIN] curl, 25 Sep |

### 3.4 Mainnet addresses (documentation only) [DOCS]

Factory 0.0.3946833 · SwapRouter 0.0.3949434 · QuoterV2 0.0.3949424 · NonfungiblePositionManager**V2** 0.0.4053945
(LP NFT 0.0.4054027; the older manager 0.0.3949448 is deprecated) · WHBAR contract 0.0.1456985 / token 0.0.1456986 ·
WhbarHelper 0.0.5808826. Not tested by this project.

### 3.5 Scaffold-HBAR facts [SRC][BUILD]

| Fact | Consequence |
|---|---|
| CLI `create-scaffold-hbar@0.4.0`; Node **≥ 20.18.3**; git `user.name`/`user.email` must be set | Put in README prerequisites. |
| `template.json` Zod schema **requires top-level `"name"`**; `packageManager` enum is `yarn \| npm \| none` | The docs' example (no `name`, uses `"pnpm"`) **fails validation twice**. Use section 9.1. |
| `template.json` supports `name`, `description`, `version`, and under `create-scaffold-hbar`: `capabilities`, `defaults`, `requirements`, `envVars`, `rename`, `outro.sections` | The CLI deletes `template.json` after scaffolding. |
| Outro placeholders: `{run:script}` → `npm run script` / `yarn script`; `{run:framework:x}` | Only reference root scripts that exist. |
| Templates are authored in **yarn form** (`yarn workspace @sh/hardhat deploy`); for npm the CLI rewrites to `npm run deploy -w @sh/hardhat --` and deletes `.yarnrc.yml`, `.yarn`, `yarn.lock`, `.husky` | Author root scripts like section 9.2. |
| With npm, `npm run hardhat:deploy --network X` **drops `--network`** (npm eats the flag) | Ship `hardhat:deploy:testnet`; document `-- --network`. |
| A fresh blank scaffold with npm **fails `npm install`** with ERESOLVE (`@nomicfoundation/hardhat-verify@2.1.3` wants `hardhat ^2.26.0`, template pins 2.22.19). The template's `packages/hardhat/.npmrc` is **ignored** by npm for workspace installs | Commit a **root** `.npmrc` with `legacy-peer-deps=true`. |
| A fresh blank scaffold **fails `next build`**: wagmi → `@base-org/account` → `@coinbase/cdp-sdk@1.56.0` (published 14 Sep 2026) imports optional peers `@x402/*` that are not installed | webpack `resolve.alias` to `false` for `@x402/core`, `@x402/evm`, `@x402/svm`, `@x402/extensions` (section 9.4). |
| `hardhat.config.ts` forks testnet for the in-process `hardhat` network unconditionally | Make forking opt-in (`enabled: HEDERA_FORKING === "true"`) so unit tests run offline. |
| The hedera-forking plugin emulates **HTS only** (not `0x168`, not the schedule service) | SaucerSwap's `pool.mint` calls `0x168`, so fork tests of minting would fail; use mocks + live smoke tests instead. |
| Hardhat compiles with solc 0.8.28, evm target **paris** | Deployed bytecode 19,048 bytes (< 24,576). |

---

## 4. System architecture

### 4.1 Component diagram

```
                           ┌──────────────────────────────────────────────┐
  Browser (Next.js)        │  Hedera testnet                              │
 ┌──────────────────┐      │                                              │
 │ Dashboard        │ JSON-RPC (hashio)                                   │
 │  RangeChart      │─────►│  TidepoolVault ──────────┐                   │
 │  Deposit/Withdraw│      │   │ HTS 0x167: create/mint/burn share token  │
 │  Keeper          │      │   │           associate token0/1 + LP NFT    │
 │  ActivityFeed    │      │   │ 0x168: tinycents → tinybars              │
 └──────┬───────────┘      │   │                                          │
        │  REST            │   ├─► SaucerSwap V2 Pool  (slot0, observe)   │
        ▼                  │   ├─► NonfungiblePositionManager            │
 Hedera mirror node        │   │     mint / increase / decrease / collect │
 /contracts/{vault}/       │   │     (LP position = HTS NFT 0.0.1310436)  │
   results/logs            │   └─► SwapRouter.exactInputSingle           │
                           │                                              │
 Wallet (MetaMask etc.) ──►│  Token facades (HIP-719 associate, ERC-20)   │
                           │  WhbarHelper.deposit()  (wrap HBAR)          │
                           └──────────────────────────────────────────────┘
```

### 4.2 Trust model

- **Immutable vault.** All parameters are constructor immutables. There is no owner, no pause, no fee switch.
- **Deployer power:** only `initialize()` (once). It cannot touch funds.
- **Price trust:** the vault trusts the pool's `slot0` and `observe`. The constructor verifies that the pool is the
  factory's canonical pool for its tokens and fee, and that the router uses the same factory.
- **Keepers are untrusted.** They can only trigger actions whose preconditions the contract checks (TWAP deviation,
  out-of-range, cooldown). The worst a hostile keeper can do is pay SaucerSwap's fee for us.

### 4.3 State machine

```
 deployed ──initialize()──► ready (no position, totalShares = 0)
 ready ──deposit()──► holding idle tokens (shares minted)
 idle ──compound()──► position #N open (range centred on TWAP)
 position open ──deposit()──► idle grows (no fee charged)
 position open ──compound()──► fees + idle added to position #N
 position open & TWAP out of range & cooldown over ──rebalance()──► position #N+1, old NFT kept with 0 liquidity
 any ──withdraw()──► pro-rata slice of position + idle returned, shares burned
```

---

## 5. Concepts primer (read before touching the maths)

- **Tick.** Price = 1.0001^tick (token1 per token0, in raw units). Human price = 1.0001^tick × 10^(dec0 − dec1).
- **sqrtPriceX96.** √price × 2^96, a Q64.96 fixed-point number. `token0ToToken1(x) = x·s²/2^192`, computed as two `mulDiv`s.
- **Liquidity L** for a range [a, b) at price p (all as √prices):
  - p ≤ a: all token0, `amount0 = L·(b−a)/(a·b)`
  - a < p < b: `amount0 = L·(b−p)/(p·b)`, `amount1 = L·(p−a)`
  - p ≥ b: all token1, `amount1 = L·(b−a)`
  Tidepool uses v4-core `SqrtPriceMath.getAmount0Delta/getAmount1Delta` for these.
- **Range convention.** A position is active when `tickLower ≤ tick < tickUpper`. Ticks must be multiples of `tickSpacing`.
- **TWAP tick.** Mean of `tickCumulative` over a window: `(c[now] − c[now−w]) / w`, rounded toward −∞.
  Needs enough observation history (`observationCardinality`).
- **Why compare spot to TWAP.** An attacker can move spot within one transaction, but not the TWAP. Acting only when
  |spot − TWAP| ≤ `maxTwapDeviation` stops sandwich-driven bad re-centres and deposits at manipulated prices.
- **Fee accounting.** Fees accrue in the pool and are credited to `tokensOwed` only when the position is "poked"
  (`collect` does `pool.burn(…, 0)` first when liquidity > 0).
- **SaucerSwap position fee.** Unlike Uniswap, SaucerSwap charges `factory.mintFee()` tinycents, paid in HBAR, on
  every `mint` and every `increaseLiquidity` [SRC `LiquidityManagement.addLiquidity`]. Removing liquidity and
  collecting are free.

---

## 6. Smart contract design

### 6.1 Files

| File | Role | Lines |
|---|---|---|
| `contracts/tidepool/TidepoolVault.sol` | The vault | ~530 |
| `contracts/tidepool/libraries/RangeMath.sol` | TWAP consult, range snapping, liquidity amounts, swap-to-ratio | ~115 |
| `contracts/tidepool/interfaces/ISaucerSwapV2.sol` | Minimal factory / pool / manager / router interfaces | ~160 |
| `contracts/tidepool/test/Mocks.sol` | Test doubles (never deployed live) | ~300 |

Dependencies: OpenZeppelin 5.6.1 (already in the template), `@uniswap/v4-core@1.0.2` (`FullMath`, `TickMath`,
`SqrtPriceMath`: all SPDX **MIT**), `@hiero-ledger/hiero-contracts@0.2.0` (`HederaTokenService`,
`IHederaTokenService`, `HederaResponseCodes`, `IExchangeRate`).

### 6.2 Parameters (constructor `Config`) and testnet values

| Param | Testnet value | Meaning / validation |
|---|---|---|
| `pool` | WHBAR/SAUCE 0.30% | must equal `factory.getPool(token0, token1, fee)` |
| `positionManager` | 0.0.1308184 | its `factory()` is the factory used above |
| `swapRouter` | 0.0.1414040 | `router.factory()` must match |
| `halfWidth` | 600 | ticks each side (≈ ±6.2% price); > 0 and a multiple of `tickSpacing` |
| `twapWindow` | 600 s | > 0; the pool must have that much history |
| `maxTwapDeviation` | 50 ticks (≈ 0.5%) | > 0 |
| `rebalanceCooldown` | 3600 s | minimum gap between rebalances |
| `swapSlippageBps` | 100 | < 10 000; applied on top of the pool fee to the TWAP-priced minimum output |

Constants: `SHARE_DECIMALS = 8`, `INITIAL_SHARES = 1e10` (100.00000000 shares), `DEAD_SHARES = 1e5`,
share token auto-renew period 7 776 000 s (90 days).

### 6.3 Function-by-function flows

**`initialize(name, symbol)` payable, deployer only, once**
1. `associateTokens(this, [token0, token1, positionNft])` via `0x167` → must return 22 (SUCCESS).
2. `createFungibleToken` with treasury = vault, supply key = `contractId(vault)`, auto-renew account = vault,
   initial supply 0, decimals 8. `msg.value` is forwarded (HederaTokenService helper does `call{value: msg.value}`).
3. Standing allowances: `forceApprove(positionManager)` and `forceApprove(swapRouter)` on token0 and token1, each
   `type(int64).max` (HTS allowances are int64, so `type(uint256).max` is not valid). Paid once here (~705k gas
   each) instead of six approvals on every compound/rebalance.
4. Any HBAR left in the vault is refunded to the deployer. Deploy script sends **30 HBAR**
   (TokenCreate $1.00 + 20% ≈ 15.4 HBAR at 7.8 ¢/HBAR, with headroom). [CHAIN]: the token creation kept 15.27009466 HBAR
   and the vault refunded 14.72990534 HBAR, on both testnet vaults. `initialize` used ~2.31M gas (three associations)
   before the standing approvals were added; with them it is estimated at ~5.14M (2.31M + 4 × 705k, not yet measured).
   The deploy scripts use an 8M limit.

**`deposit(amount0Max, amount1Max, minShares, receiver)`**
1. Requires initialized; `_checkedPrices()` (spot within `maxTwapDeviation` of TWAP).
2. `_collectFees()` so fees count in the share price.
3. First deposit: takes both maxes (both must be > 0), mints `INITIAL_SHARES`, gives the depositor
   `INITIAL_SHARES − DEAD_SHARES`; the dead shares stay in the vault's treasury balance forever.
4. Later deposits: `total0/total1` = position principal at spot + idle balances;
   `shares = min(a0·S/T0, a1·S/T1)` (one-sided if a total is 0); amounts = `ceil(shares·T/S)`.
5. `shares ≥ minShares`, pull tokens with `transferFrom` (user approved the vault), transfer shares to `receiver`.
6. No HBAR fee: deposits wait idle until the next `compound()`.

**`withdraw(shares, amount0Min, amount1Min, receiver)`**
1. `_collectFees()`, then idle slice = `balance·shares/S`.
2. If a position exists: `decreaseLiquidity(L·shares/S)` + `collect` → add to the slice.
3. Check mins, pull shares back into the treasury (user approved the vault on the share token), `burnToken`, send tokens.
4. **No TWAP check** so users can always exit. Mins protect them.

**`compound()` payable**
1. `_checkedPrices()`, `_collectFees()`.
2. No position yet: revert `NothingToCompound` if both idle balances are 0; otherwise range = `rangeAround(twapTick)`,
   swap to ratio, `mint`, set `lastRebalance`, emit `Rebalance(…,0,0,…)`.
3. Otherwise: revert `OutOfRange(twapTick)` if the TWAP tick is outside `[tickLower, tickUpper)` (that case is
   `rebalance()`'s job; adding to an out-of-range position would swap everything to one token); swap idle to the
   current range's ratio, `increaseLiquidity` with all idle (`NothingToCompound` if nothing is idle).
4. Fee: `quoteMintFee = tinycentsToTinybars(mintFee) + 1` must be ≤ `msg.value`; exactly that is forwarded; the rest is refunded.

**`rebalance()` payable**
1. Position exists; cooldown elapsed; `_checkedPrices()`; **TWAP tick outside** `[tickLower, tickUpper)`.
2. Collect fees, remove all liquidity, collect principal.
3. New range around the TWAP tick, swap to ratio (min out from TWAP price − fee − slippage), `mint`, refund surplus HBAR.
4. The old NFT stays in the vault with zero liquidity (burning it would need an NFT approval to the manager; listed as an extension).

**Views:** `getTotalAmounts()` (principal at spot + idle; excludes uncollected fees), `getPriceState()` (spot, TWAP, in-range),
`quoteMintFee()` (non-view because `IExchangeRate` is declared non-view; call it with `eth_call`/`simulateContract`).

### 6.4 Why exactly `tinycentsToTinybars(fee) + 1` (the WHBAR pay trap) [SRC]

SaucerSwap's `PeripheryPayments.pay()` does:
```
if (token == whbar && address(this).balance >= value) → wrap the manager's own HBAR and pay with it
else if (payer == address(this)) → pay from the manager's token balance
else → transferFrom(payer, pool, value)
```
`addLiquidity` first sends `hbarMintFee = tinycentsToTinybars(mintFee) + 1` to the pool. If the vault sent more HBAR
than that, the leftover would sit on the manager during the mint callback, and if it covered the WHBAR owed, the
manager would **wrap the caller's HBAR instead of pulling the vault's WHBAR**. Anyone can then take leftover HBAR
through the public `refundETH()`. Sending exactly the fee leaves the manager's balance at zero, so it always pulls WHBAR.
Both computations run in the same transaction against the same `0x168` rate, so they are equal.

### 6.5 Invariants

1. `totalShares` equals the share token's HTS total supply (every mint/burn goes through `_mintShares`/`_burnShares`).
2. `totalShares ≥ DEAD_SHARES` once anyone has deposited.
3. The vault holds no HBAR at rest (all fee HBAR is forwarded or refunded in the same call).
4. The vault's only token allowances are the standing `type(int64).max` allowances on token0 and token1 to the
   immutable `positionManager` and `swapRouter`, granted once in `initialize()`. No function grants, raises or
   clears an allowance after that. (The manager and router are SaucerSwap contracts checked in the constructor:
   the pool must come from the manager's factory and the router must report the same factory.)
5. `tickLower`/`tickUpper` are multiples of `tickSpacing`, `tickLower < tickUpper`.

### 6.6 Threat model

| Threat | Mitigation |
|---|---|
| Sandwich a rebalance or compound to force a bad range or swap | Spot-vs-TWAP guard; swap `amountOutMinimum` priced at TWAP; range centred on TWAP, not spot. |
| Deposit at a manipulated price | Spot-vs-TWAP guard on deposit; proportional deposits get a fair basket at any price. |
| First-depositor share inflation | Fixed 1e10 initial shares + 1e5 dead shares; test proves a large donation leaves the victim at ~50%. |
| Fake pool/router | Constructor checks `factory.getPool` and `router.factory()`. |
| Reentrancy via callbacks | `nonReentrant` on all external state-changing functions; HTS/SaucerSwap do not call back into the vault. |
| Keeper griefing (calling repeatedly) | Caller pays the ≈ 0.64 HBAR fee each time; rebalance cooldown. |
| Oracle unavailable | `TwapUnavailable` → deposit/compound/rebalance stop; **withdraw still works**. |
| HBAR stuck | Exact-fee forwarding + refunds; `initialize` refunds leftovers. |
| Standing allowances to manager and router | Both addresses are immutable and checked against the SaucerSwap factory in the constructor; the vault trusts SaucerSwap's manager and router code (it already holds its position in them). Allowance is `type(int64).max` per token and decreases as it is spent: ~9.2e10 WHBAR (8 dp) or ~9.2e12 SAUCE (6 dp) before it would run out; there is no function to top it up. |
| int64 overflow of shares | `SafeCast.toInt64` reverts. Headroom: ~9.2e8× growth over the first deposit. |
| Rounding | Deposits round amounts **up**, withdrawals round **down**, both in the vault's favour. |

Known limitations (put them in the README): uncollected fees are excluded from `getTotalAmounts()` until the next
collect; a rebalance swap ignores price impact (leftovers stay idle until the next compound); empty old NFTs accumulate;
not audited.

---

## 7. Hedera and SaucerSwap landmines (docs gold)

Each item includes how to reproduce it. These go into the README "Hedera gotchas" chapter.

1. **Position fee in tinycents, paid in HBAR, on every mint and increase.** Reproduce:
   `cast`-style `eth_call` of `mintFee()` on the factory (500000000) and `tinycentsToTinybars(500000000)` on `0x168`
   (≈ 64 079 561 tinybars). Consequence: compounding dust loses money. Rule of thumb for the README:
   compound only when collected fees are worth more than the fee (≈ $0.05) plus gas, i.e. roughly
   `fees_usd > 0.05 / (1 − swap_fee)`, plus the ~0.3% swap on the unbalanced part.
2. **The WHBAR pay trap** (section 6.4): send exactly the fee.
3. **LP NFT association.** The manager mints the NFT to itself, then `IERC721(nft).transferFrom(manager, recipient, sn)`;
   an unassociated recipient fails. The vault associates in `initialize()`.
4. **HTS amounts are int64.** A share token with 18 decimals would cap supply at ~9.2 tokens. Use 8.
5. **Share receivers need association** (or free auto-association slots). HIP-719 `associate()` from the wallet.
   Read `isAssociated()` with `account` set; through a multicall contract it would answer for the multicall contract.
6. **weibar vs tinybar.** UI sends `value` in weibar (×1e10 of tinybars). The official blank template's local-only
   token-creation script sends `100_000_000n` "1 HBAR", which is 1 HBAR only on a local Hardhat fork; through the relay
   it is 1e-10 HBAR.
7. **TWAP availability.** WHBAR/USDC has observation cardinality 1: after any swap, `observe([w,0])` reverts `OLD`.
   Fix permissionlessly with `pool.increaseObservationCardinalityNext(n)` and wait for history to build.
8. **GPL/BUSL trap.** SaucerSwap V2 periphery is GPL-2.0 and core is BUSL-1.1 [SRC]. Uniswap v3's `TickMath`,
   `LiquidityAmounts`, `OracleLibrary` are GPL. Copying them breaks "MIT, original work". Import MIT v4-core files instead.
9. **WHBAR contract advisory.** SaucerSwap's docs warn: do not interact with or approve the WHBAR *contract*
   (0.0.15057); use **WhbarHelper**. Approving the WHBAR *token* (0.0.15058) to the manager or router is normal.
10. **Sourcify v1 is gone.** `hardhat verify` (hardhat-verify 2.1.3) calls `/check-all-by-addresses` and `/verify`,
    which return 404. Use `scripts/verifySourcify.ts` (APIv2).
11. **npm install ERESOLVE** on a fresh scaffold; the workspace `.npmrc` is ignored. Root `.npmrc` fixes it.
12. **`next build` breaks on `@x402/*` optional peers** since `@coinbase/cdp-sdk@1.56.0`; webpack alias fix.
13. **npm eats `--network`**: use `npm run hardhat:deploy -- --network hederaTestnet` or the provided `hardhat:deploy:testnet`.
14. **Hardhat forking is always on** in the template config; unit tests must turn it off.
15. **Testnet prices are fake.** Explain it next to any price.
16. **HTS association from a contract is paid in gas, and it is expensive.** Found live on Day 1 (tx `0xe13de31b…53cc`): `initialize()` with a 2,000,000 gas limit failed. The child `TOKENASSOCIATE` record says `INSUFFICIENT_GAS` (code 30), and the hiero `HederaTokenService` helper surfaced it as `HtsCallFailed(21)` (`UNKNOWN`) because the failed call returned no decodable code. Each association costs about 650–700k gas (≈ $0.05 + 20%), so three need about 2M. `eth_estimateGas` returned 2,511,738, and the deploy script now uses 5,000,000. Debug this kind of failure with the mirror node: `/api/v1/contracts/results/{hash}/actions` shows the system call's output, and `/api/v1/transactions/{id}` lists the child records with their real response codes. Also observed: an EVM-deployed contract gets `max_automatic_token_associations = -1`.

---

## 8. Repository layout

The repo is authored in **yarn form**, exactly like `hedera-dev/scaffold-hbar` branch `templates/blank-template`,
minus Foundry and minus the sample contracts. The CLI converts it for npm users.

```
tidepool/                                 (GitHub: <you>/tidepool, public, MIT)
├── .github/workflows/ci.yml              section 9.13
├── .agents/  .claude/  .husky/           copied from the blank template (unchanged)
├── .yarn/  .yarnrc.yml  yarn.lock        from the blank template; yarn.lock regenerated
├── .gitignore  .lintstagedrc.js          from the blank template
├── .npmrc                                legacy-peer-deps=true   (NEW, root)
├── AGENTS.md                             section 13.1 (replaces the blank one)
├── CLAUDE.md                             unchanged ("@AGENTS.md")
├── LICENCE                               MIT, your name
├── README.md                             submission README (section 13.2)
├── docs/ARCHITECTURE.md                  this document
├── package.json                          section 9.2 (yarn form)
├── template.json                         section 9.1
└── packages/
    ├── hardhat/
    │   ├── .npmrc  .gitignore  eslint.config.mjs  tsconfig.json   (unchanged)
    │   ├── hardhat.config.ts             section 9.3 (one change: forking opt-in)
    │   ├── package.json                  section 9.3
    │   ├── tidepool.config.ts            section 9.6
    │   ├── contracts/tidepool/
    │   │   ├── TidepoolVault.sol         section 9.5
    │   │   ├── interfaces/ISaucerSwapV2.sol
    │   │   ├── libraries/RangeMath.sol
    │   │   └── test/Mocks.sol
    │   ├── deploy/00_deploy_tidepool_vault.ts            main vault
    │   ├── deploy/01_deploy_tidepool_vault_narrow.ts     rebalance demo vault (opt-in: TIDEPOOL_DEPLOY_NARROW=true)
    │   ├── scripts/                      template account scripts + runScriptWithPK, tidepoolScriptUtils, tidepoolSmoke,
    │   │                                 tidepoolCompound, tidepoolWithdraw, tidepoolDeposit, tidepoolMovePrice,
    │   │                                 tidepoolRebalance, simulateTraders, verifySourcify
    │   ├── test/TidepoolVault.test.ts
    │   └── utils/getDeployGasPrice.ts    (unchanged)
    └── nextjs/
        ├── next.config.ts                section 9.4 (x402 alias)
        ├── contracts/deployedContracts.ts   GENERATED by deploy, then COMMITTED (testnet vault)
        ├── app/page.tsx                  section 9.11
        ├── app/_components/tidepool/*    section 9.11
        ├── hooks/tidepool/*              section 9.10
        └── utils/tidepool/*              section 9.9
```

**Delete from the blank template:** `packages/foundry/` (and its workspace entry), `contracts/HederaToken.sol`,
`contracts/HtsTokenCreator.sol`, `contracts/interfaces/IHederaTokenService.sol`, `deploy/00_…`–`02_…`,
`test/HederaToken.test.ts`, `test/HtsTokenCreator.test.ts`, the old `.github/workflows/*` and `.gitmodules`
(it only lists Foundry submodules).

---

## 9. Source code (verbatim, verified)

> Everything below compiled with solc 0.8.28, passed `hardhat test` (17/17), `eslint` (0 warnings),
> `prettier --check`, `tsc --noEmit` (both packages), `next lint` (0), and `next build`; routes returned 200 [BUILD].

### 9.1 `template.json` (validated against the CLI's Zod schema)

`template.json`

```json
{
  "name": "tidepool",
  "description": "SaucerSwap V2 liquidity vault: an HTS share token over a concentrated-liquidity position that compounds fees and re-centres on the pool TWAP.",
  "version": "1.0.0",
  "create-scaffold-hbar": {
    "capabilities": {
      "frontend": ["nextjs-app"],
      "solidityFramework": ["hardhat"],
      "packageManager": ["npm", "yarn"]
    },
    "defaults": {
      "frontend": "nextjs-app",
      "solidityFramework": "hardhat",
      "packageManager": "npm"
    },
    "requirements": {
      "node": ">=20.18.3"
    },
    "outro": {
      "sections": [
        {
          "steps": [
            {
              "text": "Tidepool manages a live SaucerSwap V2 position, so it runs against Hedera testnet, not a local chain. The frontend already points at the published testnet vault."
            }
          ]
        },
        {
          "title": "See it working",
          "steps": [
            { "label": "Start the frontend", "command": "{run:next:dev}" },
            { "label": "Run the unit tests", "command": "{run:hardhat:test}" }
          ]
        },
        {
          "title": "Deploy your own vault",
          "steps": [
            { "label": "Generate or import a deployer account", "command": "{run:hardhat:account:generate}" },
            { "label": "Fund it with testnet HBAR", "url": "https://portal.hedera.com/faucet" },
            { "label": "Deploy and initialize the vault", "command": "{run:hardhat:deploy:testnet}" },
            { "label": "Deposit, open the position, and print HashScan links", "command": "{run:hardhat:smoke}" },
            { "label": "Verify on Sourcify / HashScan", "command": "{run:hardhat:verify:sourcify}" }
          ]
        },
        {
          "title": "Optional: demonstrate a TWAP-triggered rebalance",
          "steps": [
            {
              "text": "Use the separate narrow test vault (hardhat:deploy:narrow, hardhat:deposit, hardhat:move-price, hardhat:rebalance). It moves the shared testnet pool price; read the README section 'Optional: narrow-vault rebalance demo' first."
            }
          ]
        }
      ]
    }
  }
}
```

### 9.2 Root `package.json` (yarn form) and `.npmrc`

`package.json`

```json
{
  "name": "sh",
  "version": "0.0.1",
  "private": true,
  "workspaces": {
    "packages": [
      "packages/hardhat",
      "packages/nextjs"
    ]
  },
  "scripts": {
    "format": "yarn next:format && yarn hardhat:format",
    "hardhat:account": "yarn workspace @sh/hardhat account",
    "hardhat:account:generate": "yarn workspace @sh/hardhat account:generate",
    "hardhat:account:import": "yarn workspace @sh/hardhat account:import",
    "hardhat:account:reveal-pk": "yarn workspace @sh/hardhat account:reveal-pk",
    "hardhat:check-types": "yarn workspace @sh/hardhat check-types",
    "hardhat:clean": "yarn workspace @sh/hardhat clean",
    "hardhat:compile": "yarn workspace @sh/hardhat compile",
    "hardhat:compound": "yarn workspace @sh/hardhat compound",
    "hardhat:deposit": "yarn workspace @sh/hardhat deposit",
    "hardhat:deploy": "yarn workspace @sh/hardhat deploy",
    "hardhat:deploy:narrow": "yarn workspace @sh/hardhat deploy:narrow",
    "hardhat:deploy:testnet": "yarn workspace @sh/hardhat deploy --network hederaTestnet",
    "hardhat:format": "yarn workspace @sh/hardhat format",
    "hardhat:lint": "yarn workspace @sh/hardhat lint",
    "hardhat:lint-staged": "yarn workspace @sh/hardhat lint-staged",
    "hardhat:move-price": "yarn workspace @sh/hardhat move-price",
    "hardhat:rebalance": "yarn workspace @sh/hardhat rebalance",
    "hardhat:simulate-traders": "yarn workspace @sh/hardhat simulate-traders",
    "hardhat:smoke": "yarn workspace @sh/hardhat smoke",
    "hardhat:test": "yarn workspace @sh/hardhat test",
    "hardhat:verify:sourcify": "yarn workspace @sh/hardhat verify:sourcify",
    "hardhat:withdraw": "yarn workspace @sh/hardhat withdraw",
    "lint": "yarn next:lint && yarn hardhat:lint",
    "next:build": "yarn workspace @sh/nextjs build",
    "next:check-types": "yarn workspace @sh/nextjs check-types",
    "next:dev": "yarn workspace @sh/nextjs dev",
    "next:format": "yarn workspace @sh/nextjs format",
    "next:lint": "yarn workspace @sh/nextjs lint",
    "next:serve": "yarn workspace @sh/nextjs serve",
    "next:start": "yarn workspace @sh/nextjs start",
    "postinstall": "husky",
    "precommit": "lint-staged",
    "lint-staged": "lint-staged"
  },
  "packageManager": "yarn@3.2.3",
  "devDependencies": {
    "husky": "^9.1.6",
    "lint-staged": "^15.2.10"
  },
  "engines": {
    "node": ">=20.18.3"
  }
}
```

`.npmrc` (root):

`.npmrc`

```ini
legacy-peer-deps=true
```

### 9.3 Hardhat package

`packages/hardhat/package.json`: the blank template's file with the sample verify scripts replaced and two dependencies added.

`packages/hardhat/package.json`

```json
{
  "name": "@sh/hardhat",
  "version": "0.0.1",
  "scripts": {
    "account": "hardhat run scripts/listAccount.ts",
    "account:generate": "hardhat run scripts/generateAccount.ts",
    "account:import": "hardhat run scripts/importAccount.ts",
    "account:reveal-pk": "hardhat run scripts/revealPK.ts",
    "chain": "HEDERA_FORKING=true hardhat node --network hardhat --no-deploy",
    "check-types": "tsc --noEmit --incremental",
    "compile": "hardhat compile",
    "clean": "hardhat clean",
    "deploy": "ts-node scripts/runHardhatDeployWithPK.ts",
    "deploy:narrow": "ts-node scripts/runNarrowDeployWithPK.ts",
    "flatten": "hardhat flatten",
    "fork": "MAINNET_FORKING_ENABLED=true HEDERA_FORKING=true hardhat node --network hardhat --no-deploy",
    "format": "prettier --write './**/*.(ts|sol)'",
    "lint": "eslint",
    "lint-staged": "eslint",
    "test": "hardhat test",
    "smoke": "ts-node scripts/runScriptWithPK.ts scripts/tidepoolSmoke.ts --network hederaTestnet",
    "compound": "ts-node scripts/runScriptWithPK.ts scripts/tidepoolCompound.ts --network hederaTestnet",
    "withdraw": "ts-node scripts/runScriptWithPK.ts scripts/tidepoolWithdraw.ts --network hederaTestnet",
    "deposit": "ts-node scripts/runScriptWithPK.ts scripts/tidepoolDeposit.ts --network hederaTestnet",
    "move-price": "ts-node scripts/runScriptWithPK.ts scripts/tidepoolMovePrice.ts --network hederaTestnet",
    "rebalance": "ts-node scripts/runScriptWithPK.ts scripts/tidepoolRebalance.ts --network hederaTestnet",
    "simulate-traders": "ts-node scripts/runScriptWithPK.ts scripts/simulateTraders.ts --network hederaTestnet",
    "verify:sourcify": "hardhat run scripts/verifySourcify.ts --network hederaTestnet"
  },
  "devDependencies": {
    "@ethersproject/abi": "~5.7.0",
    "@ethersproject/providers": "~5.7.2",
    "@hashgraph/system-contracts-forking": "0.1.2",
    "@nomicfoundation/hardhat-chai-matchers": "~2.0.7",
    "@nomicfoundation/hardhat-ethers": "~3.0.8",
    "@nomicfoundation/hardhat-network-helpers": "~1.0.11",
    "@nomicfoundation/hardhat-verify": "^2.0.0",
    "@typechain/ethers-v6": "~0.5.1",
    "@typechain/hardhat": "~9.1.0",
    "@types/eslint": "~9.6.1",
    "@types/mocha": "~10.0.10",
    "@types/prettier": "~3.0.0",
    "@types/qrcode": "~1.5.5",
    "@typescript-eslint/eslint-plugin": "~8.27.0",
    "@typescript-eslint/parser": "~8.27.0",
    "chai": "~4.5.0",
    "eslint": "~9.23.0",
    "eslint-config-prettier": "~10.1.1",
    "eslint-plugin-prettier": "~5.2.4",
    "ethers": "^6.14.0",
    "hardhat": "2.22.19",
    "hardhat-deploy": "^1.0.4",
    "hardhat-deploy-ethers": "~0.4.2",
    "hardhat-gas-reporter": "~2.2.1",
    "prettier": "^3.5.3",
    "prettier-plugin-solidity": "~1.4.1",
    "solidity-coverage": "~0.8.13",
    "ts-node": "~10.9.1",
    "typechain": "~8.3.2",
    "typescript": "^5.8.2"
  },
  "dependencies": {
    "@hiero-ledger/hiero-contracts": "0.2.0",
    "@inquirer/password": "^4.0.2",
    "@openzeppelin/contracts": "5.6.1",
    "@typechain/ethers-v6": "~0.5.1",
    "@uniswap/v4-core": "1.0.2",
    "dotenv": "~16.4.5",
    "envfile": "~7.1.0",
    "qrcode": "~1.5.4"
  }
}
```

`packages/hardhat/hardhat.config.ts`: the only change from the blank template is the `enabled:` line under `forking`.

`packages/hardhat/hardhat.config.ts`

```ts
import * as dotenv from "dotenv";
dotenv.config();

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
// Only load the Hedera forking plugin when starting the local node (yarn hardhat:chain / yarn hardhat:fork).
// Deploying to an already-running node doesn't need it and would fail with EADDRINUSE.
if (process.env.HEDERA_FORKING === "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional plugin load
  require("@hashgraph/system-contracts-forking/plugin");
}
import "hardhat-deploy";
import "hardhat-deploy-ethers";

import generateTsAbis from "./scripts/generateTsAbis";

// Hedera JSON-RPC URL (testnet default). Set HEDERA_RPC_URL in .env for mainnet.
const hederaRpcUrl = process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api";

// Deployer key: run `yarn account:generate` or `yarn account:import`, or set __RUNTIME_DEPLOYER_PRIVATE_KEY at runtime.
const deployerPrivateKey =
  process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: hederaRpcUrl,
        // Unit tests run on a plain in-process chain; `chain` / `fork` scripts set HEDERA_FORKING=true.
        enabled: process.env.HEDERA_FORKING === "true",
        // @ts-expect-error - custom property for hedera-forking plugin
        chainId: 296,
        workerPort: 10001,
      },
    },
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      accounts: [deployerPrivateKey],
      chainId: 296,
    },
    hederaMainnet: {
      url: "https://mainnet.hashio.io/api",
      accounts: [deployerPrivateKey],
      chainId: 295,
    },
  },
  // Hedera is now supported on the main Sourcify instance (sourcify.dev).
  // No custom verifier URL required — standard tooling works out of the box.
  // See: https://hedera.com/blog/smart-contract-verification-sourcify-dev-now-supported
  sourcify: {
    enabled: true,
  },
  // Disable Etherscan verification (Hedera uses Sourcify only)
  etherscan: {
    enabled: false,
    apiKey: {},
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

// Extend the deploy task to also generate TypeScript ABIs after deployment.
task("deploy").setAction(async (args, hre, runSuper) => {
  await runSuper(args);
  await generateTsAbis(hre);
});

// Extend the verify task to show HashScan link after Sourcify verification.
task("verify").setAction(async (args, hre, runSuper) => {
  await runSuper(args);

  const address = args.address;
  const chainId = hre.network.config.chainId;

  if (address && (chainId === 295 || chainId === 296)) {
    const network = chainId === 295 ? "mainnet" : "testnet";
    console.log(`\nHashScan: https://hashscan.io/${network}/contract/${address}`);
  }
});

export default config;
```

### 9.4 `packages/nextjs/next.config.ts` (x402 alias added)

`packages/nextjs/next.config.ts`

```ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  reactStrictMode: true,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  webpack: (config, { dev }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    // wagmi -> @base-org/account -> @coinbase/cdp-sdk (>= 1.56) imports x402 packages that are optional
    // peer dependencies and are not installed. Tidepool never uses the Base Account connector, so stub them.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core": false,
      "@x402/evm": false,
      "@x402/svm": false,
      "@x402/extensions": false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    if (dev) {
      config.watchOptions = {
        followSymlinks: true,
      };
      config.snapshot = { ...(config.snapshot as object), managedPaths: [] };
    }
    return config;
  },
};

module.exports = nextConfig;
```

### 9.5 Contracts

`packages/hardhat/contracts/tidepool/TidepoolVault.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { FullMath } from "@uniswap/v4-core/src/libraries/FullMath.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { HederaTokenService } from "@hiero-ledger/hiero-contracts/token-service/HederaTokenService.sol";
import { IHederaTokenService } from "@hiero-ledger/hiero-contracts/token-service/IHederaTokenService.sol";
import { HederaResponseCodes } from "@hiero-ledger/hiero-contracts/common/HederaResponseCodes.sol";
import { IExchangeRate } from "@hiero-ledger/hiero-contracts/exchange-rate/IExchangeRate.sol";

import { ISaucerSwapV2Factory, ISaucerSwapV2Pool, ISaucerSwapV2NonfungiblePositionManager as INPM, ISaucerSwapV2SwapRouter } from "./interfaces/ISaucerSwapV2.sol";
import { RangeMath } from "./libraries/RangeMath.sol";

/// @title TidepoolVault
/// @notice Holds a single SaucerSwap V2 concentrated-liquidity position, issues an HTS fungible
///         share token, compounds swap fees back into the position, and re-centres the range when
///         the pool's time-weighted price leaves it. Every state-changing function except
///         `initialize` is permissionless; there is no owner and no upgrade path.
contract TidepoolVault is HederaTokenService, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    struct Config {
        address pool; // SaucerSwap V2 pool (checked against the factory)
        address positionManager; // SaucerSwapV2NonfungiblePositionManager
        address swapRouter; // SaucerSwapV2SwapRouter
        int24 halfWidth; // half range width in ticks, a positive multiple of the pool's tickSpacing
        uint32 twapWindow; // seconds used for the TWAP
        int24 maxTwapDeviation; // max |spotTick - twapTick| for deposit / compound / rebalance
        uint32 rebalanceCooldown; // minimum seconds between rebalances
        uint16 swapSlippageBps; // extra slippage allowed on the compound and rebalance swaps, on top of the pool fee
    }

    /// @dev HTS amounts are int64, so shares use 8 decimals and a fixed first mint.
    int32 public constant SHARE_DECIMALS = 8;
    uint256 public constant INITIAL_SHARES = 100 * 1e8;
    /// @dev Minted to the vault (HTS treasury) on the first deposit and never released: defeats share-price inflation.
    uint256 public constant DEAD_SHARES = 1e5;
    int64 private constant SHARE_AUTO_RENEW_PERIOD = 7_776_000; // 90 days, the HTS default
    /// @dev Standing allowance granted once in initialize(). HTS allowances are int64, so uint256 max is not valid.
    uint256 private constant STANDING_ALLOWANCE = uint256(uint64(type(int64).max));
    address private constant EXCHANGE_RATE_PRECOMPILE = address(0x168);

    address public immutable deployer;
    address public immutable pool;
    address public immutable token0;
    address public immutable token1;
    uint24 public immutable fee;
    int24 public immutable tickSpacing;
    address public immutable factory;
    INPM public immutable positionManager;
    ISaucerSwapV2SwapRouter public immutable swapRouter;
    address public immutable positionNft;
    int24 public immutable halfWidth;
    uint32 public immutable twapWindow;
    int24 public immutable maxTwapDeviation;
    uint32 public immutable rebalanceCooldown;
    uint16 public immutable swapSlippageBps;

    address public shareToken;
    uint256 public totalShares;
    uint256 public positionSerial; // SaucerSwap LP NFT serial; 0 = no position yet
    int24 public tickLower;
    int24 public tickUpper;
    uint64 public lastRebalance;

    event Initialized(address indexed shareToken);
    event Deposit(address indexed sender, address indexed receiver, uint256 shares, uint256 amount0, uint256 amount1);
    event Withdraw(address indexed owner, address indexed receiver, uint256 shares, uint256 amount0, uint256 amount1);
    event FeesCollected(uint256 fee0, uint256 fee1);
    event Compound(address indexed caller, uint128 liquidityAdded, uint256 amount0, uint256 amount1);
    event Rebalance(
        address indexed caller,
        int24 twapTick,
        int24 oldTickLower,
        int24 oldTickUpper,
        int24 newTickLower,
        int24 newTickUpper,
        uint256 newPositionSerial
    );

    error InvalidConfig();
    error NotDeployer();
    error AlreadyInitialized();
    error NotInitialized();
    error HtsCallFailed(int64 responseCode);
    error PriceDeviation(int24 spotTick, int24 twapTick);
    error InsufficientFee(uint256 required, uint256 provided);
    error ZeroShares();
    error SlippageExceeded();
    error NothingToCompound();
    error NoPosition();
    error StillInRange(int24 twapTick);
    error OutOfRange(int24 twapTick);
    error CooldownActive(uint256 readyAt);
    error RefundFailed();

    constructor(Config memory cfg) {
        ISaucerSwapV2Pool p = ISaucerSwapV2Pool(cfg.pool);
        address t0 = p.token0();
        address t1 = p.token1();
        uint24 poolFee = p.fee();
        int24 spacing = p.tickSpacing();
        address npmFactory = INPM(cfg.positionManager).factory();

        // The vault trusts the pool for prices, so it must be a genuine SaucerSwap V2 pool.
        if (ISaucerSwapV2Factory(npmFactory).getPool(t0, t1, poolFee) != cfg.pool) revert InvalidConfig();
        if (ISaucerSwapV2SwapRouter(cfg.swapRouter).factory() != npmFactory) revert InvalidConfig();
        if (cfg.halfWidth <= 0 || cfg.halfWidth % spacing != 0) revert InvalidConfig();
        if (cfg.twapWindow == 0 || cfg.maxTwapDeviation <= 0 || cfg.swapSlippageBps >= 10_000) revert InvalidConfig();

        deployer = msg.sender;
        pool = cfg.pool;
        token0 = t0;
        token1 = t1;
        fee = poolFee;
        tickSpacing = spacing;
        factory = npmFactory;
        positionManager = INPM(cfg.positionManager);
        swapRouter = ISaucerSwapV2SwapRouter(cfg.swapRouter);
        positionNft = INPM(cfg.positionManager).nft();
        halfWidth = cfg.halfWidth;
        twapWindow = cfg.twapWindow;
        maxTwapDeviation = cfg.maxTwapDeviation;
        rebalanceCooldown = cfg.rebalanceCooldown;
        swapSlippageBps = cfg.swapSlippageBps;
    }

    // ------------------------------------------------------------------------------------------
    // One-time setup (HTS association + share token creation)
    // ------------------------------------------------------------------------------------------

    /// @notice Associates the vault with token0, token1 and the LP NFT, then creates the HTS share token
    ///         with the vault as treasury and supply key, and grants the position manager and swap router
    ///         standing int64-max allowances on token0 and token1 (each HTS approval costs ~705k gas, so they
    ///         are paid once here instead of on every compound/rebalance). msg.value pays the HTS
    ///         token-creation fee; any HBAR left in the vault afterwards is returned to the caller.
    function initialize(string calldata name, string calldata symbol) external payable nonReentrant {
        if (msg.sender != deployer) revert NotDeployer();
        if (shareToken != address(0)) revert AlreadyInitialized();

        address[] memory tokens = new address[](3);
        tokens[0] = token0;
        tokens[1] = token1;
        tokens[2] = positionNft;
        _checkHts(associateTokens(address(this), tokens));

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey({
            keyType: 16, // bit 4 = supply key
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(this),
                ed25519: "",
                ECDSA_secp256k1: "",
                delegatableContractId: address(0)
            })
        });

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken({
            name: name,
            symbol: symbol,
            treasury: address(this),
            memo: "Tidepool vault shares",
            tokenSupplyType: false, // infinite
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: keys,
            expiry: IHederaTokenService.Expiry({
                second: 0,
                autoRenewAccount: address(this),
                autoRenewPeriod: SHARE_AUTO_RENEW_PERIOD
            })
        });

        (int64 rc, address created) = createFungibleToken(token, 0, SHARE_DECIMALS);
        _checkHts(rc);
        shareToken = created;

        IERC20(token0).forceApprove(address(positionManager), STANDING_ALLOWANCE);
        IERC20(token1).forceApprove(address(positionManager), STANDING_ALLOWANCE);
        IERC20(token0).forceApprove(address(swapRouter), STANDING_ALLOWANCE);
        IERC20(token1).forceApprove(address(swapRouter), STANDING_ALLOWANCE);

        _refund(address(this).balance);
        emit Initialized(created);
    }

    // ------------------------------------------------------------------------------------------
    // Depositor actions
    // ------------------------------------------------------------------------------------------

    /// @notice Deposit token0 and token1 in the vault's current ratio and receive HTS shares.
    /// @dev Deposits sit idle until the next compound(), so no HBAR mint fee is charged here.
    ///      The receiver must be associated with the share token (or have a free auto-association slot).
    function deposit(
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 minShares,
        address receiver
    ) external nonReentrant returns (uint256 shares, uint256 amount0, uint256 amount1) {
        _requireInitialized();
        (uint160 sqrtPriceX96, , ) = _checkedPrices();
        _collectFees();

        uint256 supply = totalShares;
        if (supply == 0) {
            if (amount0Max == 0 || amount1Max == 0) revert ZeroShares();
            amount0 = amount0Max;
            amount1 = amount1Max;
            shares = INITIAL_SHARES - DEAD_SHARES;
            _mintShares(INITIAL_SHARES);
        } else {
            (uint256 total0, uint256 total1) = _totalAmounts(sqrtPriceX96);
            if (total0 == 0) {
                shares = FullMath.mulDiv(amount1Max, supply, total1);
            } else if (total1 == 0) {
                shares = FullMath.mulDiv(amount0Max, supply, total0);
            } else {
                uint256 s0 = FullMath.mulDiv(amount0Max, supply, total0);
                uint256 s1 = FullMath.mulDiv(amount1Max, supply, total1);
                shares = s0 < s1 ? s0 : s1;
            }
            if (shares == 0) revert ZeroShares();
            amount0 = FullMath.mulDivRoundingUp(shares, total0, supply);
            amount1 = FullMath.mulDivRoundingUp(shares, total1, supply);
            _mintShares(shares);
        }
        if (shares < minShares) revert SlippageExceeded();

        if (amount0 > 0) IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        if (amount1 > 0) IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        IERC20(shareToken).safeTransfer(receiver, shares);

        emit Deposit(msg.sender, receiver, shares, amount0, amount1);
    }

    /// @notice Burn `shares` and receive the matching slice of the position and of the idle balances.
    /// @dev The caller must first approve the vault to transfer `shares` of the share token.
    ///      Withdrawals do not check the TWAP, so users can always exit; amount0Min/amount1Min protect them.
    function withdraw(
        uint256 shares,
        uint256 amount0Min,
        uint256 amount1Min,
        address receiver
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        _requireInitialized();
        if (shares == 0) revert ZeroShares();

        _collectFees();
        uint256 supply = totalShares;
        amount0 = FullMath.mulDiv(IERC20(token0).balanceOf(address(this)), shares, supply);
        amount1 = FullMath.mulDiv(IERC20(token1).balanceOf(address(this)), shares, supply);

        if (positionSerial != 0) {
            (, , , , , uint128 liquidity, , , , ) = positionManager.positions(positionSerial);
            uint128 toRemove = FullMath.mulDiv(liquidity, shares, supply).toUint128();
            if (toRemove > 0) {
                (uint256 out0, uint256 out1) = _removeLiquidity(toRemove);
                amount0 += out0;
                amount1 += out1;
            }
        }
        if (amount0 < amount0Min || amount1 < amount1Min) revert SlippageExceeded();

        IERC20(shareToken).safeTransferFrom(msg.sender, address(this), shares);
        _burnShares(shares);

        if (amount0 > 0) IERC20(token0).safeTransfer(receiver, amount0);
        if (amount1 > 0) IERC20(token1).safeTransfer(receiver, amount1);

        emit Withdraw(msg.sender, receiver, shares, amount0, amount1);
    }

    // ------------------------------------------------------------------------------------------
    // Keeper actions (permissionless; the caller pays SaucerSwap's HBAR position fee)
    // ------------------------------------------------------------------------------------------

    /// @notice Collect fees, swap idle balances to the range's ratio, and add everything to the position
    ///         (minting the first position if none exists). msg.value must cover `quoteMintFee()`; the rest is refunded.
    function compound() external payable nonReentrant {
        _requireInitialized();
        (uint160 sqrtPriceX96, , int24 twapTick) = _checkedPrices();
        _collectFees();

        if (positionSerial == 0) {
            if (IERC20(token0).balanceOf(address(this)) == 0 && IERC20(token1).balanceOf(address(this)) == 0) {
                revert NothingToCompound();
            }
            (int24 lower, int24 upper) = RangeMath.rangeAround(twapTick, tickSpacing, halfWidth);
            _swapToRatio(sqrtPriceX96, twapTick, lower, upper);
            _mintPosition(lower, upper);
            lastRebalance = uint64(block.timestamp);
            emit Rebalance(msg.sender, twapTick, 0, 0, lower, upper, positionSerial);
            return;
        }

        // Adding to an out-of-range position would swap everything to one token; rebalance() is the path there.
        if (twapTick < tickLower || twapTick >= tickUpper) revert OutOfRange(twapTick);
        _swapToRatio(sqrtPriceX96, twapTick, tickLower, tickUpper);
        uint256 idle0 = IERC20(token0).balanceOf(address(this));
        uint256 idle1 = IERC20(token1).balanceOf(address(this));
        if (idle0 == 0 && idle1 == 0) revert NothingToCompound();

        uint256 mintFeeTinybars = _chargeMintFee();
        (uint128 liquidity, uint256 used0, uint256 used1) = positionManager.increaseLiquidity{ value: mintFeeTinybars }(
            INPM.IncreaseLiquidityParams({
                tokenSN: positionSerial,
                amount0Desired: idle0,
                amount1Desired: idle1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
        _refund(msg.value - mintFeeTinybars);

        emit Compound(msg.sender, liquidity, used0, used1);
    }

    /// @notice When the TWAP tick has left the range: withdraw everything, re-centre the range on the TWAP
    ///         tick, swap to the new ratio through the SaucerSwap router, and mint a new position.
    function rebalance() external payable nonReentrant {
        _requireInitialized();
        if (positionSerial == 0) revert NoPosition();
        uint256 readyAt = uint256(lastRebalance) + rebalanceCooldown;
        if (block.timestamp < readyAt) revert CooldownActive(readyAt);

        (uint160 sqrtPriceX96, , int24 twapTick) = _checkedPrices();
        if (twapTick >= tickLower && twapTick < tickUpper) revert StillInRange(twapTick);

        _collectFees();
        (, , , , , uint128 liquidity, , , , ) = positionManager.positions(positionSerial);
        if (liquidity > 0) _removeLiquidity(liquidity);

        int24 oldLower = tickLower;
        int24 oldUpper = tickUpper;
        (int24 lower, int24 upper) = RangeMath.rangeAround(twapTick, tickSpacing, halfWidth);
        _swapToRatio(sqrtPriceX96, twapTick, lower, upper);
        _mintPosition(lower, upper);
        lastRebalance = uint64(block.timestamp);

        emit Rebalance(msg.sender, twapTick, oldLower, oldUpper, lower, upper, positionSerial);
    }

    // ------------------------------------------------------------------------------------------
    // Views and quotes
    // ------------------------------------------------------------------------------------------

    /// @notice Token amounts the vault controls at the current pool price: the position's principal
    ///         plus idle balances. Uncollected swap fees are not included until the next collect.
    function getTotalAmounts() external view returns (uint256 total0, uint256 total1) {
        (uint160 sqrtPriceX96, , , , , , ) = ISaucerSwapV2Pool(pool).slot0();
        return _totalAmounts(sqrtPriceX96);
    }

    /// @notice Spot tick, TWAP tick, and whether the TWAP tick is inside the current range.
    function getPriceState() external view returns (int24 spotTick, int24 twapTick, bool inRange) {
        (, spotTick, , , , , ) = ISaucerSwapV2Pool(pool).slot0();
        twapTick = RangeMath.consultTwapTick(pool, twapWindow);
        inRange = positionSerial != 0 && twapTick >= tickLower && twapTick < tickUpper;
    }

    /// @notice HBAR (in tinybars) that compound() and rebalance() forward to SaucerSwap for the position fee.
    /// @dev Not `view` because the exchange-rate system contract is declared non-view; call it with eth_call.
    function quoteMintFee() external returns (uint256 tinybars) {
        return _mintFeeTinybars();
    }

    // ------------------------------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------------------------------

    function _requireInitialized() private view {
        if (shareToken == address(0)) revert NotInitialized();
    }

    /// @dev Reverts unless the spot tick is within maxTwapDeviation of the TWAP tick.
    function _checkedPrices() private view returns (uint160 sqrtPriceX96, int24 spotTick, int24 twapTick) {
        (sqrtPriceX96, spotTick, , , , , ) = ISaucerSwapV2Pool(pool).slot0();
        twapTick = RangeMath.consultTwapTick(pool, twapWindow);
        int24 diff = spotTick > twapTick ? spotTick - twapTick : twapTick - spotTick;
        if (diff > maxTwapDeviation) revert PriceDeviation(spotTick, twapTick);
    }

    function _totalAmounts(uint160 sqrtPriceX96) private view returns (uint256 total0, uint256 total1) {
        total0 = IERC20(token0).balanceOf(address(this));
        total1 = IERC20(token1).balanceOf(address(this));
        if (positionSerial != 0) {
            (, , , , , uint128 liquidity, , , , ) = positionManager.positions(positionSerial);
            (uint256 p0, uint256 p1) = RangeMath.amountsForLiquidity(sqrtPriceX96, tickLower, tickUpper, liquidity);
            total0 += p0;
            total1 += p1;
        }
    }

    /// @dev Moves all fees owed to the position into the vault's idle balances.
    function _collectFees() private {
        if (positionSerial == 0) return;
        (uint256 fee0, uint256 fee1) = positionManager.collect(
            INPM.CollectParams({
                tokenSN: positionSerial,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        if (fee0 > 0 || fee1 > 0) emit FeesCollected(fee0, fee1);
    }

    /// @dev decreaseLiquidity only credits tokensOwed; collect moves them to the vault. No HBAR fee applies.
    function _removeLiquidity(uint128 liquidity) private returns (uint256 amount0, uint256 amount1) {
        positionManager.decreaseLiquidity(
            INPM.DecreaseLiquidityParams({
                tokenSN: positionSerial,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
        (amount0, amount1) = positionManager.collect(
            INPM.CollectParams({
                tokenSN: positionSerial,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }

    function _mintPosition(int24 lower, int24 upper) private {
        uint256 bal0 = IERC20(token0).balanceOf(address(this));
        uint256 bal1 = IERC20(token1).balanceOf(address(this));
        uint256 mintFeeTinybars = _chargeMintFee();

        (uint256 serial, , , ) = positionManager.mint{ value: mintFeeTinybars }(
            INPM.MintParams({
                token0: token0,
                token1: token1,
                fee: fee,
                tickLower: lower,
                tickUpper: upper,
                amount0Desired: bal0,
                amount1Desired: bal1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            })
        );

        positionSerial = serial;
        tickLower = lower;
        tickUpper = upper;
        _refund(msg.value - mintFeeTinybars);
    }

    /// @dev Swaps through the SaucerSwap V2 router so idle balances match the range's ratio.
    ///      amountOutMinimum is derived from the TWAP price, net of the pool fee and swapSlippageBps.
    function _swapToRatio(uint160 sqrtPriceX96, int24 twapTick, int24 lower, int24 upper) private {
        uint256 bal0 = IERC20(token0).balanceOf(address(this));
        uint256 bal1 = IERC20(token1).balanceOf(address(this));
        (bool zeroForOne, uint256 amountIn) = RangeMath.swapToRatio(bal0, bal1, sqrtPriceX96, lower, upper);
        if (amountIn == 0) return;

        uint160 sqrtTwapX96 = TickMath.getSqrtPriceAtTick(twapTick);
        uint256 expectedOut = zeroForOne
            ? RangeMath.token0ToToken1(amountIn, sqrtTwapX96)
            : RangeMath.token1ToToken0(amountIn, sqrtTwapX96);
        if (expectedOut == 0) return; // dust: not worth a swap
        uint256 minOut = FullMath.mulDiv(
            expectedOut,
            uint256(1_000_000 - fee) * (10_000 - swapSlippageBps),
            1_000_000 * 10_000
        );

        (address tokenIn, address tokenOut) = zeroForOne ? (token0, token1) : (token1, token0);
        swapRouter.exactInputSingle(
            ISaucerSwapV2SwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
    }

    /// @dev SaucerSwap charges `factory.mintFee()` tinycents, paid in HBAR, on every mint and increaseLiquidity.
    ///      The position manager converts it with the exchange-rate system contract (0x168) and adds 1 tinybar
    ///      of rounding slop; sending exactly that amount leaves the manager with no spare HBAR, so it pulls
    ///      WHBAR from the vault instead of wrapping the caller's HBAR.
    function _mintFeeTinybars() private returns (uint256) {
        uint256 tinycents = ISaucerSwapV2Factory(factory).mintFee();
        if (tinycents == 0) return 0;
        return IExchangeRate(EXCHANGE_RATE_PRECOMPILE).tinycentsToTinybars(tinycents) + 1;
    }

    function _chargeMintFee() private returns (uint256 tinybars) {
        tinybars = _mintFeeTinybars();
        if (msg.value < tinybars) revert InsufficientFee(tinybars, msg.value);
    }

    function _mintShares(uint256 amount) private {
        (int64 rc, , ) = mintToken(shareToken, SafeCast.toInt64(amount.toInt256()), new bytes[](0));
        _checkHts(rc);
        totalShares += amount;
    }

    function _burnShares(uint256 amount) private {
        (int64 rc, ) = burnToken(shareToken, SafeCast.toInt64(amount.toInt256()), new int64[](0));
        _checkHts(rc);
        totalShares -= amount;
    }

    function _refund(uint256 amount) private {
        if (amount == 0) return;
        (bool ok, ) = payable(msg.sender).call{ value: amount }("");
        if (!ok) revert RefundFailed();
    }

    function _checkHts(int64 rc) private pure {
        if (rc != HederaResponseCodes.SUCCESS) revert HtsCallFailed(rc);
    }
}
```

`packages/hardhat/contracts/tidepool/libraries/RangeMath.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { FullMath } from "@uniswap/v4-core/src/libraries/FullMath.sol";
import { SqrtPriceMath } from "@uniswap/v4-core/src/libraries/SqrtPriceMath.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";

import { ISaucerSwapV2Pool } from "../interfaces/ISaucerSwapV2.sol";

/// @title RangeMath
/// @notice Concentrated-liquidity helpers for Tidepool. Uses only the MIT-licensed
///         libraries from Uniswap v4-core. Nothing here is copied from GPL code.
library RangeMath {
    uint256 internal constant Q96 = 2 ** 96;

    error TwapUnavailable();

    /// @notice Arithmetic-mean tick over the last `window` seconds, read from the pool's own oracle.
    /// @dev Rounds towards negative infinity, the same convention Uniswap v3 uses for mean ticks.
    ///      Reverts with TwapUnavailable when the pool cannot answer (for example, when its
    ///      observation cardinality is too small, so observe() reverts with OLD()).
    function consultTwapTick(address pool, uint32 window) internal view returns (int24 meanTick) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = window;
        secondsAgos[1] = 0;

        int56[] memory tickCumulatives;
        try ISaucerSwapV2Pool(pool).observe(secondsAgos) returns (int56[] memory tc, uint160[] memory) {
            tickCumulatives = tc;
        } catch {
            revert TwapUnavailable();
        }

        int56 delta = tickCumulatives[1] - tickCumulatives[0];
        int56 w = int56(uint56(window));
        meanTick = int24(delta / w);
        if (delta < 0 && (delta % w != 0)) meanTick--;
    }

    /// @notice Largest multiple of `spacing` that is <= tick.
    function floorToSpacing(int24 tick, int24 spacing) internal pure returns (int24) {
        int24 compressed = tick / spacing;
        if (tick < 0 && tick % spacing != 0) compressed--;
        return compressed * spacing;
    }

    /// @notice A range of +/- halfWidth ticks around `centerTick`, snapped to spacing and clamped to usable ticks.
    function rangeAround(
        int24 centerTick,
        int24 spacing,
        int24 halfWidth
    ) internal pure returns (int24 lower, int24 upper) {
        int24 center = floorToSpacing(centerTick, spacing);
        int24 minTick = TickMath.minUsableTick(spacing);
        int24 maxTick = TickMath.maxUsableTick(spacing);
        lower = center - halfWidth < minTick ? minTick : center - halfWidth;
        upper = center + halfWidth > maxTick ? maxTick : center + halfWidth;
    }

    /// @notice Token amounts held by `liquidity` in [tickLower, tickUpper) at price sqrtPriceX96 (rounded down).
    function amountsForLiquidity(
        uint160 sqrtPriceX96,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal pure returns (uint256 amount0, uint256 amount1) {
        uint160 sqrtA = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtB = TickMath.getSqrtPriceAtTick(tickUpper);
        if (sqrtPriceX96 <= sqrtA) {
            amount0 = SqrtPriceMath.getAmount0Delta(sqrtA, sqrtB, liquidity, false);
        } else if (sqrtPriceX96 < sqrtB) {
            amount0 = SqrtPriceMath.getAmount0Delta(sqrtPriceX96, sqrtB, liquidity, false);
            amount1 = SqrtPriceMath.getAmount1Delta(sqrtA, sqrtPriceX96, liquidity, false);
        } else {
            amount1 = SqrtPriceMath.getAmount1Delta(sqrtA, sqrtB, liquidity, false);
        }
    }

    /// @notice Value of `amount0` expressed in token1 units at sqrtPriceX96 (price = sqrtP^2 / 2^192).
    function token0ToToken1(uint256 amount0, uint160 sqrtPriceX96) internal pure returns (uint256) {
        return FullMath.mulDiv(FullMath.mulDiv(amount0, sqrtPriceX96, Q96), sqrtPriceX96, Q96);
    }

    /// @notice Value of `amount1` expressed in token0 units at sqrtPriceX96.
    function token1ToToken0(uint256 amount1, uint160 sqrtPriceX96) internal pure returns (uint256) {
        return FullMath.mulDiv(FullMath.mulDiv(amount1, Q96, sqrtPriceX96), Q96, sqrtPriceX96);
    }

    /// @notice How much to swap so that (balance0, balance1) matches the token ratio a position in
    ///         [tickLower, tickUpper) needs at sqrtPriceX96. Ignores the pool fee and price impact;
    ///         whatever is left over after the mint stays idle in the vault and is picked up by the next compound.
    /// @return zeroForOne True to sell token0 for token1, false to sell token1 for token0.
    /// @return amountIn Amount of the input token to sell (0 means no swap needed).
    function swapToRatio(
        uint256 balance0,
        uint256 balance1,
        uint160 sqrtPriceX96,
        int24 tickLower,
        int24 tickUpper
    ) internal pure returns (bool zeroForOne, uint256 amountIn) {
        // Token amounts for a reference 1e18 of liquidity give the ratio the range needs.
        (uint256 unit0, uint256 unit1) = amountsForLiquidity(sqrtPriceX96, tickLower, tickUpper, 1e18);
        uint256 unit0In1 = token0ToToken1(unit0, sqrtPriceX96);
        uint256 unitTotal = unit0In1 + unit1;
        if (unitTotal == 0) return (false, 0);

        uint256 totalIn1 = token0ToToken1(balance0, sqrtPriceX96) + balance1;
        uint256 target1 = FullMath.mulDiv(totalIn1, unit1, unitTotal);

        if (balance1 > target1) {
            return (false, balance1 - target1);
        }
        uint256 missing1 = target1 - balance1;
        return (true, token1ToToken0(missing1, sqrtPriceX96));
    }
}
```

`packages/hardhat/contracts/tidepool/interfaces/ISaucerSwapV2.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal interfaces for the SaucerSwap V2 contracts Tidepool calls.
/// @dev Written from the public ABI documented at https://docs.saucerswap.finance/developers
///      and checked against the deployed testnet contracts. Only the members Tidepool uses are declared.

interface ISaucerSwapV2Factory {
    /// @return pool The pool for (tokenA, tokenB, fee), or address(0) if none exists.
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);

    /// @return The fee charged on every mint / increaseLiquidity, in tinycents (1e-8 US cents).
    function mintFee() external view returns (uint256);
}

interface ISaucerSwapV2Pool {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function fee() external view returns (uint24);

    function tickSpacing() external view returns (int24);

    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );

    function observe(
        uint32[] calldata secondsAgos
    ) external view returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}

interface ISaucerSwapV2NonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    struct IncreaseLiquidityParams {
        uint256 tokenSN;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct DecreaseLiquidityParams {
        uint256 tokenSN;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct CollectParams {
        uint256 tokenSN;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function factory() external view returns (address);

    /// @return The HTS NFT token that represents positions (testnet 0.0.1310436).
    function nft() external view returns (address);

    function positions(
        uint256 tokenSN
    )
        external
        view
        returns (
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    function mint(
        MintParams calldata params
    ) external payable returns (uint256 tokenSN, uint128 liquidity, uint256 amount0, uint256 amount1);

    function increaseLiquidity(
        IncreaseLiquidityParams calldata params
    ) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1);

    function decreaseLiquidity(
        DecreaseLiquidityParams calldata params
    ) external payable returns (uint256 amount0, uint256 amount1);

    function collect(CollectParams calldata params) external payable returns (uint256 amount0, uint256 amount1);
}

interface ISaucerSwapV2SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function factory() external view returns (address);

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}
```

### 9.6 Network config and deploy script

`packages/hardhat/tidepool.config.ts`

```ts
/**
 * Per-network SaucerSwap V2 addresses and vault parameters.
 * Contract and token IDs: https://docs.saucerswap.finance/developers/contracts
 * EVM address = 0x + the entity number (the last part of 0.0.N) as 40 hex digits.
 */
export type VaultParams = {
  pool: string;
  positionManager: string;
  swapRouter: string;
  halfWidth: number;
  twapWindow: number;
  maxTwapDeviation: number;
  rebalanceCooldown: number;
  swapSlippageBps: number;
  shareName: string;
  shareSymbol: string;
  /** HBAR sent to initialize() for the HTS token-creation fee (unused HBAR is refunded). */
  initializeHbar: string;
};

export const TIDEPOOL: Record<string, VaultParams> = {
  hederaTestnet: {
    pool: "0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7", // WHBAR/SAUCE 0.30%, 1000 observation slots
    positionManager: "0x000000000000000000000000000000000013f618", // 0.0.1308184
    swapRouter: "0x0000000000000000000000000000000000159398", // 0.0.1414040
    halfWidth: 600, // +/- 600 ticks, about +/- 6.2% in price
    twapWindow: 600,
    maxTwapDeviation: 50, // about 0.5%
    rebalanceCooldown: 3600,
    swapSlippageBps: 100,
    shareName: "Tidepool WHBAR-SAUCE",
    shareSymbol: "tpWHBAR-SAUCE",
    initializeHbar: "30",
  },
};

/**
 * Separate, narrow-range vault used only to exercise rebalance() on testnet. Same pool, manager and router
 * as the main vault; +/- 60 ticks and a 10-minute cooldown so a small, temporary price move takes it out of
 * range. Deployed under the name "TidepoolVaultNarrow" by deploy/01_deploy_tidepool_vault_narrow.ts, which is
 * skipped unless TIDEPOOL_DEPLOY_NARROW=true. The main TIDEPOOL entry above is unaffected.
 */
export const TIDEPOOL_NARROW: Record<string, VaultParams> = {
  hederaTestnet: {
    pool: "0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7", // same WHBAR/SAUCE 0.30% pool as the main vault
    positionManager: "0x000000000000000000000000000000000013f618", // 0.0.1308184
    swapRouter: "0x0000000000000000000000000000000000159398", // 0.0.1414040
    halfWidth: 60, // +/- 60 ticks (one tick spacing), about +/- 0.6% in price
    twapWindow: 600,
    maxTwapDeviation: 50,
    rebalanceCooldown: 600,
    swapSlippageBps: 100,
    shareName: "Tidepool Narrow Test",
    shareSymbol: "tpNARROW",
    initializeHbar: "30",
  },
};
```

`packages/hardhat/deploy/00_deploy_tidepool_vault.ts`

```ts
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { TIDEPOOL } from "../tidepool.config";
import { getDeployGasPrice } from "../utils/getDeployGasPrice";

/**
 * Deploys TidepoolVault against live SaucerSwap V2 contracts, then calls initialize(),
 * which associates the vault with both pool tokens and the LP NFT and creates the HTS share token.
 */
const deployTidepoolVault: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const params = TIDEPOOL[hre.network.name];
  if (!params) {
    console.log(`No SaucerSwap config for network "${hre.network.name}" - skipping TidepoolVault.`);
    return;
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy, read, execute } = hre.deployments;
  const gasPrice = await getDeployGasPrice(hre);

  await deploy("TidepoolVault", {
    from: deployer,
    args: [
      {
        pool: params.pool,
        positionManager: params.positionManager,
        swapRouter: params.swapRouter,
        halfWidth: params.halfWidth,
        twapWindow: params.twapWindow,
        maxTwapDeviation: params.maxTwapDeviation,
        rebalanceCooldown: params.rebalanceCooldown,
        swapSlippageBps: params.swapSlippageBps,
      },
    ],
    log: true,
    autoMine: true,
    gasLimit: 6_000_000,
    gasPrice,
  });

  const shareToken: string = await read("TidepoolVault", "shareToken");
  if (shareToken !== hre.ethers.ZeroAddress) {
    console.log(`TidepoolVault already initialized, share token ${shareToken}`);
    return;
  }

  // JSON-RPC value is in weibar (18 decimals); the relay converts it to tinybar for the EVM.
  // Gas: each HTS association or allowance approval made through the system contract is charged as gas.
  // Testnet, before standing approvals: initialize used 2,313,512 (three associations + token creation; 2M ran out).
  // The four standing approvals add ~4 x 705,424 (the per-approval cost measured on testnet), so ~5.14M in total.
  // Not re-measured yet; 8M leaves headroom, and Hedera charges gas used, not the limit.
  await execute(
    "TidepoolVault",
    { from: deployer, value: hre.ethers.parseEther(params.initializeHbar).toString(), gasLimit: 8_000_000, gasPrice },
    "initialize",
    params.shareName,
    params.shareSymbol,
  );
  console.log(`Share token: ${await read("TidepoolVault", "shareToken")}`);
};

deployTidepoolVault.tags = ["TidepoolVault"];
export default deployTidepoolVault;
```

Optional narrow test vault for the rebalance demo (skipped unless `TIDEPOOL_DEPLOY_NARROW=true`; run it with `hardhat:deploy:narrow`):

`packages/hardhat/deploy/01_deploy_tidepool_vault_narrow.ts`

```ts
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { TIDEPOOL_NARROW } from "../tidepool.config";
import { getDeployGasPrice } from "../utils/getDeployGasPrice";

const DEPLOYMENT_NAME = "TidepoolVaultNarrow";

/**
 * Deploys a SECOND TidepoolVault, recorded as "TidepoolVaultNarrow", with the narrow test parameters, then
 * initializes it. It never touches the main "TidepoolVault" deployment record.
 *
 * Opt-in only: skipped unless TIDEPOOL_DEPLOY_NARROW=true, so a plain `hardhat:deploy:testnet` cannot deploy it.
 * Intended entry point: `hardhat:deploy:narrow` (sets the flag and runs only this script's tag).
 */
const deployTidepoolVaultNarrow: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const params = TIDEPOOL_NARROW[hre.network.name];
  if (!params) {
    console.log(`No narrow-vault config for network "${hre.network.name}" - skipping ${DEPLOYMENT_NAME}.`);
    return;
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy, read, execute } = hre.deployments;
  const gasPrice = await getDeployGasPrice(hre);

  await deploy(DEPLOYMENT_NAME, {
    contract: "TidepoolVault",
    from: deployer,
    args: [
      {
        pool: params.pool,
        positionManager: params.positionManager,
        swapRouter: params.swapRouter,
        halfWidth: params.halfWidth,
        twapWindow: params.twapWindow,
        maxTwapDeviation: params.maxTwapDeviation,
        rebalanceCooldown: params.rebalanceCooldown,
        swapSlippageBps: params.swapSlippageBps,
      },
    ],
    log: true,
    autoMine: true,
    gasLimit: 6_000_000,
    gasPrice,
  });

  const shareToken: string = await read(DEPLOYMENT_NAME, "shareToken");
  if (shareToken !== hre.ethers.ZeroAddress) {
    console.log(`${DEPLOYMENT_NAME} already initialized, share token ${shareToken}`);
    return;
  }

  // Same initialize() as the main vault: three HTS associations, share-token creation and four standing
  // approvals (~5.14M gas estimated; see 00_deploy_tidepool_vault.ts).
  await execute(
    DEPLOYMENT_NAME,
    { from: deployer, value: hre.ethers.parseEther(params.initializeHbar).toString(), gasLimit: 8_000_000, gasPrice },
    "initialize",
    params.shareName,
    params.shareSymbol,
  );
  console.log(`${DEPLOYMENT_NAME} share token: ${await read(DEPLOYMENT_NAME, "shareToken")}`);
};

deployTidepoolVaultNarrow.tags = ["TidepoolVaultNarrow"];
deployTidepoolVaultNarrow.skip = async () => process.env.TIDEPOOL_DEPLOY_NARROW !== "true";
export default deployTidepoolVaultNarrow;
```

Its entry point, `hardhat:deploy:narrow`, sets the opt-in flag inside Node so it works under Yarn and npm on every OS:

`packages/hardhat/scripts/runNarrowDeployWithPK.ts`

```ts
import { spawn } from "child_process";

/**
 * Entry point for `deploy:narrow`. Sets the TIDEPOOL_DEPLOY_NARROW opt-in inside Node (no shell-specific
 * `VAR=value` syntax, so it works under Yarn and npm on Windows, macOS and Linux) and then runs the normal
 * deploy wrapper for ONLY the narrow vault's tag. deploy/01_deploy_tidepool_vault_narrow.ts stays skipped for
 * every other deploy command, because nothing else sets the flag.
 */
const child = spawn(
  "ts-node",
  ["scripts/runHardhatDeployWithPK.ts", "--network", "hederaTestnet", "--tags", "TidepoolVaultNarrow"],
  {
    stdio: "inherit",
    env: { ...process.env, TIDEPOOL_DEPLOY_NARROW: "true" },
    shell: process.platform === "win32",
  },
);
child.on("exit", code => process.exit(code || 0));
```

### 9.7 Tests and mocks

`packages/hardhat/contracts/tidepool/test/Mocks.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { FullMath } from "@uniswap/v4-core/src/libraries/FullMath.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { SqrtPriceMath } from "@uniswap/v4-core/src/libraries/SqrtPriceMath.sol";
import { IHederaTokenService } from "@hiero-ledger/hiero-contracts/token-service/IHederaTokenService.sol";

import { ISaucerSwapV2NonfungiblePositionManager as INPM } from "../interfaces/ISaucerSwapV2.sol";
import { RangeMath } from "../libraries/RangeMath.sol";

/// Test-only doubles. None of these are deployed to a live network.

contract MockToken is ERC20 {
    uint8 private immutable _dec;
    address public minter;

    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _dec = d;
        minter = msg.sender;
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burnFrom(address from, uint256 amount) external {
        require(msg.sender == minter, "not minter");
        _burn(from, amount);
    }
}

/// Etched at 0x167 in unit tests. Implements the HTS calls TidepoolVault makes.
contract MockHts {
    int32 internal constant SUCCESS = 22;
    mapping(address => mapping(address => bool)) public associated;
    mapping(address => address) public treasuryOf;

    function associateTokens(address account, address[] memory tokens) external returns (int64) {
        require(msg.sender == account, "must self-associate");
        for (uint256 i; i < tokens.length; i++) associated[account][tokens[i]] = true;
        return SUCCESS;
    }

    function createFungibleToken(
        IHederaTokenService.HederaToken memory token,
        int64,
        int32 decimals
    ) external payable returns (int64, address) {
        require(msg.value > 0, "creation fee");
        MockToken t = new MockToken(token.name, token.symbol, uint8(uint32(decimals)));
        treasuryOf[address(t)] = token.treasury;
        return (SUCCESS, address(t));
    }

    function mintToken(address token, int64 amount, bytes[] memory) external returns (int64, int64, int64[] memory) {
        require(msg.sender == treasuryOf[token], "not supply key");
        MockToken(token).mint(msg.sender, uint256(uint64(amount)));
        return (SUCCESS, int64(uint64(MockToken(token).totalSupply())), new int64[](0));
    }

    function burnToken(address token, int64 amount, int64[] memory) external returns (int64, int64) {
        require(msg.sender == treasuryOf[token], "not supply key");
        MockToken(token).burnFrom(msg.sender, uint256(uint64(amount)));
        return (SUCCESS, int64(uint64(MockToken(token).totalSupply())));
    }
}

/// Etched at 0x168. 1 HBAR = 7.8 US cents, the testnet rate observed on 24 Sep 2026.
contract MockExchangeRate {
    function tinycentsToTinybars(uint256 tinycents) external pure returns (uint256) {
        return (tinycents * 100) / 780;
    }
}

contract MockFactory {
    uint256 public mintFee = 500_000_000; // 5 US cents, as on testnet
    mapping(bytes32 => address) internal pools;

    function setPool(address a, address b, uint24 f, address p) external {
        pools[keccak256(abi.encode(a, b, f))] = p;
        pools[keccak256(abi.encode(b, a, f))] = p;
    }

    function getPool(address a, address b, uint24 f) external view returns (address) {
        return pools[keccak256(abi.encode(a, b, f))];
    }
}

contract MockPool {
    address public token0;
    address public token1;
    uint24 public fee = 3000;
    int24 public tickSpacing = 60;
    uint160 public sqrtPriceX96;
    int24 public tick;
    int24 public twapTick;
    bool public observeReverts;

    constructor(address t0, address t1) {
        token0 = t0;
        token1 = t1;
    }

    function setPrice(int24 spot, int24 twap) external {
        tick = spot;
        sqrtPriceX96 = TickMath.getSqrtPriceAtTick(spot);
        twapTick = twap;
    }

    function setObserveReverts(bool v) external {
        observeReverts = v;
    }

    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool) {
        return (sqrtPriceX96, tick, 0, 1000, 1000, 0, true);
    }

    function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory tc, uint160[] memory s) {
        require(!observeReverts, "OLD");
        tc = new int56[](2);
        s = new uint160[](2);
        tc[0] = 0;
        tc[1] = int56(twapTick) * int56(uint56(secondsAgos[0]));
    }
}

/// Behaves like the SaucerSwap position manager closely enough for unit tests:
/// liquidity maths is real, the NFT is a plain owner mapping, and fees are injected by the test.
contract MockPositionManager {
    struct Pos {
        int24 lower;
        int24 upper;
        uint128 liquidity;
        uint128 owed0;
        uint128 owed1;
    }

    address public factory;
    address public nft = address(0xBEEF);
    MockPool public pool;
    uint256 public nextSerial = 1;
    uint256 public requiredFee;
    mapping(uint256 => Pos) public pos;
    mapping(uint256 => address) public ownerOf;

    constructor(address f, MockPool p, uint256 feeTinybars) {
        factory = f;
        pool = p;
        requiredFee = feeTinybars;
    }

    function positions(
        uint256 sn
    ) external view returns (address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128) {
        Pos memory q = pos[sn];
        return (pool.token0(), pool.token1(), pool.fee(), q.lower, q.upper, q.liquidity, 0, 0, q.owed0, q.owed1);
    }

    function mint(
        INPM.MintParams calldata p
    ) external payable returns (uint256 sn, uint128 liq, uint256 a0, uint256 a1) {
        require(msg.value >= requiredFee, "MF");
        sn = nextSerial++;
        ownerOf[sn] = p.recipient;
        pos[sn].lower = p.tickLower;
        pos[sn].upper = p.tickUpper;
        (liq, a0, a1) = _add(sn, p.amount0Desired, p.amount1Desired);
    }

    function increaseLiquidity(
        INPM.IncreaseLiquidityParams calldata p
    ) external payable returns (uint128 liq, uint256 a0, uint256 a1) {
        require(msg.value >= requiredFee, "MF");
        (liq, a0, a1) = _add(p.tokenSN, p.amount0Desired, p.amount1Desired);
    }

    function decreaseLiquidity(
        INPM.DecreaseLiquidityParams calldata p
    ) external payable returns (uint256 a0, uint256 a1) {
        require(ownerOf[p.tokenSN] == msg.sender, "not authorized");
        Pos storage q = pos[p.tokenSN];
        (a0, a1) = RangeMath.amountsForLiquidity(pool.sqrtPriceX96(), q.lower, q.upper, p.liquidity);
        q.liquidity -= p.liquidity;
        q.owed0 += uint128(a0);
        q.owed1 += uint128(a1);
    }

    function collect(INPM.CollectParams calldata p) external payable returns (uint256 a0, uint256 a1) {
        require(ownerOf[p.tokenSN] == msg.sender, "not authorized");
        Pos storage q = pos[p.tokenSN];
        (a0, a1) = (q.owed0, q.owed1);
        (q.owed0, q.owed1) = (0, 0);
        _pay(pool.token0(), p.recipient, a0);
        _pay(pool.token1(), p.recipient, a1);
    }

    /// A real pool's reserves change as traders swap; the mock mints any shortfall to stand in for them.
    function _pay(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal < amount) MockToken(token).mint(address(this), amount - bal);
        IERC20(token).transfer(to, amount);
    }

    /// Test hook: simulate swap fees earned by a position.
    function accrueFees(uint256 sn, uint128 f0, uint128 f1) external {
        MockToken(pool.token0()).mint(address(this), f0);
        MockToken(pool.token1()).mint(address(this), f1);
        pos[sn].owed0 += f0;
        pos[sn].owed1 += f1;
    }

    function _add(uint256 sn, uint256 d0, uint256 d1) internal returns (uint128 liq, uint256 a0, uint256 a1) {
        Pos storage q = pos[sn];
        uint160 sp = pool.sqrtPriceX96();
        uint160 sa = TickMath.getSqrtPriceAtTick(q.lower);
        uint160 sb = TickMath.getSqrtPriceAtTick(q.upper);
        liq = _liquidityForAmounts(sp, sa, sb, d0, d1);
        require(liq > 0, "zero liquidity");
        if (sp < sb) a0 = SqrtPriceMath.getAmount0Delta(sp > sa ? sp : sa, sb, liq, true);
        if (sp > sa) a1 = SqrtPriceMath.getAmount1Delta(sa, sp < sb ? sp : sb, liq, true);
        q.liquidity += liq;
        if (a0 > 0) IERC20(pool.token0()).transferFrom(msg.sender, address(this), a0);
        if (a1 > 0) IERC20(pool.token1()).transferFrom(msg.sender, address(this), a1);
    }

    function _liquidityForAmounts(
        uint160 sp,
        uint160 sa,
        uint160 sb,
        uint256 a0,
        uint256 a1
    ) internal pure returns (uint128) {
        uint256 q96 = 2 ** 96;
        if (sp <= sa) return uint128(FullMath.mulDiv(a0, FullMath.mulDiv(sa, sb, q96), sb - sa));
        if (sp >= sb) return uint128(FullMath.mulDiv(a1, q96, sb - sa));
        uint256 l0 = FullMath.mulDiv(a0, FullMath.mulDiv(sp, sb, q96), sb - sp);
        uint256 l1 = FullMath.mulDiv(a1, q96, sp - sa);
        return uint128(l0 < l1 ? l0 : l1);
    }
}

contract MockSwapRouter {
    address public factory;
    MockPool public pool;

    constructor(address f, MockPool p) {
        factory = f;
        pool = p;
    }

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// Fills at the pool's spot price minus the fee tier. No price impact.
    function exactInputSingle(ExactInputSingleParams calldata p) external payable returns (uint256 out) {
        IERC20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        uint256 net = (p.amountIn * (1_000_000 - p.fee)) / 1_000_000;
        out = p.tokenIn == pool.token0()
            ? RangeMath.token0ToToken1(net, pool.sqrtPriceX96())
            : RangeMath.token1ToToken0(net, pool.sqrtPriceX96());
        require(out >= p.amountOutMinimum, "Too little received");
        MockToken(p.tokenOut).mint(p.recipient, out);
    }
}
```

`packages/hardhat/test/TidepoolVault.test.ts`

```ts
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const HTS = "0x0000000000000000000000000000000000000167";
const EXCHANGE_RATE = "0x0000000000000000000000000000000000000168";
// tinycentsToTinybars(500_000_000) with the mock rate, plus SaucerSwap's 1-tinybar slop.
const MINT_FEE = (500_000_000n * 100n) / 780n + 1n;

async function etch(address: string, contractName: string) {
  const impl = await (await ethers.getContractFactory(contractName)).deploy();
  const code = await ethers.provider.getCode(await impl.getAddress());
  await network.provider.send("hardhat_setCode", [address, code]);
}

async function deployFixture() {
  const [deployer, alice, bob, keeper] = await ethers.getSigners();
  await etch(HTS, "MockHts");
  await etch(EXCHANGE_RATE, "MockExchangeRate");

  const Token = await ethers.getContractFactory("MockToken");
  // Order the pair like SaucerSwap does: token0 has the lower address.
  const a = await Token.deploy("Wrapped HBAR", "WHBAR", 8);
  const b = await Token.deploy("Sauce", "SAUCE", 6);
  const [t0, t1] = BigInt(await a.getAddress()) < BigInt(await b.getAddress()) ? [a, b] : [b, a];

  const pool = await (await ethers.getContractFactory("MockPool")).deploy(await t0.getAddress(), await t1.getAddress());
  await pool.setPrice(-7680, -7680);
  const factory = await (await ethers.getContractFactory("MockFactory")).deploy();
  await factory.setPool(await t0.getAddress(), await t1.getAddress(), 3000, await pool.getAddress());
  const npm = await (
    await ethers.getContractFactory("MockPositionManager")
  ).deploy(await factory.getAddress(), await pool.getAddress(), MINT_FEE);
  const router = await (
    await ethers.getContractFactory("MockSwapRouter")
  ).deploy(await factory.getAddress(), await pool.getAddress());

  const vault = await (
    await ethers.getContractFactory("TidepoolVault")
  ).deploy({
    pool: await pool.getAddress(),
    positionManager: await npm.getAddress(),
    swapRouter: await router.getAddress(),
    halfWidth: 600,
    twapWindow: 600,
    maxTwapDeviation: 100,
    rebalanceCooldown: 3600,
    swapSlippageBps: 100,
  });
  await vault.initialize("Tidepool WHBAR-SAUCE", "tpWS", { value: ethers.parseEther("1") });
  const share = await ethers.getContractAt("MockToken", await vault.shareToken());

  for (const user of [alice, bob]) {
    await t0.mint(user.address, 10n ** 30n);
    await t1.mint(user.address, 10n ** 30n);
    await t0.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
    await t1.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
    await share.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
  }
  return { deployer, alice, bob, keeper, t0, t1, pool, npm, router, vault, share };
}

describe("TidepoolVault", function () {
  describe("setup", function () {
    it("rejects a pool the factory does not know", async function () {
      const { npm, router } = await loadFixture(deployFixture);
      const other = await (
        await ethers.getContractFactory("MockPool")
      ).deploy(ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address);
      await expect(
        (await ethers.getContractFactory("TidepoolVault")).deploy({
          pool: await other.getAddress(),
          positionManager: await npm.getAddress(),
          swapRouter: await router.getAddress(),
          halfWidth: 600,
          twapWindow: 600,
          maxTwapDeviation: 100,
          rebalanceCooldown: 3600,
          swapSlippageBps: 100,
        }),
      ).to.be.revertedWithCustomError(await ethers.getContractFactory("TidepoolVault"), "InvalidConfig");
    });

    it("only lets the deployer initialize, once", async function () {
      const { vault, alice } = await loadFixture(deployFixture);
      await expect(vault.connect(alice).initialize("x", "y", { value: 1 })).to.be.revertedWithCustomError(
        vault,
        "NotDeployer",
      );
      await expect(vault.initialize("x", "y", { value: 1 })).to.be.revertedWithCustomError(vault, "AlreadyInitialized");
    });
  });

  describe("deposit and compound", function () {
    it("mints initial shares minus dead shares on the first deposit", async function () {
      const { vault, share, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      expect(await share.balanceOf(alice.address)).to.equal(
        (await vault.INITIAL_SHARES()) - (await vault.DEAD_SHARES()),
      );
      expect(await vault.totalShares()).to.equal(await vault.INITIAL_SHARES());
    });

    it("compound mints the first position centred on the TWAP tick and refunds spare HBAR", async function () {
      const { vault, alice, keeper, npm } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      const before = await ethers.provider.getBalance(keeper.address);
      const tx = await vault.connect(keeper).compound({ value: MINT_FEE * 3n });
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;
      expect(before - (await ethers.provider.getBalance(keeper.address)) - gas).to.equal(MINT_FEE);
      expect(await vault.positionSerial()).to.equal(1n);
      expect(await vault.tickLower()).to.equal(-7680 - 600);
      expect(await vault.tickUpper()).to.equal(-7680 + 600);
      const [, , , , , liquidity] = await npm.positions(1);
      expect(liquidity).to.be.greaterThan(0n);
    });

    it("reverts compound when msg.value is below the position fee", async function () {
      const { vault, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await expect(vault.compound({ value: MINT_FEE - 1n })).to.be.revertedWithCustomError(vault, "InsufficientFee");
    });

    it("prices later deposits pro rata, so a second depositor cannot dilute the first", async function () {
      const { vault, share, alice, bob } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      const [total0, total1] = await vault.getTotalAmounts();
      await vault.connect(bob).deposit(total0, total1, 0, bob.address); // double the vault
      const supply = await vault.totalShares();
      expect(await share.balanceOf(bob.address)).to.be.closeTo(supply / 2n, supply / 1_000_000n);
    });

    it("refuses deposits while spot is far from the TWAP", async function () {
      const { vault, pool, alice } = await loadFixture(deployFixture);
      await pool.setPrice(-7680 + 500, -7680);
      await expect(vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address)).to.be.revertedWithCustomError(
        vault,
        "PriceDeviation",
      );
    });

    it("surfaces an unusable pool oracle as TwapUnavailable", async function () {
      const { vault, pool, alice } = await loadFixture(deployFixture);
      await pool.setObserveReverts(true);
      await expect(vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address)).to.be.revertedWithCustomError(
        vault,
        "TwapUnavailable",
      );
    });

    it("refuses a first compound when the vault holds nothing", async function () {
      const { vault } = await loadFixture(deployFixture);
      await expect(vault.compound({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "NothingToCompound");
    });

    it("grants standing manager and router allowances once, so compound works twice without re-approving", async function () {
      const { vault, t0, t1, npm, router, alice, bob } = await loadFixture(deployFixture);
      const standing = 2n ** 63n - 1n; // type(int64).max
      for (const token of [t0, t1]) {
        expect(await token.allowance(await vault.getAddress(), await npm.getAddress())).to.equal(standing);
        expect(await token.allowance(await vault.getAddress(), await router.getAddress())).to.equal(standing);
      }
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      const [, , , , , liqBefore] = await npm.positions(1);

      await vault.connect(bob).deposit(10n ** 10n, 10n ** 9n, 0, bob.address);
      const tx = vault.compound({ value: MINT_FEE });
      await expect(tx).to.emit(vault, "Compound");
      await expect(tx).to.not.emit(t0, "Approval");
      await expect(tx).to.not.emit(t1, "Approval");
      const [, , , , , liqAfter] = await npm.positions(1);
      expect(liqAfter).to.be.greaterThan(liqBefore);
    });

    it("refuses to compound into a position whose range no longer contains the TWAP", async function () {
      const { vault, pool, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      await pool.setPrice(-7680 + 900, -7680 + 900);
      await expect(vault.compound({ value: MINT_FEE }))
        .to.be.revertedWithCustomError(vault, "OutOfRange")
        .withArgs(-7680 + 900);
    });

    it("makes a share-price inflation attack unprofitable", async function () {
      const { vault, share, t0, t1, alice, bob } = await loadFixture(deployFixture);
      // Attacker (alice) deposits dust, then donates a large amount directly to the vault.
      await vault.connect(alice).deposit(1n, 1n, 0, alice.address);
      await t0.connect(alice).transfer(await vault.getAddress(), 10n ** 12n);
      await t1.connect(alice).transfer(await vault.getAddress(), 10n ** 11n);
      // Victim deposits the same scale; the fixed 1e10 initial shares keep rounding loss negligible.
      await vault.connect(bob).deposit(10n ** 12n, 10n ** 11n, 1, bob.address);
      const supply = await vault.totalShares();
      expect(await share.balanceOf(bob.address)).to.be.closeTo(supply / 2n, supply / 1_000_000n);
    });
  });

  describe("fees", function () {
    it("collects fees and compounds them into the position", async function () {
      const { vault, npm, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      const [, , , , , liqBefore] = await npm.positions(1);
      await npm.accrueFees(1, 10n ** 8n, 10n ** 7n);
      await expect(vault.compound({ value: MINT_FEE }))
        .to.emit(vault, "FeesCollected")
        .withArgs(10n ** 8n, 10n ** 7n);
      const [, , , , , liqAfter] = await npm.positions(1);
      expect(liqAfter).to.be.greaterThan(liqBefore);
    });
  });

  describe("withdraw", function () {
    it("returns the pro-rata slice of position and idle balances and burns the shares", async function () {
      const { vault, share, t0, t1, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      const shares = await share.balanceOf(alice.address);
      const [total0, total1] = await vault.getTotalAmounts();
      const b0 = await t0.balanceOf(alice.address);
      const b1 = await t1.balanceOf(alice.address);

      await vault.connect(alice).withdraw(shares, 0, 0, alice.address);

      const supply = shares + (await vault.DEAD_SHARES());
      expect((await t0.balanceOf(alice.address)) - b0).to.be.closeTo((total0 * shares) / supply, 10n);
      expect((await t1.balanceOf(alice.address)) - b1).to.be.closeTo((total1 * shares) / supply, 10n);
      expect(await vault.totalShares()).to.equal(await vault.DEAD_SHARES());
      expect(await share.balanceOf(alice.address)).to.equal(0n);
    });

    it("enforces the caller's minimum amounts", async function () {
      const { vault, share, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      const shares = await share.balanceOf(alice.address);
      await expect(vault.connect(alice).withdraw(shares, 10n ** 20n, 0, alice.address)).to.be.revertedWithCustomError(
        vault,
        "SlippageExceeded",
      );
    });

    it("still works when the TWAP guard would block deposits", async function () {
      const { vault, share, pool, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      await pool.setPrice(-7680 + 500, -7680);
      await expect(vault.connect(alice).withdraw(await share.balanceOf(alice.address), 0, 0, alice.address)).to.not.be
        .reverted;
    });
  });

  describe("rebalance", function () {
    async function withPosition() {
      const f = await loadFixture(deployFixture);
      await f.vault.connect(f.alice).deposit(10n ** 10n, 10n ** 9n, 0, f.alice.address);
      await f.vault.compound({ value: MINT_FEE });
      return f;
    }

    it("refuses while the TWAP tick is still in range", async function () {
      const { vault } = await withPosition();
      await time.increase(3601);
      await expect(vault.rebalance({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "StillInRange");
    });

    it("refuses during the cooldown", async function () {
      const { vault, pool } = await withPosition();
      await pool.setPrice(-7680 + 900, -7680 + 900);
      await expect(vault.rebalance({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "CooldownActive");
    });

    it("refuses when spot has been pushed away from the TWAP (sandwich guard)", async function () {
      const { vault, pool } = await withPosition();
      await time.increase(3601);
      await pool.setPrice(-7680 + 2000, -7680 + 900);
      await expect(vault.rebalance({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "PriceDeviation");
    });

    it("surfaces an unusable pool oracle as TwapUnavailable", async function () {
      const { vault, pool } = await withPosition();
      await time.increase(3601);
      await pool.setObserveReverts(true);
      await expect(vault.rebalance({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "TwapUnavailable");
    });

    it("re-centres on the TWAP tick with a new position and keeps value", async function () {
      const { vault, pool, npm } = await withPosition();
      await time.increase(3601);
      await pool.setPrice(-7680 + 900, -7680 + 900);
      const [v0, v1] = await vault.getTotalAmounts();

      await expect(vault.rebalance({ value: MINT_FEE })).to.emit(vault, "Rebalance");

      expect(await vault.positionSerial()).to.equal(2n);
      expect(await vault.tickLower()).to.equal(-7680 + 900 - 600);
      expect(await vault.tickUpper()).to.equal(-7680 + 900 + 600);
      const [, , , , , oldLiquidity] = await npm.positions(1);
      expect(oldLiquidity).to.equal(0n);

      // Value in token1 terms may only drop by the swap fee on the rebalanced slice (0.3%).
      const [a0, a1] = await vault.getTotalAmounts();
      const sqrtP = (await pool.slot0())[0];
      const toT1 = (x: bigint) => (((x * sqrtP) >> 96n) * sqrtP) >> 96n;
      const before = toT1(v0) + v1;
      const after = toT1(a0) + a1;
      expect(after).to.be.greaterThanOrEqual((before * 997n) / 1000n);
    });
  });
});
```

### 9.8 Live scripts

`packages/hardhat/scripts/runScriptWithPK.ts`

```ts
import * as dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import password from "@inquirer/password";
import { spawn } from "child_process";

/**
 * Decrypts the deployer key (created by `account:generate` / `account:import`) and runs
 * `hardhat run <script> --network <network>` with it, the same way runHardhatDeployWithPK.ts runs deploys.
 * Usage: ts-node scripts/runScriptWithPK.ts scripts/tidepoolSmoke.ts --network hederaTestnet
 */
async function main() {
  const [script, ...rest] = process.argv.slice(2);
  if (!script) throw new Error("Pass the script path, e.g. scripts/tidepoolSmoke.ts");

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    console.log(
      "🚫️ No deployer account. Run `npm run hardhat:account:generate` or `npm run hardhat:account:import` first.",
    );
    process.exit(1);
  }
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);
  process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY = wallet.privateKey;

  const child = spawn("hardhat", ["run", script, ...rest], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  child.on("exit", code => process.exit(code || 0));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
```

`packages/hardhat/scripts/tidepoolSmoke.ts`

```ts
/**
 * End-to-end run against the live testnet vault. Produces the HashScan links used as bounty evidence.
 *   1. associate the deployer with WHBAR, SAUCE and the share token (HIP-719 facade)
 *   2. wrap HBAR through SaucerSwap's WhbarHelper (never the WHBAR contract directly)
 *   3. buy SAUCE through the SaucerSwap V2 router
 *   4. approve + deposit into the vault
 *   5. compound() - mints the first position, paying SaucerSwap's HBAR position fee (fixed 8M gas: a position
 *      mint cannot be simulated on Hedera, see tidepoolCompound.ts)
 *
 * Run: npm run hardhat:smoke   (wraps: ts-node scripts/runScriptWithPK.ts scripts/tidepoolSmoke.ts --network hederaTestnet)
 */
import hre from "hardhat";
import { TINYBAR_TO_WEIBAR, gasLimitFor, hashscan } from "./tidepoolScriptUtils";

const WHBAR_HELPER = "0x000000000000000000000000000000000050a8a7"; // testnet 0.0.5286055
const COMPOUND_GAS_LIMIT = 8_000_000n; // first compound on testnet used 5,128,563
const HTS_FACADE_ABI = [
  "function isAssociated() view returns (bool)",
  "function associate() returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)",
  "function refundETH() payable",
  "function multicall(bytes[]) payable returns (bytes[])",
];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get("TidepoolVault")).address, signer);

  const [token0, token1, shareToken, fee, router] = await Promise.all([
    vault.token0(),
    vault.token1(),
    vault.shareToken(),
    vault.fee(),
    vault.swapRouter(),
  ]);

  for (const token of [token0, token1, shareToken]) {
    const facade = new ethers.Contract(token, HTS_FACADE_ABI, signer);
    if (!(await facade.isAssociated())) {
      const gasLimit = await gasLimitFor(`associate ${token}`, facade.associate.estimateGas());
      const tx = await facade.associate({ gasLimit });
      console.log(`associate ${token}: ${hashscan((await tx.wait())!.hash)}`);
    }
  }

  const wrapHbar = ethers.parseEther(process.env.WRAP_HBAR ?? "20");
  const helper = new ethers.Contract(WHBAR_HELPER, ["function deposit() payable"], signer);
  const wrapGas = await gasLimitFor("wrap HBAR", helper.deposit.estimateGas({ value: wrapHbar }));
  const wrapTx = await helper.deposit({ value: wrapHbar, gasLimit: wrapGas });
  console.log(`wrap HBAR -> WHBAR: ${hashscan((await wrapTx.wait())!.hash)}`);

  // Buy SAUCE with HBAR: the router wraps msg.value itself when tokenIn is WHBAR; refundETH returns the rest.
  const buyHbar = ethers.parseEther(process.env.BUY_HBAR ?? "20");
  const r = new ethers.Contract(router, ROUTER_ABI, signer);
  const swapData = r.interface.encodeFunctionData("exactInputSingle", [
    {
      tokenIn: token0,
      tokenOut: token1,
      fee,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 300,
      amountIn: buyHbar / TINYBAR_TO_WEIBAR,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    },
  ]);
  const buyCalls = [swapData, r.interface.encodeFunctionData("refundETH")];
  const buyGas = await gasLimitFor("buy SAUCE", r.multicall.estimateGas(buyCalls, { value: buyHbar }));
  const buyTx = await r.multicall(buyCalls, { value: buyHbar, gasLimit: buyGas });
  console.log(`buy SAUCE: ${hashscan((await buyTx.wait())!.hash)}`);

  const t0 = new ethers.Contract(token0, HTS_FACADE_ABI, signer);
  const t1 = new ethers.Contract(token1, HTS_FACADE_ABI, signer);
  const [bal0, bal1] = await Promise.all([t0.balanceOf(signer.address), t1.balanceOf(signer.address)]);
  for (const [token, amount] of [
    [t0, bal0],
    [t1, bal1],
  ] as const) {
    const spender = await vault.getAddress();
    const gasLimit = await gasLimitFor(
      `approve ${await token.getAddress()}`,
      token.approve.estimateGas(spender, amount),
    );
    await (await token.approve(spender, amount, { gasLimit })).wait();
  }

  const depositGas = await gasLimitFor("deposit", vault.deposit.estimateGas(bal0, bal1, 0, signer.address));
  const depositTx = await vault.deposit(bal0, bal1, 0, signer.address, { gasLimit: depositGas });
  console.log(`deposit: ${hashscan((await depositTx.wait())!.hash)}`);

  const feeTinybars = await vault.quoteMintFee.staticCall();
  const compoundValue = (feeTinybars + 100_000_000n) * TINYBAR_TO_WEIBAR; // fee + 1 HBAR headroom, refunded
  const compoundTx = await vault.compound({ value: compoundValue, gasLimit: COMPOUND_GAS_LIMIT });
  console.log(`compound (first position): ${hashscan((await compoundTx.wait())!.hash)}`);
  console.log(
    `position serial: ${await vault.positionSerial()}, range [${await vault.tickLower()}, ${await vault.tickUpper()})`,
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

`packages/hardhat/scripts/simulateTraders.ts`

```ts
/**
 * Swaps back and forth through the vault's pool so the position accrues real swap fees for the demo.
 * Each round: HBAR -> SAUCE (router wraps msg.value), then SAUCE -> WHBAR.
 * Run: npm run hardhat:simulate-traders   (ROUNDS=3 AMOUNT_HBAR=5 by default)
 */
import hre from "hardhat";

const TINYBAR_TO_WEIBAR = 10_000_000_000n;
const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)",
  "function refundETH() payable",
  "function multicall(bytes[]) payable returns (bytes[])",
];
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get("TidepoolVault")).address);
  const [token0, token1, fee, routerAddress] = await Promise.all([
    vault.token0(),
    vault.token1(),
    vault.fee(),
    vault.swapRouter(),
  ]);
  const router = new ethers.Contract(routerAddress, ROUTER_ABI, signer);
  const sauce = new ethers.Contract(token1, ERC20_ABI, signer);
  const rounds = Number(process.env.ROUNDS ?? "3");
  const amount = ethers.parseEther(process.env.AMOUNT_HBAR ?? "5");
  const deadline = () => Math.floor(Date.now() / 1000) + 300;

  for (let i = 0; i < rounds; i++) {
    const buy = router.interface.encodeFunctionData("exactInputSingle", [
      {
        tokenIn: token0,
        tokenOut: token1,
        fee,
        recipient: signer.address,
        deadline: deadline(),
        amountIn: amount / TINYBAR_TO_WEIBAR,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      },
    ]);
    await (
      await router.multicall([buy, router.interface.encodeFunctionData("refundETH")], {
        value: amount,
        gasLimit: 1_000_000,
      })
    ).wait();

    const sauceBalance: bigint = await sauce.balanceOf(signer.address);
    await (await sauce.approve(routerAddress, sauceBalance, { gasLimit: 1_000_000 })).wait();
    const sellTx = await router.exactInputSingle(
      {
        tokenIn: token1,
        tokenOut: token0,
        fee,
        recipient: signer.address,
        deadline: deadline(),
        amountIn: sauceBalance,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      },
      { gasLimit: 1_000_000 },
    );
    console.log(`round ${i + 1}: https://hashscan.io/testnet/transaction/${(await sellTx.wait())!.hash}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

`packages/hardhat/scripts/verifySourcify.ts`

```ts
/**
 * Verifies a deployed contract on Sourcify with the APIv2 endpoint (HashScan reads Sourcify).
 * hardhat-verify 2.1.x still calls Sourcify's retired v1 routes, which now return 404.
 *
 * Usage: npx hardhat run scripts/verifySourcify.ts --network hederaTestnet
 *        (CONTRACT=TidepoolVault by default; reads the address from hardhat-deploy)
 */
import hre from "hardhat";

const SOURCIFY = "https://sourcify.dev/server";

async function main() {
  const contractName = process.env.CONTRACT ?? "TidepoolVault";
  const deployment = await hre.deployments.get(contractName);
  const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString();

  const artifact = await hre.artifacts.readArtifact(contractName);
  const fqn = `${artifact.sourceName}:${artifact.contractName}`;
  const buildInfo = await hre.artifacts.getBuildInfo(fqn);
  if (!buildInfo) throw new Error(`No build info for ${fqn}. Run npm run hardhat:compile first.`);

  const body = {
    stdJsonInput: buildInfo.input,
    compilerVersion: buildInfo.solcLongVersion,
    contractIdentifier: fqn,
    creationTransactionHash: deployment.transactionHash,
  };
  const submit = await fetch(`${SOURCIFY}/v2/verify/${chainId}/${deployment.address}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const submitted = await submit.json();
  if (submit.status === 409) {
    console.log(`Already verified: ${deployment.address}`);
    return;
  }
  if (submit.status !== 202)
    throw new Error(`Sourcify rejected the request (${submit.status}): ${JSON.stringify(submitted)}`);

  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const job = await (await fetch(`${SOURCIFY}/v2/verify/${submitted.verificationId}`)).json();
    if (!job.isJobCompleted) continue;
    if (job.error) throw new Error(`Verification failed: ${job.error.message}`);
    const network = chainId === "295" ? "mainnet" : "testnet";
    console.log(`Verified (${job.contract?.match}): https://hashscan.io/${network}/contract/${deployment.address}`);
    return;
  }
  throw new Error(`Timed out waiting for Sourcify job ${submitted.verificationId}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

Shared helpers for the operator scripts (nothing here sends a transaction):

`packages/hardhat/scripts/tidepoolScriptUtils.ts`

```ts
/**
 * Shared helpers for the Tidepool testnet operator scripts (deposit, move-price, rebalance).
 * Nothing here sends a transaction.
 */
import { createInterface } from "readline/promises";

export const HEDERA_MAX_GAS = 15_000_000n; // per-transaction gas limit on Hedera
export const TINYBAR_TO_WEIBAR = 10_000_000_000n; // JSON-RPC value is 18 decimals, the EVM sees 8
const MIRROR_NODE = "https://testnet.mirrornode.hedera.com/api/v1";

export const hashscan = (hash: string) => `https://hashscan.io/testnet/transaction/${hash}`;

/** Reads a required environment variable or stops the script before anything is sent. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") throw new Error(`Set ${name} before running this script (nothing was sent).`);
  return value.trim();
}

/** Asks on the terminal; only an explicit "yes" continues. */
export async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

/** eth_estimateGas x 1.3, capped at Hedera's limit. Never guesses: a failed estimate stops the script. */
export async function gasLimitFor(label: string, estimate: Promise<bigint>): Promise<bigint> {
  let estimated: bigint;
  try {
    estimated = await estimate;
  } catch (error) {
    throw new Error(`${label}: eth_estimateGas failed, so nothing was sent. Cause: ${(error as Error).message}`);
  }
  const limit = (estimated * 130n) / 100n;
  const capped = limit > HEDERA_MAX_GAS ? HEDERA_MAX_GAS : limit;
  console.log(`${label}: estimated ${estimated} gas, sending with limit ${capped}`);
  return capped;
}

/**
 * Hedera ID ("0.0.N") for an EVM address. HTS facades may report a contract as its EVM address or as its
 * long-zero form (0x000...N), so ownership checks compare Hedera IDs, resolved through the mirror node.
 */
export async function hederaIdOf(address: string): Promise<string> {
  const hex = address.toLowerCase().replace(/^0x/, "");
  if (/^0{24}/.test(hex)) return `0.0.${BigInt("0x" + hex)}`;
  for (const kind of ["contracts", "accounts"]) {
    const res = await fetch(`${MIRROR_NODE}/${kind}/0x${hex}`);
    if (!res.ok) continue;
    const body = (await res.json()) as { contract_id?: string; account?: string };
    const id = body.contract_id ?? body.account;
    if (id) return id;
  }
  throw new Error(`Mirror node could not resolve ${address} to a Hedera ID`);
}

/** Largest multiple of `spacing` <= tick (matches RangeMath.floorToSpacing). */
export function floorToSpacing(tick: number, spacing: number): number {
  return Math.floor(tick / spacing) * spacing;
}

/** Range the vault will mint around `centerTick` (matches RangeMath.rangeAround, including the clamp). */
export function rangeAround(centerTick: number, spacing: number, halfWidth: number): [number, number] {
  const MAX_TICK = 887272;
  const maxUsable = Math.trunc(MAX_TICK / spacing) * spacing;
  const center = floorToSpacing(centerTick, spacing);
  return [Math.max(center - halfWidth, -maxUsable), Math.min(center + halfWidth, maxUsable)];
}

/** Tick for a sqrtPriceX96 (floor of log base 1.0001 of the price). Display only. */
export function tickAtSqrtPrice(sqrtPriceX96: bigint): number {
  return Math.floor(Math.log(Number(sqrtPriceX96) ** 2 / 2 ** 192) / Math.log(1.0001));
}
```

Compound only (fixed 8M gas; `TIDEPOOL_VAULT` selects the vault, default the main one):

`packages/hardhat/scripts/tidepoolCompound.ts`

```ts
/**
 * Sends only compound() to the live testnet vault (opens the first position when none exists).
 *
 * The gas limit is fixed because compound() cannot be pre-checked with eth_estimateGas / eth_call on Hedera:
 * SaucerSwap's position manager mints the LP NFT through HTS and then transfers that serial, and the
 * network's simulation returns INVALID_NFT_ID for that sequence even for mints that succeed on-chain.
 *
 * Run: npm run hardhat:compound   (wraps: ts-node scripts/runScriptWithPK.ts scripts/tidepoolCompound.ts --network hederaTestnet)
 *      TIDEPOOL_VAULT selects the hardhat-deploy deployment name (default "TidepoolVault", the main vault).
 */
import hre from "hardhat";
import { TINYBAR_TO_WEIBAR, hashscan } from "./tidepoolScriptUtils";

const COMPOUND_GAS_LIMIT = 8_000_000n;
const FEE_HEADROOM_TINYBARS = 100_000_000n; // 1 HBAR on top of the position fee; the vault refunds the surplus

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vaultName = process.env.TIDEPOOL_VAULT ?? "TidepoolVault";
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get(vaultName)).address, signer);
  console.log(`vault: ${vaultName} at ${await vault.getAddress()}`);

  const feeTinybars = await vault.quoteMintFee.staticCall();
  const value = (feeTinybars + FEE_HEADROOM_TINYBARS) * TINYBAR_TO_WEIBAR;
  console.log(`position serial before: ${await vault.positionSerial()}`);
  console.log(`position fee: ${ethers.formatUnits(feeTinybars, 8)} HBAR, sending ${ethers.formatEther(value)} HBAR`);
  console.log(`gas limit: ${COMPOUND_GAS_LIMIT} (fixed; see the note at the top of this file)`);

  const tx = await vault.compound({ value, gasLimit: COMPOUND_GAS_LIMIT });
  console.log(`compound sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`compound mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);
  console.log(
    `position serial: ${await vault.positionSerial()}, range [${await vault.tickLower()}, ${await vault.tickUpper()})`,
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

Partial withdraw with two confirmations:

`packages/hardhat/scripts/tidepoolWithdraw.ts`

```ts
/**
 * Withdraws a slice of the deployer's vault shares from the live testnet vault (default 10%).
 *
 * Flow: show the plan (preview from getTotalAmounts) -> ask for confirmation -> approve the vault to pull the
 * shares (only if the allowance is short) -> exact preview with a static withdraw() call -> send withdraw()
 * with minimum amounts 1% under that preview. Both transactions get eth_estimateGas x 1.3; if estimation
 * fails the script stops instead of guessing a gas limit. Unlike a position mint, withdraw() simulates fine
 * on Hedera once the share allowance exists.
 *
 * Run: npm run hardhat:withdraw   (wraps: ts-node scripts/runScriptWithPK.ts scripts/tidepoolWithdraw.ts --network hederaTestnet)
 *      WITHDRAW_BPS=1000 by default (10% of your shares, in basis points)
 *      TIDEPOOL_VAULT selects the hardhat-deploy deployment name (default "TidepoolVault", the main vault).
 */
import hre from "hardhat";
import { confirm, gasLimitFor, hashscan } from "./tidepoolScriptUtils";

const SHARE_DECIMALS = 8;
const SLIPPAGE_BPS = 100n; // min amounts are 1% below the exact preview
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const POSITION_MANAGER_ABI = [
  "function positions(uint256) view returns (address,address,uint24,int24,int24,uint128 liquidity,uint256,uint256,uint128 tokensOwed0,uint128 tokensOwed1)",
];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vaultName = process.env.TIDEPOOL_VAULT ?? "TidepoolVault";
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get(vaultName)).address, signer);
  const vaultAddress = await vault.getAddress();
  console.log(`vault: ${vaultName} at ${vaultAddress}`);

  const [token0, token1, shareTokenAddress, managerAddress] = await Promise.all([
    vault.token0(),
    vault.token1(),
    vault.shareToken(),
    vault.positionManager(),
  ]);
  const t0 = new ethers.Contract(token0, ERC20_ABI, signer);
  const t1 = new ethers.Contract(token1, ERC20_ABI, signer);
  const shareToken = new ethers.Contract(shareTokenAddress, ERC20_ABI, signer);
  const manager = new ethers.Contract(managerAddress, POSITION_MANAGER_ABI, signer);
  const [symbol0, symbol1, decimals0, decimals1] = await Promise.all([
    new ethers.Contract(token0, ["function symbol() view returns (string)"], signer).symbol(),
    new ethers.Contract(token1, ["function symbol() view returns (string)"], signer).symbol(),
    new ethers.Contract(token0, ["function decimals() view returns (uint8)"], signer).decimals(),
    new ethers.Contract(token1, ["function decimals() view returns (uint8)"], signer).decimals(),
  ]);

  const printState = async (label: string) => {
    const serial = await vault.positionSerial();
    const liquidity = serial === 0n ? 0n : (await manager.positions(serial)).liquidity;
    console.log(`--- ${label}`);
    console.log(`  your shares: ${ethers.formatUnits(await shareToken.balanceOf(signer.address), SHARE_DECIMALS)}`);
    console.log(`  total shares: ${ethers.formatUnits(await vault.totalShares(), SHARE_DECIMALS)}`);
    console.log(`  position: serial ${serial}, liquidity ${liquidity}`);
    console.log(
      `  vault idle: ${ethers.formatUnits(await t0.balanceOf(vaultAddress), decimals0)} ${symbol0}, ` +
        `${ethers.formatUnits(await t1.balanceOf(vaultAddress), decimals1)} ${symbol1}`,
    );
    console.log(
      `  your wallet: ${ethers.formatUnits(await t0.balanceOf(signer.address), decimals0)} ${symbol0}, ` +
        `${ethers.formatUnits(await t1.balanceOf(signer.address), decimals1)} ${symbol1}`,
    );
  };

  const bps = BigInt(process.env.WITHDRAW_BPS ?? "1000");
  if (bps <= 0n || bps > 10_000n) throw new Error("WITHDRAW_BPS must be between 1 and 10000");
  const userShares: bigint = await shareToken.balanceOf(signer.address);
  const shares = (userShares * bps) / 10_000n;
  if (shares === 0n) throw new Error("You have no vault shares to withdraw");

  await printState("before");
  const supply = await vault.totalShares();
  const [total0, total1] = await vault.getTotalAmounts();
  console.log(`\nPlan: withdraw ${ethers.formatUnits(shares, SHARE_DECIMALS)} shares (${Number(bps) / 100}% of yours)`);
  console.log(
    `  rough preview (getTotalAmounts, excludes uncollected fees): ` +
      `${ethers.formatUnits((total0 * shares) / supply, decimals0)} ${symbol0} + ` +
      `${ethers.formatUnits((total1 * shares) / supply, decimals1)} ${symbol1}`,
  );
  console.log(`  receiver: ${signer.address}`);

  if (!(await confirm("Send the approval (if needed) and the withdrawal? Type 'yes' to continue: "))) {
    console.log("Aborted. Nothing was sent.");
    return;
  }

  const allowance: bigint = await shareToken.allowance(signer.address, vaultAddress);
  if (allowance < shares) {
    const gasLimit = await gasLimitFor("approve shares", shareToken.approve.estimateGas(vaultAddress, shares));
    const approveTx = await shareToken.approve(vaultAddress, shares, { gasLimit });
    console.log(`approve sent: ${hashscan(approveTx.hash)}`);
    const approveReceipt = await approveTx.wait();
    console.log(`approve mined: status ${approveReceipt!.status}, gas used ${approveReceipt!.gasUsed}`);
  } else {
    console.log(
      `share allowance already covers ${ethers.formatUnits(shares, SHARE_DECIMALS)} shares; no approval sent`,
    );
  }

  // Exact preview: simulate the real call (collect, remove liquidity, collect) against current state.
  const [preview0, preview1] = await vault.withdraw.staticCall(shares, 0, 0, signer.address);
  const min0 = (preview0 * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  const min1 = (preview1 * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  console.log(
    `exact preview: ${ethers.formatUnits(preview0, decimals0)} ${symbol0} + ${ethers.formatUnits(preview1, decimals1)} ${symbol1}`,
  );
  console.log(
    `minimums (1% below): ${ethers.formatUnits(min0, decimals0)} ${symbol0}, ${ethers.formatUnits(min1, decimals1)} ${symbol1}`,
  );

  if (!(await confirm("Proceed with the withdrawal? Type 'yes' to continue: "))) {
    console.log("Aborted before withdraw(). Any share approval sent above stays in place for this exact amount.");
    return;
  }

  const withdrawGas = await gasLimitFor("withdraw", vault.withdraw.estimateGas(shares, min0, min1, signer.address));
  const tx = await vault.withdraw(shares, min0, min1, signer.address, { gasLimit: withdrawGas });
  console.log(`withdraw sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`withdraw mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);

  await printState("after");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

Exact-amount deposit into a named vault:

`packages/hardhat/scripts/tidepoolDeposit.ts`

```ts
/**
 * Deposits EXACT token amounts into a chosen Tidepool vault. Unlike tidepoolSmoke.ts it never wraps HBAR,
 * never buys tokens and never deposits your whole balance.
 *
 * Flow: show the plan -> "yes" -> associate the vault's share token (only if needed) -> approve each token
 * for its exact amount (only if the allowance is short) -> exact share preview via a static deposit() call ->
 * second "yes" -> deposit(). Every transaction uses eth_estimateGas x 1.3 and stops if estimation fails.
 *
 * Run (PowerShell):
 *   $env:TIDEPOOL_VAULT="TidepoolVaultNarrow"; $env:DEPOSIT0="2"; $env:DEPOSIT1="93"
 *   node .yarn/releases/yarn-3.2.3.cjs hardhat:deposit
 * DEPOSIT0 / DEPOSIT1 are in whole tokens of the vault's token0 / token1 (for WHBAR/SAUCE: WHBAR, SAUCE).
 * For a vault that already holds assets, the vault takes at most these amounts, in its current ratio.
 */
import hre from "hardhat";
import { confirm, gasLimitFor, hashscan, requireEnv } from "./tidepoolScriptUtils";

const SHARE_DECIMALS = 8;
const SLIPPAGE_BPS = 100n; // minShares is 1% below the exact preview
const TOKEN_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function isAssociated() view returns (bool)",
  "function associate() returns (uint256)",
];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const vaultName = requireEnv("TIDEPOOL_VAULT");
  const deposit0Input = requireEnv("DEPOSIT0");
  const deposit1Input = requireEnv("DEPOSIT1");

  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get(vaultName)).address, signer);
  const vaultAddress = await vault.getAddress();
  const shareTokenAddress = await vault.shareToken();
  if (shareTokenAddress === ethers.ZeroAddress) throw new Error(`${vaultName} is not initialized (nothing was sent).`);

  const t0 = new ethers.Contract(await vault.token0(), TOKEN_ABI, signer);
  const t1 = new ethers.Contract(await vault.token1(), TOKEN_ABI, signer);
  const shareToken = new ethers.Contract(shareTokenAddress, TOKEN_ABI, signer);
  const [symbol0, symbol1, decimals0, decimals1] = await Promise.all([
    t0.symbol(),
    t1.symbol(),
    t0.decimals(),
    t1.decimals(),
  ]);
  const amount0 = ethers.parseUnits(deposit0Input, decimals0);
  const amount1 = ethers.parseUnits(deposit1Input, decimals1);

  const printState = async (label: string) => {
    const [total0, total1] = await vault.getTotalAmounts();
    console.log(`--- ${label}`);
    console.log(
      `  vault: shares ${ethers.formatUnits(await vault.totalShares(), SHARE_DECIMALS)}, position serial ${await vault.positionSerial()}, ` +
        `holds ${ethers.formatUnits(total0, decimals0)} ${symbol0} + ${ethers.formatUnits(total1, decimals1)} ${symbol1}`,
    );
    console.log(
      `  your wallet: ${ethers.formatUnits(await t0.balanceOf(signer.address), decimals0)} ${symbol0}, ` +
        `${ethers.formatUnits(await t1.balanceOf(signer.address), decimals1)} ${symbol1}, ` +
        `${ethers.formatUnits(await shareToken.balanceOf(signer.address), SHARE_DECIMALS)} shares`,
    );
  };

  console.log(`vault: ${vaultName} at ${vaultAddress}`);
  await printState("before");
  const [have0, have1] = await Promise.all([t0.balanceOf(signer.address), t1.balanceOf(signer.address)]);
  if (have0 < amount0 || have1 < amount1) {
    throw new Error(
      `Insufficient balance: need ${deposit0Input} ${symbol0} and ${deposit1Input} ${symbol1}, ` +
        `have ${ethers.formatUnits(have0, decimals0)} ${symbol0} and ${ethers.formatUnits(have1, decimals1)} ${symbol1}. Nothing was sent.`,
    );
  }
  console.log(`\nPlan: deposit up to ${deposit0Input} ${symbol0} + ${deposit1Input} ${symbol1} into ${vaultName}`);
  if (!(await confirm("Send the association/approvals needed for this deposit? Type 'yes' to continue: "))) {
    console.log("Aborted. Nothing was sent.");
    return;
  }

  if (!(await shareToken.isAssociated())) {
    const gasLimit = await gasLimitFor("associate share token", shareToken.associate.estimateGas());
    const tx = await shareToken.associate({ gasLimit });
    console.log(`associate sent: ${hashscan(tx.hash)}`);
    console.log(`associate mined: status ${(await tx.wait())!.status}`);
  }
  for (const [token, amount, symbol] of [
    [t0, amount0, symbol0],
    [t1, amount1, symbol1],
  ] as const) {
    if (amount === 0n || (await token.allowance(signer.address, vaultAddress)) >= amount) continue;
    const gasLimit = await gasLimitFor(`approve ${symbol}`, token.approve.estimateGas(vaultAddress, amount));
    const tx = await token.approve(vaultAddress, amount, { gasLimit });
    console.log(`approve ${symbol} sent: ${hashscan(tx.hash)}`);
    console.log(`approve ${symbol} mined: status ${(await tx.wait())!.status}`);
  }

  const [previewShares, used0, used1] = await vault.deposit.staticCall(amount0, amount1, 0, signer.address);
  const minShares = (previewShares * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  console.log(
    `exact preview: ${ethers.formatUnits(previewShares, SHARE_DECIMALS)} shares for ` +
      `${ethers.formatUnits(used0, decimals0)} ${symbol0} + ${ethers.formatUnits(used1, decimals1)} ${symbol1}; ` +
      `minShares ${ethers.formatUnits(minShares, SHARE_DECIMALS)}`,
  );
  if (!(await confirm("Proceed with the deposit? Type 'yes' to continue: "))) {
    console.log("Aborted before deposit(). Any association/approval sent above stays in place.");
    return;
  }

  const gasLimit = await gasLimitFor("deposit", vault.deposit.estimateGas(amount0, amount1, minShares, signer.address));
  const tx = await vault.deposit(amount0, amount1, minShares, signer.address, { gasLimit });
  console.log(`deposit sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`deposit mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);
  await printState("after");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

Quoted, confirmed one-way swap on the shared pool (for the rebalance demo):

`packages/hardhat/scripts/tidepoolMovePrice.ts`

```ts
/**
 * One-way swap on the vault's SaucerSwap V2 pool, used to move the SHARED WHBAR/SAUCE testnet pool price so the
 * narrow test vault's TWAP leaves its range. It trades against every LP in that pool (including the main vault,
 * which is only affected through the pool price; no call is made to it).
 *
 *   DIRECTION=down  sells token0 (WHBAR) for token1 (SAUCE): the tick goes DOWN
 *   DIRECTION=up    sells token1 (SAUCE) for token0 (WHBAR): the tick goes UP
 *   AMOUNT          amount of the input token, in whole tokens (required)
 *   TIDEPOOL_VAULT  deployment whose pool/router/range are used (default "TidepoolVault"; read-only)
 *   WRAP_HBAR_IF_NEEDED=true  allow wrapping the WHBAR shortfall through SaucerSwap's WhbarHelper (asks first)
 *
 * The swap is quoted with SaucerSwap's QuoterV2 before anything is sent, then needs an explicit "yes".
 * Run (PowerShell): $env:TIDEPOOL_VAULT="TidepoolVaultNarrow"; $env:DIRECTION="down"; $env:AMOUNT="122"
 *                   node .yarn/releases/yarn-3.2.3.cjs hardhat:move-price
 */
import hre from "hardhat";
import { TINYBAR_TO_WEIBAR, confirm, gasLimitFor, hashscan, requireEnv, tickAtSqrtPrice } from "./tidepoolScriptUtils";

const QUOTER_V2 = "0x00000000000000000000000000000000001535b2"; // SaucerSwap V2 QuoterV2, testnet 0.0.1390002
const WHBAR_TOKEN = "0x0000000000000000000000000000000000003aD2"; // testnet 0.0.15058
const WHBAR_HELPER = "0x000000000000000000000000000000000050a8a7"; // testnet 0.0.5286055 (never call the WHBAR contract)
const SLIPPAGE_BPS = 100n; // amountOutMinimum is 1% below the quote
const TOKEN_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)",
];
const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)",
];
const POOL_ABI = ["function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const direction = requireEnv("DIRECTION").toLowerCase();
  if (direction !== "down" && direction !== "up")
    throw new Error('DIRECTION must be "down" or "up" (nothing was sent).');
  const amountInput = requireEnv("AMOUNT");
  const vaultName = process.env.TIDEPOOL_VAULT ?? "TidepoolVault";

  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get(vaultName)).address, signer);
  const [poolAddress, routerAddress, fee, token0, token1] = await Promise.all([
    vault.pool(),
    vault.swapRouter(),
    vault.fee(),
    vault.token0(),
    vault.token1(),
  ]);
  const [tokenIn, tokenOut] = direction === "down" ? [token0, token1] : [token1, token0];
  const tIn = new ethers.Contract(tokenIn, TOKEN_ABI, signer);
  const tOut = new ethers.Contract(tokenOut, TOKEN_ABI, signer);
  const [symbolIn, symbolOut, decimalsIn, decimalsOut] = await Promise.all([
    tIn.symbol(),
    tOut.symbol(),
    tIn.decimals(),
    tOut.decimals(),
  ]);
  const amountIn = ethers.parseUnits(amountInput, decimalsIn);
  const pool = new ethers.Contract(poolAddress, POOL_ABI, signer);
  const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, signer);

  const spotBefore = Number((await pool.slot0())[1]);
  const quote = await quoter.quoteExactInputSingle.staticCall({
    tokenIn,
    tokenOut,
    amountIn,
    fee,
    sqrtPriceLimitX96: 0,
  });
  const tickAfter = tickAtSqrtPrice(quote.sqrtPriceX96After);
  const minOut = (quote.amountOut * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  const [lower, upper] = [Number(await vault.tickLower()), Number(await vault.tickUpper())];

  console.log(`reference vault: ${vaultName} at ${await vault.getAddress()} (read-only), range [${lower}, ${upper})`);
  console.log(`pool: ${poolAddress}   router: ${routerAddress}   fee tier: ${fee}`);
  console.log(`swap: ${amountInput} ${symbolIn} -> ~${ethers.formatUnits(quote.amountOut, decimalsOut)} ${symbolOut}`);
  console.log(
    `spot tick: ${spotBefore} -> ~${tickAfter} (${tickAfter - spotBefore} ticks), ${quote.initializedTicksCrossed} initialized ticks crossed`,
  );
  console.log(
    `after the swap the reference vault would be ${tickAfter >= lower && tickAfter < upper ? "IN" : "OUT OF"} range (spot)`,
  );
  console.log(`amountOutMinimum (1% below quote): ${ethers.formatUnits(minOut, decimalsOut)} ${symbolOut}`);
  console.log(
    "WARNING: this trades on the SHARED SaucerSwap WHBAR/SAUCE testnet pool. It moves the price for every LP and\n" +
      "trader in that pool, including the main Tidepool vault's position, until the price is moved back.",
  );

  const balance: bigint = await tIn.balanceOf(signer.address);
  if (balance < amountIn) {
    const shortfall = amountIn - balance;
    const isWhbar = tokenIn.toLowerCase() === WHBAR_TOKEN.toLowerCase();
    console.log(
      `Insufficient ${symbolIn}: have ${ethers.formatUnits(balance, decimalsIn)}, need ${amountInput}, ` +
        `short by ${ethers.formatUnits(shortfall, decimalsIn)} ${symbolIn}.`,
    );
    if (!isWhbar)
      throw new Error(`Acquire ${ethers.formatUnits(shortfall, decimalsIn)} more ${symbolIn} first. Nothing was sent.`);
    // WHBAR has 8 decimals, like HBAR: 1 WHBAR is wrapped from 1 HBAR.
    const wrapWeibar = shortfall * TINYBAR_TO_WEIBAR;
    console.log(
      `That requires wrapping ${ethers.formatEther(wrapWeibar)} HBAR into WHBAR via SaucerSwap's WhbarHelper.`,
    );
    if (process.env.WRAP_HBAR_IF_NEEDED !== "true") {
      throw new Error("Set WRAP_HBAR_IF_NEEDED=true to allow wrapping, or wrap first. Nothing was sent.");
    }
    if (!(await confirm(`Wrap ${ethers.formatEther(wrapWeibar)} HBAR into WHBAR now? Type 'yes' to continue: `))) {
      console.log("Aborted. Nothing was sent.");
      return;
    }
    const helper = new ethers.Contract(WHBAR_HELPER, ["function deposit() payable"], signer);
    const wrapGas = await gasLimitFor("wrap HBAR", helper.deposit.estimateGas({ value: wrapWeibar }));
    const wrapTx = await helper.deposit({ value: wrapWeibar, gasLimit: wrapGas });
    console.log(`wrap sent: ${hashscan(wrapTx.hash)}`);
    console.log(`wrap mined: status ${(await wrapTx.wait())!.status}`);
  }

  if (!(await confirm(`Send this ${direction} swap on the shared pool? Type 'yes' to continue: `))) {
    console.log("Aborted before the swap. Any wrap sent above stays in your wallet as WHBAR.");
    return;
  }

  if ((await tIn.allowance(signer.address, routerAddress)) < amountIn) {
    const gasLimit = await gasLimitFor(
      `approve ${symbolIn} to router`,
      tIn.approve.estimateGas(routerAddress, amountIn),
    );
    const tx = await tIn.approve(routerAddress, amountIn, { gasLimit });
    console.log(`approve sent: ${hashscan(tx.hash)}`);
    console.log(`approve mined: status ${(await tx.wait())!.status}`);
  }

  const router = new ethers.Contract(routerAddress, ROUTER_ABI, signer);
  const params = {
    tokenIn,
    tokenOut,
    fee,
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn,
    amountOutMinimum: minOut,
    sqrtPriceLimitX96: 0,
  };
  const gasLimit = await gasLimitFor("swap", router.exactInputSingle.estimateGas(params));
  const tx = await router.exactInputSingle(params, { gasLimit });
  console.log(`swap sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`swap mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);

  const [spot, twap, inRange] = await vault.getPriceState();
  console.log(`pool now: spot ${spot}, TWAP ${twap} (the TWAP follows over ${await vault.twapWindow()} s)`);
  console.log(`${vaultName}: range [${lower}, ${upper}), TWAP ${inRange ? "IN" : "OUT OF"} range`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

Guarded rebalance with read-only preflight and post-mining checks:

`packages/hardhat/scripts/tidepoolRebalance.ts`

```ts
/**
 * Sends rebalance() to an explicitly named Tidepool vault after read-only preflight checks, then verifies the
 * result. Meant for the narrow test vault ("TidepoolVaultNarrow").
 *
 *   TIDEPOOL_VAULT                   deployment name (required; there is no default)
 *   ALLOW_MAIN_VAULT_REBALANCE=true  required to target the main "TidepoolVault" deployment
 *
 * Preflight (no transaction): initialized, a position exists, cooldown elapsed, TWAP outside the range,
 * |spot - TWAP| <= maxTwapDeviation. If any check fails, nothing is sent.
 *
 * Gas: fixed 8,000,000. rebalance() mints a new SaucerSwap LP NFT, and Hedera's eth_call/eth_estimateGas
 * simulation returns INVALID_NFT_ID for that mint even when it succeeds on-chain, so it cannot be estimated.
 * Observed first-position compound (the same mint path) used 5,128,563 gas.
 *
 * Run (PowerShell): $env:TIDEPOOL_VAULT="TidepoolVaultNarrow"; node .yarn/releases/yarn-3.2.3.cjs hardhat:rebalance
 */
import hre from "hardhat";
import { TINYBAR_TO_WEIBAR, confirm, hashscan, hederaIdOf, rangeAround, requireEnv } from "./tidepoolScriptUtils";

const MAIN_VAULT = "TidepoolVault";
const REBALANCE_GAS_LIMIT = 8_000_000n;
const FEE_HEADROOM_TINYBARS = 100_000_000n; // 1 HBAR on top of the position fee; the vault refunds the surplus
const POSITION_MANAGER_ABI = [
  "function positions(uint256) view returns (address,address,uint24,int24 tickLower,int24 tickUpper,uint128 liquidity,uint256,uint256,uint128,uint128)",
];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const vaultName = requireEnv("TIDEPOOL_VAULT");
  const { ethers, deployments } = hre;

  const vaultAddress = (await deployments.get(vaultName)).address;
  const mainAddress = (await deployments.getOrNull(MAIN_VAULT))?.address;
  const isMain = vaultName === MAIN_VAULT || vaultAddress.toLowerCase() === mainAddress?.toLowerCase();
  if (isMain && process.env.ALLOW_MAIN_VAULT_REBALANCE !== "true") {
    throw new Error(
      `${vaultName} is the main vault. Refusing to rebalance it without ALLOW_MAIN_VAULT_REBALANCE=true. Nothing was sent.`,
    );
  }

  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", vaultAddress, signer);
  const manager = new ethers.Contract(await vault.positionManager(), POSITION_MANAGER_ABI, signer);
  const nft = new ethers.Contract(
    await vault.positionNft(),
    ["function ownerOf(uint256) view returns (address)"],
    signer,
  );
  const vaultId = await hederaIdOf(vaultAddress);

  // ---- read-only preflight -------------------------------------------------------------------------------
  const failures: string[] = [];
  if ((await vault.shareToken()) === ethers.ZeroAddress) failures.push("vault is not initialized");
  const oldSerial: bigint = await vault.positionSerial();
  if (oldSerial === 0n) failures.push("vault has no position yet (run compound first)");
  const [lower, upper, spacing, halfWidth, maxDeviation, cooldown, lastRebalance] = await Promise.all([
    vault.tickLower(),
    vault.tickUpper(),
    vault.tickSpacing(),
    vault.halfWidth(),
    vault.maxTwapDeviation(),
    vault.rebalanceCooldown(),
    vault.lastRebalance(),
  ]).then(values => values.map(Number));
  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  const readyAt = lastRebalance + cooldown;
  if (now < readyAt) failures.push(`cooldown active for another ${readyAt - now} s`);

  let spot = NaN;
  let twap = NaN;
  try {
    const state = await vault.getPriceState();
    spot = Number(state[0]);
    twap = Number(state[1]);
  } catch (error) {
    failures.push(`pool TWAP unavailable: ${(error as Error).message}`);
  }
  if (!Number.isNaN(twap)) {
    if (twap >= lower && twap < upper) failures.push(`TWAP ${twap} is still inside [${lower}, ${upper})`);
    if (Math.abs(spot - twap) > maxDeviation) {
      failures.push(`|spot - TWAP| = ${Math.abs(spot - twap)} exceeds maxTwapDeviation ${maxDeviation}`);
    }
  }

  const [newLower, newUpper] = Number.isNaN(twap) ? [NaN, NaN] : rangeAround(twap, spacing, halfWidth);
  const feeTinybars: bigint = await vault.quoteMintFee.staticCall();
  const value = (feeTinybars + FEE_HEADROOM_TINYBARS) * TINYBAR_TO_WEIBAR;

  console.log(`vault: ${vaultName} at ${vaultAddress} (${vaultId})`);
  console.log(`current NFT serial: ${oldSerial}, range [${lower}, ${upper})`);
  console.log(`spot tick: ${spot}, TWAP tick: ${twap}, max deviation: ${maxDeviation}`);
  console.log(
    `cooldown: ${cooldown} s, last rebalance ${lastRebalance}, ${now >= readyAt ? "elapsed" : `ready at ${readyAt}`}`,
  );
  console.log(`expected new range: [${newLower}, ${newUpper})`);
  console.log(
    `quoteMintFee(): ${ethers.formatUnits(feeTinybars, 8)} HBAR; msg.value: ${ethers.formatEther(value)} HBAR (surplus refunded)`,
  );
  console.log(`gas limit: ${REBALANCE_GAS_LIMIT} (fixed; see the note at the top of this file)`);

  if (failures.length > 0) {
    console.log("\nPreflight FAILED - nothing was sent:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nPreflight passed.");
  if (!(await confirm("Send rebalance()? Type 'yes' to continue: "))) {
    console.log("Aborted. Nothing was sent.");
    return;
  }

  // ---- send ------------------------------------------------------------------------------------------------
  const tx = await vault.rebalance({ value, gasLimit: REBALANCE_GAS_LIMIT });
  console.log(`rebalance sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`rebalance mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);

  // ---- verify ----------------------------------------------------------------------------------------------
  const newSerial: bigint = await vault.positionSerial();
  const [gotLower, gotUpper] = [Number(await vault.tickLower()), Number(await vault.tickUpper())];
  const newLiquidity: bigint = (await manager.positions(newSerial)).liquidity;
  const oldLiquidity: bigint = (await manager.positions(oldSerial)).liquidity;
  const oldOwner = await hederaIdOf(await nft.ownerOf(oldSerial));
  const newOwner = await hederaIdOf(await nft.ownerOf(newSerial));

  console.log(`new position serial: ${newSerial}, range [${gotLower}, ${gotUpper}), liquidity ${newLiquidity}`);
  console.log(`old NFT ${oldSerial}: liquidity ${oldLiquidity}, owner ${oldOwner}`);
  console.log(`new NFT ${newSerial}: owner ${newOwner}`);

  // The vault centres on the TWAP at execution time, which can differ slightly from the preflight read.
  const event = receipt!.logs
    .map(log => {
      try {
        return vault.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find(parsed => parsed?.name === "Rebalance");
  const broken: string[] = [];
  if (!event) broken.push("no Rebalance event in the receipt");
  const executedTwap = event ? Number(event.args.twapTick) : NaN;
  const [eventLower, eventUpper] = rangeAround(executedTwap, spacing, halfWidth);
  console.log(`executed at TWAP tick ${executedTwap} -> range [${eventLower}, ${eventUpper})`);
  if (eventLower !== newLower || eventUpper !== newUpper) {
    console.log(`note: preflight expected [${newLower}, ${newUpper}); the TWAP moved between preflight and execution`);
  }
  if (newSerial === oldSerial) broken.push("positionSerial did not change");
  if (event && BigInt(event.args.newPositionSerial) !== newSerial)
    broken.push("event serial differs from positionSerial");
  if (gotLower !== eventLower || gotUpper !== eventUpper) {
    broken.push(`stored range [${gotLower}, ${gotUpper}) differs from rangeAround(TWAP ${executedTwap})`);
  }
  if (newLiquidity === 0n) broken.push("new position has zero liquidity");
  if (oldLiquidity !== 0n) broken.push(`old NFT ${oldSerial} still has liquidity ${oldLiquidity}`);
  if (oldOwner !== vaultId) broken.push(`old NFT owner ${oldOwner} is not the vault ${vaultId}`);
  if (newOwner !== vaultId) broken.push(`new NFT owner ${newOwner} is not the vault ${vaultId}`);
  if (broken.length > 0) {
    throw new Error(`Post-rebalance checks FAILED:\n  - ${broken.join("\n  - ")}`);
  }
  console.log("Post-rebalance checks passed.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

### 9.9 Frontend utilities

> **Shipped frontend differs.** Sections 9.9–9.11 and 10 record the design-stage frontend. The shipped dashboard
> (`packages/nextjs`) adds a Main / Narrow Demo vault selector, a keeper panel that replaces `KeeperCard`, sends
> `compound`/`rebalance` with `disableSimulate: true`, fixed 8M gas and fee + 0.1 HBAR, and maps custom errors to
> plain language. The code in `packages/nextjs` and the README's Dashboard section are authoritative.

`packages/nextjs/utils/tidepool/constants.ts`

```ts
import { parseAbi } from "viem";

/** JSON-RPC values are weibar (18 decimals); contracts see tinybar (8 decimals). */
export const TINYBAR_TO_WEIBAR = 10_000_000_000n;

/** SaucerSwap WhbarHelper (testnet 0.0.5286055). Wrap/unwrap through it, never through the WHBAR contract. */
export const WHBAR_HELPER = "0x000000000000000000000000000000000050a8a7";

export const MIRROR_NODE_URL = process.env.NEXT_PUBLIC_MIRROR_NODE_URL ?? "https://testnet.mirrornode.hedera.com";
export const HASHSCAN_URL = "https://hashscan.io/testnet";

/** HTS tokens expose an ERC-20 facade plus the HIP-719 association functions. */
export const HTS_TOKEN_ABI = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function isAssociated() view returns (bool)",
  "function associate() returns (uint256)",
]);

export const WHBAR_HELPER_ABI = parseAbi(["function deposit() payable", "function unwrapWhbar(uint256)"]);
```

`packages/nextjs/utils/tidepool/math.ts`

```ts
import { parseUnits } from "viem";

/**
 * Human price of token0 in token1 at a tick: 1.0001^tick scaled by the decimal difference.
 * Floating point is fine here: it is only used for display, never for amounts sent on-chain.
 */
export function tickToPrice(tick: number, decimals0: number, decimals1: number): number {
  return Math.pow(1.0001, tick) * Math.pow(10, decimals0 - decimals1);
}

export function formatPrice(price: number): string {
  if (price === 0) return "0";
  if (price >= 1000) return price.toFixed(0);
  if (price >= 1) return price.toFixed(4);
  return price.toPrecision(4);
}

/** Share of the vault a holder owns, in percent. */
export function sharePercent(shares: bigint, totalShares: bigint): number {
  if (totalShares === 0n) return 0;
  return Number((shares * 1_000_000n) / totalShares) / 10_000;
}

/** parseUnits that returns 0n for empty or half-typed input ("", ".", "1.2.3") instead of throwing. */
export function safeParseUnits(value: string, decimals: number): bigint {
  try {
    return value ? parseUnits(value, decimals) : 0n;
  } catch {
    return 0n;
  }
}
```

### 9.10 Frontend hooks

`packages/nextjs/hooks/tidepool/useVault.ts`

```ts
import { useReadContracts } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar";
import { HTS_TOKEN_ABI } from "~~/utils/tidepool/constants";

/**
 * Everything the dashboard needs about the vault. viem's Hedera chains define no multicall3
 * contract, so wagmi sends these as individual eth_calls.
 */
export function useVault() {
  const { data: vault, isLoading } = useDeployedContractInfo({ contractName: "TidepoolVault" });

  const base = vault ? ({ address: vault.address, abi: vault.abi } as const) : undefined;
  const { data: state, refetch: refetchState } = useReadContracts({
    allowFailure: true,
    contracts: base
      ? [
          { ...base, functionName: "token0" },
          { ...base, functionName: "token1" },
          { ...base, functionName: "shareToken" },
          { ...base, functionName: "tickLower" },
          { ...base, functionName: "tickUpper" },
          { ...base, functionName: "positionSerial" },
          { ...base, functionName: "totalShares" },
          { ...base, functionName: "getTotalAmounts" },
          { ...base, functionName: "getPriceState" },
          { ...base, functionName: "lastRebalance" },
          { ...base, functionName: "rebalanceCooldown" },
        ]
      : [],
    query: { enabled: Boolean(base), refetchInterval: 15_000 },
  });

  const token0 = state?.[0]?.result as `0x${string}` | undefined;
  const token1 = state?.[1]?.result as `0x${string}` | undefined;
  const { data: meta } = useReadContracts({
    contracts:
      token0 && token1
        ? [
            { address: token0, abi: HTS_TOKEN_ABI, functionName: "symbol" },
            { address: token0, abi: HTS_TOKEN_ABI, functionName: "decimals" },
            { address: token1, abi: HTS_TOKEN_ABI, functionName: "symbol" },
            { address: token1, abi: HTS_TOKEN_ABI, functionName: "decimals" },
          ]
        : [],
    query: { enabled: Boolean(token0 && token1), staleTime: Infinity },
  });

  const totals = state?.[7]?.result as readonly [bigint, bigint] | undefined;
  const priceState = state?.[8]?.result as readonly [number, number, boolean] | undefined;

  return {
    isLoading,
    address: vault?.address,
    abi: vault?.abi,
    token0,
    token1,
    shareToken: state?.[2]?.result as `0x${string}` | undefined,
    tickLower: state?.[3]?.result as number | undefined,
    tickUpper: state?.[4]?.result as number | undefined,
    positionSerial: state?.[5]?.result as bigint | undefined,
    totalShares: state?.[6]?.result as bigint | undefined,
    total0: totals?.[0],
    total1: totals?.[1],
    spotTick: priceState?.[0],
    twapTick: priceState?.[1],
    inRange: priceState?.[2],
    twapError: state?.[8]?.status === "failure",
    lastRebalance: state?.[9]?.result as bigint | undefined,
    rebalanceCooldown: state?.[10]?.result as number | undefined,
    symbol0: meta?.[0]?.result as string | undefined,
    decimals0: meta?.[1]?.result as number | undefined,
    symbol1: meta?.[2]?.result as string | undefined,
    decimals1: meta?.[3]?.result as number | undefined,
    refetch: refetchState,
  };
}

export type VaultState = ReturnType<typeof useVault>;
```

`packages/nextjs/hooks/tidepool/useHtsAccount.ts`

```ts
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { HTS_TOKEN_ABI } from "~~/utils/tidepool/constants";

/**
 * The connected account's view of one HTS token: association, balance and allowance to `spender`.
 * isAssociated() answers for msg.sender, so it is read as a separate eth_call with `account` set;
 * batching it through a multicall contract would ask about the multicall contract instead.
 */
export function useHtsAccount(token: `0x${string}` | undefined, spender: `0x${string}` | undefined) {
  const { address } = useAccount();
  const enabled = Boolean(token && address);

  const { data: isAssociated, refetch: refetchAssociation } = useReadContract({
    address: token,
    abi: HTS_TOKEN_ABI,
    functionName: "isAssociated",
    account: address,
    query: { enabled },
  });

  const { data, refetch: refetchAmounts } = useReadContracts({
    contracts:
      token && address && spender
        ? [
            { address: token, abi: HTS_TOKEN_ABI, functionName: "balanceOf", args: [address] },
            { address: token, abi: HTS_TOKEN_ABI, functionName: "allowance", args: [address, spender] },
          ]
        : [],
    query: { enabled: enabled && Boolean(spender), refetchInterval: 15_000 },
  });

  return {
    isAssociated,
    balance: data?.[0]?.result as bigint | undefined,
    allowance: data?.[1]?.result as bigint | undefined,
    refetch: () => Promise.all([refetchAssociation(), refetchAmounts()]),
  };
}
```

`packages/nextjs/hooks/tidepool/useVaultActivity.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { type Abi, type Hex, decodeEventLog } from "viem";
import { MIRROR_NODE_URL } from "~~/utils/tidepool/constants";

type MirrorLog = { data: Hex; topics: Hex[]; index: number; timestamp: string; transaction_hash: Hex };

export type VaultEvent = {
  name: string;
  args: Record<string, unknown>;
  timestamp: number;
  transactionHash: Hex;
  logIndex: number;
};

/** Vault history straight from the Hedera mirror node REST API, decoded with the vault ABI. */
export function useVaultActivity(vault: `0x${string}` | undefined, abi: Abi | undefined) {
  return useQuery({
    queryKey: ["tidepool-activity", vault],
    enabled: Boolean(vault && abi),
    refetchInterval: 15_000,
    queryFn: async (): Promise<VaultEvent[]> => {
      const res = await fetch(`${MIRROR_NODE_URL}/api/v1/contracts/${vault}/results/logs?order=desc&limit=50`);
      if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);
      const { logs } = (await res.json()) as { logs: MirrorLog[] };

      return logs.flatMap(log => {
        try {
          const decoded = decodeEventLog({ abi: abi!, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
          return [
            {
              name: String(decoded.eventName),
              args: (decoded.args ?? {}) as Record<string, unknown>,
              timestamp: Math.floor(Number(log.timestamp)),
              transactionHash: log.transaction_hash,
              logIndex: log.index,
            },
          ];
        } catch {
          return []; // a log whose signature is not in this ABI version
        }
      });
    },
  });
}
```

### 9.11 Page and components

`packages/nextjs/app/page.tsx`

```tsx
"use client";

import { ActivityFeed } from "./_components/tidepool/ActivityFeed";
import { DepositCard } from "./_components/tidepool/DepositCard";
import { KeeperCard } from "./_components/tidepool/KeeperCard";
import { RangeChart } from "./_components/tidepool/RangeChart";
import { WithdrawCard } from "./_components/tidepool/WithdrawCard";
import type { NextPage } from "next";
import { formatUnits } from "viem";
import { useVault } from "~~/hooks/tidepool/useVault";
import { HASHSCAN_URL } from "~~/utils/tidepool/constants";

const Home: NextPage = () => {
  const vault = useVault();
  const { symbol0, symbol1, decimals0, decimals1, total0, total1 } = vault;
  const ready = vault.address && symbol0 && symbol1 && decimals0 !== undefined && decimals1 !== undefined;

  if (vault.isLoading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!vault.address) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center">
        <h1 className="text-2xl font-bold">Tidepool</h1>
        <p className="mt-4">
          No TidepoolVault deployment found for the selected network. Deploy one with{" "}
          <code>npm run hardhat:deploy --network hederaTestnet</code> or switch the wallet to Hedera Testnet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">
          Tidepool · {symbol0 ?? "…"}/{symbol1 ?? "…"}
        </h1>
        <p className="opacity-70">
          A SaucerSwap V2 position that compounds its fees and re-centres itself.{" "}
          <a className="link" href={`${HASHSCAN_URL}/contract/${vault.address}`} target="_blank" rel="noreferrer">
            Vault on HashScan
          </a>
        </p>
      </header>

      {ready && (
        <section className="card bg-base-100 shadow">
          <div className="card-body gap-4">
            <div className="flex flex-wrap gap-2">
              {vault.twapError ? (
                <span className="badge badge-error">TWAP unavailable</span>
              ) : vault.positionSerial === 0n ? (
                <span className="badge">No position yet</span>
              ) : (
                <span className={`badge ${vault.inRange ? "badge-success" : "badge-warning"}`}>
                  {vault.inRange ? "In range, earning fees" : "Out of range, rebalance available"}
                </span>
              )}
              {vault.positionSerial ? (
                <span className="badge badge-ghost">LP NFT #{vault.positionSerial.toString()}</span>
              ) : null}
            </div>
            {vault.positionSerial &&
            vault.tickLower !== undefined &&
            vault.tickUpper !== undefined &&
            vault.spotTick !== undefined &&
            vault.twapTick !== undefined ? (
              <RangeChart
                tickLower={vault.tickLower}
                tickUpper={vault.tickUpper}
                spotTick={vault.spotTick}
                twapTick={vault.twapTick}
                decimals0={decimals0}
                decimals1={decimals1}
                quoteLabel={`${symbol1} per ${symbol0}`}
              />
            ) : null}
            <div className="stats stats-vertical md:stats-horizontal">
              <div className="stat">
                <div className="stat-title">{symbol0} held</div>
                <div className="stat-value text-2xl">{total0 === undefined ? "-" : formatUnits(total0, decimals0)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">{symbol1} held</div>
                <div className="stat-value text-2xl">{total1 === undefined ? "-" : formatUnits(total1, decimals1)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Shares outstanding</div>
                <div className="stat-value text-2xl">
                  {vault.totalShares === undefined ? "-" : formatUnits(vault.totalShares, 8)}
                </div>
              </div>
            </div>
            <p className="text-xs opacity-60">
              Testnet pool prices are set by testnet traders and do not track real market prices.
            </p>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <DepositCard vault={vault} />
        <WithdrawCard vault={vault} />
        <KeeperCard vault={vault} />
      </div>

      <ActivityFeed vault={vault.address} abi={vault.abi} />
    </div>
  );
};

export default Home;
```

`packages/nextjs/app/_components/tidepool/RangeChart.tsx`

```tsx
import { formatPrice, tickToPrice } from "~~/utils/tidepool/math";

type Props = {
  tickLower: number;
  tickUpper: number;
  spotTick: number;
  twapTick: number;
  decimals0: number;
  decimals1: number;
  quoteLabel: string;
};

const WIDTH = 640;
const HEIGHT = 140;

/** The position's tick range with the pool's spot and TWAP ticks, on a linear tick axis. */
export const RangeChart = ({ tickLower, tickUpper, spotTick, twapTick, decimals0, decimals1, quoteLabel }: Props) => {
  const width = tickUpper - tickLower;
  const min = Math.min(tickLower - width / 2, spotTick, twapTick);
  const max = Math.max(tickUpper + width / 2, spotTick, twapTick);
  const x = (tick: number) => ((tick - min) / (max - min)) * WIDTH;
  const price = (tick: number) => formatPrice(tickToPrice(tick, decimals0, decimals1));
  const inRange = twapTick >= tickLower && twapTick < tickUpper;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Position range and current price">
      <rect
        x={x(tickLower)}
        y={20}
        width={x(tickUpper) - x(tickLower)}
        height={80}
        rx={6}
        className={inRange ? "fill-success/30" : "fill-warning/30"}
      />
      <line x1={0} x2={WIDTH} y1={100} y2={100} className="stroke-base-content/30" />
      <line x1={x(twapTick)} x2={x(twapTick)} y1={12} y2={100} strokeDasharray="4 4" className="stroke-info" />
      <line x1={x(spotTick)} x2={x(spotTick)} y1={12} y2={100} strokeWidth={2} className="stroke-primary" />
      <text x={x(tickLower)} y={118} textAnchor="middle" className="fill-base-content text-[11px]">
        {price(tickLower)}
      </text>
      <text x={x(tickUpper)} y={118} textAnchor="middle" className="fill-base-content text-[11px]">
        {price(tickUpper)}
      </text>
      <text x={x(spotTick)} y={10} textAnchor="middle" className="fill-primary text-[11px]">
        spot {price(spotTick)}
      </text>
      <text x={WIDTH} y={136} textAnchor="end" className="fill-base-content/60 text-[10px]">
        {quoteLabel} · dashed line = TWAP
      </text>
    </svg>
  );
};
```

`packages/nextjs/app/_components/tidepool/AssociateButton.tsx`

```tsx
import { useWriteContract } from "wagmi";
import { useTransactor } from "~~/hooks/scaffold-hbar";
import { HTS_TOKEN_ABI } from "~~/utils/tidepool/constants";

/** HIP-719: an EVM wallet associates itself with an HTS token by calling associate() on the token address. */
export const AssociateButton = ({
  token,
  symbol,
  onDone,
}: {
  token: `0x${string}`;
  symbol: string;
  onDone: () => void;
}) => {
  const { writeContractAsync, isPending } = useWriteContract();
  const writeTx = useTransactor();

  const associate = async () => {
    await writeTx(() =>
      writeContractAsync({ address: token, abi: HTS_TOKEN_ABI, functionName: "associate", gas: 1_000_000n }),
    );
    onDone();
  };

  return (
    <button className="btn btn-sm btn-outline" disabled={isPending} onClick={associate}>
      Associate {symbol}
    </button>
  );
};
```

`packages/nextjs/app/_components/tidepool/DepositCard.tsx`

```tsx
import { useState } from "react";
import { AssociateButton } from "./AssociateButton";
import { formatUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useScaffoldWriteContract, useTransactor } from "~~/hooks/scaffold-hbar";
import { useHtsAccount } from "~~/hooks/tidepool/useHtsAccount";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { HTS_TOKEN_ABI, WHBAR_HELPER, WHBAR_HELPER_ABI } from "~~/utils/tidepool/constants";
import { safeParseUnits } from "~~/utils/tidepool/math";

const SLIPPAGE_BPS = 100n; // accept 1% fewer shares than previewed

export const DepositCard = ({ vault }: { vault: VaultState }) => {
  const { address } = useAccount();
  const [input0, setInput0] = useState("");
  const [input1, setInput1] = useState("");
  const [wrapInput, setWrapInput] = useState("");

  const acc0 = useHtsAccount(vault.token0, vault.address);
  const acc1 = useHtsAccount(vault.token1, vault.address);
  const accShare = useHtsAccount(vault.shareToken, vault.address);
  const { writeContractAsync: writeToken, isPending: tokenPending } = useWriteContract();
  const { writeContractAsync: writeVault, isPending: vaultPending } = useScaffoldWriteContract({
    contractName: "TidepoolVault",
  });
  const writeTx = useTransactor();

  const { decimals0, decimals1, symbol0, symbol1, total0, total1, totalShares } = vault;
  if (decimals0 === undefined || decimals1 === undefined || !symbol0 || !symbol1) return null;

  const amount0 = safeParseUnits(input0, decimals0);
  const amount1 = safeParseUnits(input1, decimals1);
  const wrapWeibar = safeParseUnits(wrapInput, 18);
  const hasHoldings = Boolean(
    totalShares && total0 !== undefined && total1 !== undefined && (total0 > 0n || total1 > 0n),
  );

  // Deposits must match the vault's current ratio; fill the other side automatically.
  const onInput0 = (value: string) => {
    setInput0(value);
    if (hasHoldings && total0! > 0n && value) {
      setInput1(formatUnits((safeParseUnits(value, decimals0) * total1!) / total0!, decimals1));
    }
  };

  const previewShares = (): bigint => {
    if (!hasHoldings) return 0n;
    const s0 = total0! > 0n ? (amount0 * totalShares!) / total0! : undefined;
    const s1 = total1! > 0n ? (amount1 * totalShares!) / total1! : undefined;
    const shares = s0 === undefined ? s1! : s1 === undefined ? s0 : s0 < s1 ? s0 : s1;
    return (shares * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  };

  const approve = async (token: `0x${string}`, amount: bigint) => {
    await writeTx(() =>
      writeToken({
        address: token,
        abi: HTS_TOKEN_ABI,
        functionName: "approve",
        args: [vault.address!, amount],
        gas: 1_000_000n,
      }),
    );
  };

  const wrap = async () => {
    await writeTx(() =>
      writeToken({
        address: WHBAR_HELPER,
        abi: WHBAR_HELPER_ABI,
        functionName: "deposit",
        value: wrapWeibar, // weibar (18 decimals): the relay converts it to tinybar
        gas: 1_000_000n, // ~78k once WHBAR is associated; ~839k if the wrap also auto-associates it
      }),
    );
    setWrapInput("");
    await acc0.refetch();
    await acc1.refetch();
  };

  const deposit = async () => {
    if ((acc0.allowance ?? 0n) < amount0) await approve(vault.token0!, amount0);
    if ((acc1.allowance ?? 0n) < amount1) await approve(vault.token1!, amount1);
    await writeVault({
      functionName: "deposit",
      args: [amount0, amount1, previewShares(), address!],
      gas: 1_500_000n,
    });
    setInput0("");
    setInput1("");
    await Promise.all([acc0.refetch(), acc1.refetch(), accShare.refetch(), vault.refetch()]);
  };

  const missingAssociations = [
    { token: vault.token0, symbol: symbol0, account: acc0 },
    { token: vault.token1, symbol: symbol1, account: acc1 },
    { token: vault.shareToken, symbol: "vault shares", account: accShare },
  ].filter(entry => entry.token && entry.account.isAssociated === false);
  const whbarIsInPool = symbol0 === "WHBAR" || symbol1 === "WHBAR";

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-3">
        <h2 className="card-title">Deposit</h2>
        {!address && <p className="text-sm">Connect a wallet to deposit.</p>}

        {missingAssociations.length > 0 && (
          <div className="alert alert-warning flex flex-col items-start gap-2">
            <span className="text-sm">
              Hedera tokens must be associated with your account before you can receive them.
            </span>
            <div className="flex flex-wrap gap-2">
              {missingAssociations.map(entry => (
                <AssociateButton
                  key={entry.token}
                  token={entry.token!}
                  symbol={entry.symbol}
                  onDone={() => void entry.account.refetch()}
                />
              ))}
            </div>
          </div>
        )}

        {whbarIsInPool && (
          <div className="flex gap-2 items-end">
            <label className="form-control grow">
              <span className="label-text text-xs">Wrap HBAR into WHBAR (SaucerSwap WhbarHelper)</span>
              <input
                className="input input-bordered input-sm"
                placeholder="HBAR"
                value={wrapInput}
                onChange={e => setWrapInput(e.target.value)}
              />
            </label>
            <button className="btn btn-sm" disabled={wrapWeibar === 0n || tokenPending} onClick={wrap}>
              Wrap
            </button>
          </div>
        )}

        {[
          { symbol: symbol0, value: input0, onChange: onInput0, balance: acc0.balance, decimals: decimals0 },
          { symbol: symbol1, value: input1, onChange: setInput1, balance: acc1.balance, decimals: decimals1 },
        ].map(field => (
          <label key={field.symbol} className="form-control">
            <span className="label-text text-xs">
              {field.symbol} · balance {field.balance === undefined ? "-" : formatUnits(field.balance, field.decimals)}
            </span>
            <input
              className="input input-bordered"
              inputMode="decimal"
              value={field.value}
              onChange={e => field.onChange(e.target.value)}
            />
          </label>
        ))}
        {hasHoldings && <p className="text-xs opacity-70">Amounts follow the vault&apos;s current token ratio.</p>}

        <button
          className="btn btn-primary"
          disabled={
            !address || missingAssociations.length > 0 || amount0 + amount1 === 0n || tokenPending || vaultPending
          }
          onClick={deposit}
        >
          Approve & deposit
        </button>
      </div>
    </div>
  );
};
```

`packages/nextjs/app/_components/tidepool/WithdrawCard.tsx`

```tsx
import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useScaffoldWriteContract, useTransactor } from "~~/hooks/scaffold-hbar";
import { useHtsAccount } from "~~/hooks/tidepool/useHtsAccount";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { HTS_TOKEN_ABI } from "~~/utils/tidepool/constants";
import { safeParseUnits, sharePercent } from "~~/utils/tidepool/math";

const SHARE_DECIMALS = 8;
const SLIPPAGE_BPS = 100n;

export const WithdrawCard = ({ vault }: { vault: VaultState }) => {
  const { address } = useAccount();
  const [input, setInput] = useState("");
  const shares = useHtsAccount(vault.shareToken, vault.address);
  const { writeContractAsync: writeToken, isPending: approving } = useWriteContract();
  const { writeContractAsync: writeVault, isPending } = useScaffoldWriteContract({ contractName: "TidepoolVault" });
  const writeTx = useTransactor();

  const { totalShares, total0, total1, symbol0, symbol1, decimals0, decimals1 } = vault;
  if (
    !totalShares ||
    total0 === undefined ||
    total1 === undefined ||
    decimals0 === undefined ||
    decimals1 === undefined
  )
    return null;

  const amount = safeParseUnits(input, SHARE_DECIMALS);
  const out0 = (total0 * amount) / totalShares;
  const out1 = (total1 * amount) / totalShares;

  const withdraw = async () => {
    // The vault pulls the shares back into its HTS treasury before burning them.
    if ((shares.allowance ?? 0n) < amount) {
      await writeTx(() =>
        writeToken({
          address: vault.shareToken!,
          abi: HTS_TOKEN_ABI,
          functionName: "approve",
          args: [vault.address!, amount],
          gas: 1_000_000n,
        }),
      );
    }
    await writeVault({
      functionName: "withdraw",
      args: [
        amount,
        (out0 * (10_000n - SLIPPAGE_BPS)) / 10_000n,
        (out1 * (10_000n - SLIPPAGE_BPS)) / 10_000n,
        address!,
      ],
      gas: 2_000_000n,
    });
    setInput("");
    await Promise.all([shares.refetch(), vault.refetch()]);
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-3">
        <h2 className="card-title">Withdraw</h2>
        <p className="text-sm">
          Your shares: {shares.balance === undefined ? "-" : formatUnits(shares.balance, SHARE_DECIMALS)} (
          {shares.balance === undefined ? 0 : sharePercent(shares.balance, totalShares)}% of the vault)
        </p>
        <input
          className="input input-bordered"
          inputMode="decimal"
          placeholder="Shares"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        {amount > 0n && (
          <p className="text-xs opacity-70">
            ≈ {formatUnits(out0, decimals0)} {symbol0} + {formatUnits(out1, decimals1)} {symbol1}
          </p>
        )}
        <button
          className="btn btn-secondary"
          disabled={!address || amount === 0n || amount > (shares.balance ?? 0n) || isPending || approving}
          onClick={withdraw}
        >
          Approve & withdraw
        </button>
      </div>
    </div>
  );
};
```

`packages/nextjs/app/_components/tidepool/KeeperCard.tsx`

```tsx
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { TINYBAR_TO_WEIBAR } from "~~/utils/tidepool/constants";

const FEE_HEADROOM_TINYBARS = 10_000_000n; // 0.1 HBAR; the vault refunds whatever is not used
// Fixed: a SaucerSwap position mint cannot be pre-simulated on Hedera (INVALID_NFT_ID in eth_estimateGas).
// On testnet, compound used 4.8-5.1M gas and rebalance 5.26M; Hedera charged only the gas used.
const KEEPER_GAS_LIMIT = 8_000_000n;

/** compound() and rebalance() are permissionless: whoever calls them pays SaucerSwap's HBAR position fee. */
export const KeeperCard = ({ vault }: { vault: VaultState }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "TidepoolVault" });

  // quoteMintFee() is non-view (it calls the exchange-rate system contract), so it is simulated, not read.
  const { data: feeTinybars } = useQuery({
    queryKey: ["tidepool-mint-fee", vault.address],
    enabled: Boolean(publicClient && vault.address && vault.abi),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { result } = await publicClient!.simulateContract({
        address: vault.address!,
        abi: vault.abi!,
        functionName: "quoteMintFee",
        account: address,
      });
      return result as bigint;
    },
  });

  const now = BigInt(Math.floor(Date.now() / 1000));
  const readyAt =
    vault.lastRebalance !== undefined && vault.rebalanceCooldown !== undefined
      ? vault.lastRebalance + BigInt(vault.rebalanceCooldown)
      : undefined;
  const cooling = readyAt !== undefined && now < readyAt;
  const value = feeTinybars === undefined ? undefined : (feeTinybars + FEE_HEADROOM_TINYBARS) * TINYBAR_TO_WEIBAR;

  const run = async (functionName: "compound" | "rebalance") => {
    await writeContractAsync({ functionName, value, gas: KEEPER_GAS_LIMIT });
    await vault.refetch();
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-3">
        <h2 className="card-title">Keep the position working</h2>
        <p className="text-sm">
          SaucerSwap position fee:{" "}
          {feeTinybars === undefined ? "-" : `${formatUnits(feeTinybars, 8)} HBAR per compound or rebalance`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-outline"
            disabled={!address || value === undefined || isPending || vault.twapError}
            onClick={() => run("compound")}
          >
            {vault.positionSerial === 0n ? "Open position" : "Compound fees"}
          </button>
          <button
            className="btn btn-outline"
            disabled={
              !address ||
              value === undefined ||
              isPending ||
              vault.inRange !== false ||
              cooling ||
              !vault.positionSerial
            }
            onClick={() => run("rebalance")}
          >
            Rebalance
          </button>
        </div>
        {vault.twapError && (
          <p className="text-xs text-error">The pool&apos;s TWAP is unavailable, so the vault will not act.</p>
        )}
        {cooling && (
          <p className="text-xs opacity-70">
            Rebalance cooldown ends {new Date(Number(readyAt) * 1000).toLocaleString()}.
          </p>
        )}
      </div>
    </div>
  );
};
```

`packages/nextjs/app/_components/tidepool/ActivityFeed.tsx`

```tsx
import type { Abi } from "viem";
import { useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { HASHSCAN_URL } from "~~/utils/tidepool/constants";

const LABELS: Record<string, string> = {
  Initialized: "Vault initialized",
  Deposit: "Deposit",
  Withdraw: "Withdraw",
  FeesCollected: "Fees collected",
  Compound: "Compounded",
  Rebalance: "Range re-centred",
};

export const ActivityFeed = ({ vault, abi }: { vault?: `0x${string}`; abi?: Abi }) => {
  const { data: events, isLoading, error } = useVaultActivity(vault, abi);

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Activity (Hedera mirror node)</h2>
        {isLoading && <span className="loading loading-dots" />}
        {error && <p className="text-sm text-error">{error.message}</p>}
        {events?.length === 0 && <p className="text-sm">No activity yet.</p>}
        <ul className="divide-y divide-base-300">
          {events?.map(event => (
            <li key={`${event.transactionHash}-${event.logIndex}`} className="py-2 flex justify-between gap-4 text-sm">
              <span>{LABELS[event.name] ?? event.name}</span>
              <a
                className="link link-hover opacity-70"
                href={`${HASHSCAN_URL}/transaction/${event.transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {new Date(event.timestamp * 1000).toLocaleString()}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
```

### 9.12 `packages/nextjs/contracts/deployedContracts.ts`

Generated by `hardhat deploy` (`scripts/generateTsAbis.ts`) after the testnet deploy. **Commit it**: the blank template
also commits its testnet deployments, and it lets `npm run next:dev` show the live vault right after scaffolding.
Never hand-edit it; redeploy instead.

### 9.13 CI

`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20.18.3
          cache: yarn

      - name: Install
        run: yarn install --immutable

      - name: Contracts - compile, test, lint
        run: |
          yarn hardhat:compile
          yarn hardhat:test
          yarn hardhat:lint --max-warnings=0

      - name: Frontend - lint, types, build
        run: |
          yarn next:lint --max-warnings=0
          yarn next:check-types
          yarn next:build
```

---

## 10. Frontend architecture and user flows

> See the note at the start of 9.9: this section describes the design-stage frontend.

### 10.1 Data sources

| Data | Source | Hook |
|---|---|---|
| Vault address and ABI | `deployedContracts.ts` | `useDeployedContractInfo` |
| Vault state, totals, ticks | `eth_call` via hashio (no multicall on Hedera chains) | `useVault` |
| Token symbol/decimals | HTS ERC-20 facade | `useVault` |
| Association, balance, allowance | HIP-719 facade (`account` = user) | `useHtsAccount` |
| Position fee quote | `simulateContract(quoteMintFee)` | `KeeperCard` |
| History | mirror node `GET /api/v1/contracts/{vault}/results/logs` decoded with the ABI | `useVaultActivity` |

### 10.2 Deposit flow (first-time user on testnet)

1. Connect wallet (RainbowKit, Hedera Testnet 296). Fund from `portal.hedera.com/faucet`.
2. The Deposit card lists missing associations (WHBAR, SAUCE, share token) → **Associate** buttons (HIP-719).
3. **Wrap** HBAR → WHBAR via WhbarHelper `deposit()` (`value` in weibar).
4. Get SAUCE: swap on `testnet.saucerswap.finance` (or `npm run hardhat:smoke` for the deployer).
5. Enter an amount; the other side auto-fills in the vault's ratio; preview shares minus 1%.
6. **Approve & deposit**: `approve(vault, exact)` per token if needed, then `deposit(a0, a1, minShares, me)`.

### 10.3 Withdraw flow

Enter shares → preview amounts from `getTotalAmounts()` → `approve(vault, shares)` on the share token → `withdraw(shares, 99%·preview0, 99%·preview1, me)`.

### 10.4 Keeper flow

The Keeper card shows the position fee (`quoteMintFee`, tinybars → HBAR). **Open position / Compound fees** sends
`(fee + 0.1 HBAR) × 1e10` weibar; the vault refunds the extra. **Rebalance** is enabled only when the TWAP is out of range,
the cooldown is over, and a position exists. Both buttons use a fixed 8,000,000 gas limit (a position mint cannot be
pre-simulated; testnet usage was 4.8–5.3M). No keeper is included; an integrator can call `compound()`/`rebalance()`
from their own scheduler, and the contract guards make that safe to leave permissionless.

---

## 11. Testing strategy

| Layer | What | Where | Status |
|---|---|---|---|
| Unit (offline) | 17 tests on the in-process Hardhat chain with `MockHts` etched at `0x167`, `MockExchangeRate` at `0x168`, mock pool/manager/router doing real v4 liquidity maths | `test/TidepoolVault.test.ts` | [BUILD] 17/17 |
| Live smoke | associate → wrap → buy → approve → deposit → compound on testnet; prints HashScan links | `scripts/tidepoolSmoke.ts` (+ `tidepoolCompound.ts`) | [CHAIN] section 17a |
| Live fee generation | `simulate-traders`, then compound again and check `FeesCollected` | `scripts/simulateTraders.ts`, `tidepoolCompound.ts` | [CHAIN] 137,667 / 63,557 units collected |
| Live withdraw | 10% partial withdraw | `scripts/tidepoolWithdraw.ts` | [CHAIN] `0xd9a6a9fd…eacf` |
| Live rebalance | narrow vault: deposit → compound → move price → rebalance → restore | `tidepoolDeposit/MovePrice/Rebalance.ts` | [CHAIN] `0x890be6b4…08aa` |
| Gate dry run | scaffold from GitHub with npm **and** yarn; install, lint, build, start, curl routes | section 14 | Day 9 |

Unit tests cover: pool validation, init once/deployer only, first-deposit dead shares, compound opening a TWAP-centred
position + exact HBAR refund, insufficient fee, pro-rata second deposit, deposit blocked by deviation, unusable oracle,
**share-inflation attack**, fee collection + compounding, pro-rata withdraw + burn, withdraw mins, withdraw still works
under deviation, rebalance refusals (in range, cooldown, **sandwich**), and rebalance re-centring with value preserved
within the 0.3% swap fee.

What mocks cannot prove (hence the smoke test): real HTS association, token creation and refunds, the NFT transfer to a
contract, facade `approve` from a contract, `0x168` from the vault, SaucerSwap's exact rounding.

---

## 12. Deployment and operations runbook (testnet)

```bash
# 0. prerequisites: Node >= 20.18.3, git user.name/email set
npm run hardhat:account:generate          # encrypted key → packages/hardhat/.env (gitignored)
npm run hardhat:account                   # shows the address; fund it with ~100+ testnet HBAR (portal.hedera.com/faucet)

# 1. build and test
npm run hardhat:compile && npm run hardhat:test

# 2. deploy + initialize (≈ 4.6M gas deploy [CHAIN estimateGas], then initialize with 30 HBAR)
npm run hardhat:deploy:testnet            # writes packages/nextjs/contracts/deployedContracts.ts

# 3. evidence
npm run hardhat:smoke                     # prints HashScan links (associate, wrap, buy, deposit, compound)
npm run hardhat:simulate-traders          # optional: generate fees
npm run hardhat:compound                  # collect fees and add them (fixed 8M gas)
npm run hardhat:withdraw                  # partial withdraw (WITHDRAW_BPS, default 10%)
npm run hardhat:verify:sourcify           # verify on Sourcify → HashScan shows source

# 4. commit deployedContracts.ts (main vault entry only), push, make the repo public
```

**Demonstrating `rebalance` (narrow test vault).** Rebalancing the main vault would need a ~6% move of the shared pool,
so the template ships a separate vault, `TidepoolVaultNarrow` (`TIDEPOOL_NARROW`: ±60 ticks, 600 s cooldown), deployed only
by `hardhat:deploy:narrow` (the deploy script is skipped unless `TIDEPOOL_DEPLOY_NARROW=true`, which only
`scripts/runNarrowDeployWithPK.ts` sets). Flow: `hardhat:deposit` →
`hardhat:compound` (both with `TIDEPOOL_VAULT=TidepoolVaultNarrow`) → `hardhat:move-price` (quoted, confirmed one-way swap on
the **shared** pool) → wait for the 600 s TWAP to leave the range and come within 50 ticks of spot → `hardhat:rebalance`
(no default vault; refuses the main vault without `ALLOW_MAIN_VAULT_REBALANCE=true`; read-only preflight; fixed 8M gas;
post-mining checks) → `hardhat:move-price` back to restore the pool. Commands and evidence: README and section 17a.
A local narrow record makes every later deploy add a `TidepoolVaultNarrow` entry to `deployedContracts.ts`; do not commit it.

---

## 13. Documentation deliverables

### 13.1 `AGENTS.md` (full text)

`AGENTS.md`

````markdown
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
8. **Gas is not Ethereum-sized.** Each HTS association or allowance approval costs ~700-780k gas. The vault grants
   the manager and router standing `type(int64).max` allowances once, in `initialize()`, so `compound()`/`rebalance()`
   make no approvals (the deployed testnet vaults predate this and make six per call). Observed on testnet with the
   old per-call approvals: `initialize` 2.31M, first `compound` 5.13M,
   `rebalance` 5.26M, `withdraw` 0.36M. Hedera charged the gas used, not the limit.
9. **Position mints cannot be simulated.** `eth_call`/`eth_estimateGas` return `INVALID_NFT_ID` for any SaucerSwap
   V2 position mint (first `compound`, every `rebalance`), even when the real transaction succeeds. Send those with
   a fixed gas limit (8M) after read-only precondition checks; estimate everything else x 1.3.
10. **Deployment records.** `deployments/` is git-ignored. After any deploy, `generateTsAbis` rewrites
    `packages/nextjs/contracts/deployedContracts.ts` from every local record; if a `TidepoolVaultNarrow` record exists
    it is added too. The frontend only reads `TidepoolVault`; do not commit the narrow entry.

## Frontend conventions

Scaffold hooks: `useScaffoldReadContract`, `useScaffoldWriteContract`, `useDeployedContractInfo`, `useTransactor`.
DaisyUI classes. `~~` import alias. `"use client"` on pages with hooks. Prefer `type` over `interface`.
````

### 13.2 `README.md`

Written; see the repository root. Its sections: what Tidepool is, why, what it does, architecture, Hedera-specific
integration, why it is a useful template, setup, environment variables, local development, testnet deployment,
using the vault (deposit, compound, withdraw), the optional narrow-vault rebalance demo with the shared-pool warning,
live testnet evidence, known limitations, licence. The original outline was:


1. **Tidepool in one paragraph** + screenshot + testnet HashScan links (vault, share token, first compound).
2. **60-second path:** `npm create scaffold-hbar@latest --template <you>/tidepool` → `npm run next:dev` → open the live vault.
3. **What you learn:** owning a SaucerSwap V2 position from a contract; HTS share tokens from a contract; TWAP guards; HBAR fee handling.
4. **Architecture** (section 4 diagram) and the state machine.
5. **Range maths in plain words** (section 5) with the WHBAR/SAUCE example (tick −7665 ≈ 46.5 SAUCE/HBAR on testnet).
6. **When does compounding pay?** Fee ≈ $0.05 + gas vs collected fees.
7. **Hedera gotchas** (section 7), each with its reproduction command.
8. **Deploy your own vault** (section 12) and **adapt it** (change `tidepool.config.ts`: pool, width, windows).
9. **Keepers:** calling `compound()`/`rebalance()` from a cron job; costs; why it is safe to let anyone call.
10. **Security notes and limitations** (section 6.6); "not audited".
11. **Prior art & credits**; licence.

---

## 14. Gate dry run (Day 9)

```bash
# push to GitHub first, then from an EMPTY directory:
npx create-scaffold-hbar@latest tp-npm  -t <you>/tidepool --package-manager npm  -y
npx create-scaffold-hbar@latest tp-yarn -t <you>/tidepool --package-manager yarn -y
cd tp-npm
npm run lint && npm run next:check-types && npm run next:build && npm run hardhat:test
npm run next:serve &                       # next start on :3000
for r in / /debug /blockexplorer "/api/hedera/account?evm=0x0000000000000000000000000000000000004b40"; do
  curl -s -o /dev/null -w "%{http_code} $r\n" "http://localhost:3000$r"; done
```
In the template repository itself, `git ls-files | grep -E '(^|/)\.env$'` must print nothing.
All must print 200 and no errors. Repeat for `tp-yarn`.

---

## 15. Build plan (10 days, kill test first)

| Day | Date | Work | Exit criterion |
|---|---|---|---|
| 1 | Thu 25 Sep | **Spike on testnet:** deploy `TidepoolVault` as-is, `initialize` (30 HBAR), then run `smoke` | HashScan shows: association SUCCESS, share token created, deposit, `compound` minted LP NFT to the vault. **If the NFT transfer to the contract or the contract-side HTS calls fail: switch to the fallback (section 16.2) the same day.** |
| 2 | Fri 26 | Create the repo from the blank template (section 8), paste section 9, `yarn install` to regenerate `yarn.lock`, push; scaffold it once from GitHub | Gate path works before any polish. |
| 3–4 | Sat–Sun | Live-test every vault path: second deposit, `simulate-traders` + compound (see `FeesCollected`), withdraw, narrow-width vault + rebalance | HashScan links for each. |
| 5 | Mon 29 | AMA 10:00 ET: ask about gate edge cases (section 16.3). Fix anything the live runs showed. | — |
| 6 | Tue 30 | Harden tests (add anything live runs taught you); `verify:sourcify` | — |
| 7 | Wed 1 Oct | Frontend polish: screenshots, empty and error states, mobile | — |
| 8 | Thu 2 | README + AGENTS.md + diagrams | A stranger follows it end to end. |
| 9 | Fri 3 | Gate dry run (section 14) with npm and yarn; secret scan; repo public | All green. |
| 10 | Sat 4 | Buffer; submit repo + HashScan link + survey | Submitted before 11:59 PM ET Sun 4 Oct. |

---

## 16. Risks, fallback, open questions

### 16.1 Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Contract-side HTS association or token creation fails on testnet | Low–Med | High | Day-1 spike. `hiero-contracts` helpers are the official path; the response code is surfaced in `HtsCallFailed(rc)`. |
| LP NFT transfer to the contract fails | Low | High | Vault associates the NFT first; fallback below. |
| HTS facade `approve` from a contract behaves differently from ERC-20 | Low | Med | `forceApprove` handles non-standard returns; spike shows it. |
| Testnet pool drained or moved | Med | Med | Any V2 pool with cardinality > 1 works; change `tidepool.config.ts`. |
| Upstream npm packages change again before judging | Med | High | Pin exact versions of new deps; CI; re-run the gate dry run on 3 Oct. |
| Out-of-range demo timing | Med | Low | Narrow-width second vault. |

### 16.2 Fallback if Day 1 fails

Keep the position NFT in the **user's** wallet and ship a **position manager** frontend + library: range maths, TWAP
checks, swap-to-ratio, compound and rebalance built as multicalls the user signs directly against SaucerSwap's manager
and router. Same lane, same docs, less HTS depth.

### 16.3 Open questions for the AMA (29 Sep)

1. Is committing `deployedContracts.ts` for a live testnet vault acceptable (the blank template does it)?
2. Does "install passes" allow a root `.npmrc` with `legacy-peer-deps=true` (the CLI itself prints `npm install --legacy-peer-deps`)?
3. Should the template support Foundry too, or is Hardhat-only fine (`capabilities.solidityFramework: ["hardhat"]`)?

---

## 17. Extensions (README only, not built)

Single-sided zap deposits · LARI reward claiming · burning empty NFTs after rebalance (needs NFT approval to the manager) ·
HSS-scheduled compounding (HIP-1215) · multiple strategies (asymmetric ranges, volatility-based width) · performance fee ·
mainnet deployment (addresses in section 3.4).

---

## 17a. Testnet evidence log (25 Sep 2026) [CHAIN]

All transactions were sent from one ECDSA deployer account (visible on HashScan). Main vault: **0.0.10710646** / `0x2d209297642C4bb27c30ef37Fb18bCF842D55624` (pool WHBAR/SAUCE 0.30%, 0.0.2661057).

| Step | Tx hash | Result | Gas used / limit | Notes |
|---|---|---|---|---|
| Deploy `TidepoolVault` | `0x42cbb6c5…8079` | SUCCESS | 4,222,577 / 6,000,000 | |
| `initialize` (1st) | `0xe13de31b…53cc` | REVERT `HtsCallFailed(21)` | 1,969,541 / 2,000,000 | child `TOKENASSOCIATE` = `INSUFFICIENT_GAS`; atomic, no state change; 2.148 HBAR fee (landmine 16) |
| `initialize` (2nd) | `0x1dff79f5…6ef9` | SUCCESS | 2,313,512 / 5,000,000 | associations: WHBAR, SAUCE, LP NFT; share token **0.0.10710796** (8 dp, infinite, treasury and supply key = vault, no other keys); token creation kept 15.27009466 HBAR, vault refunded 14.72990534 of the 30 sent |
| smoke: `deposit` | `0x0bf5cee5…4947` | SUCCESS | 203,268 / 283,032 | 20 WHBAR + 925.314746 SAUCE in; 1e10 shares minted, 1e5 dead shares kept by the vault |
| smoke: `compound` | — | not sent | — | smoke's `eth_estimateGas` for the first compound failed with `INVALID_NFT_ID` (simulation limit below); smoke now uses a fixed 8M limit |
| `compound` (first position) | `0xcb477c3b…8d3f` | SUCCESS | **5,128,563** / 8,000,000 | TWAP tick −7695 → range **[−8340, −7140)**; LP NFT **0.0.1310436 serial 378** minted to the position manager and transferred to the vault; liquidity 45,894,658,424; swap 1.4918598 WHBAR → 68.899548 SAUCE via router; 18.5081402 WHBAR + 988.756018 SAUCE added; 5.458276 SAUCE left idle; position fee 0.64079562 HBAR (exactly `tinybars(fee)+1`) paid to the pool; 1.00000000 HBAR refunded; network fee 5.59013367 HBAR |
| `simulate-traders` (3 rounds) | `0x0a3c8a25…08ea` … `0xd4a294b7…3440` | SUCCESS ×9 | 142k–199k per swap, ~727k per approve | 5 HBAR each way, all on pool 0.0.2661057 |
| `compound` (fee-bearing) | `0xd157a337…6fcf` | SUCCESS | 4,802,810 / 8,000,000 | `FeesCollected(137667, 63557)`; `increaseLiquidity` on #378: +138,473,646 liquidity; swap 2.530344 SAUCE → 0.05446514 WHBAR; no new NFT |
| approve shares + `withdraw` (10%) | `0x0d2a44fc…9d10`, `0xd9a6a9fd…eacf` | SUCCESS | 727,032; **360,910** | 999,990,000 shares burned; supply 9,000,010,000; #378 liquidity 46,033,132,070 → 41,429,864,897 |

Narrow test vault `TidepoolVaultNarrow`: **0.0.10716411** / `0x91EdDBE42CFF874FdAFC2c1463Ca734A10C6E905` (same pool; ±60 ticks, 600 s cooldown).

| Step | Tx hash | Result | Gas used / limit | Notes |
|---|---|---|---|---|
| Deploy | `0x431013ba…d6e9` | SUCCESS | 4,222,565 / 6,000,000 | first run was interrupted before `initialize`; the rerun reused this deployment |
| `initialize` | `0x426f1b52…9419` | SUCCESS | 2,313,452 / 5,000,000 | share token **0.0.10716482** (tpNARROW); 14.72990534 HBAR refunded |
| associate + 2 approvals + `deposit` | `0xfd87a143…1777`, `0xe7f00985…e087`, `0x6f5b5d46…be2b`, `0xcdb3cbea…f268` | SUCCESS | deposit 155,315 | exactly 2 WHBAR + 93 SAUCE; 99.999 shares to the depositor |
| `compound` (first position) | `0x2285403b…93c6` | SUCCESS | 5,128,549 / 8,000,000 | TWAP −7697 → **[−7800, −7680)**, NFT **#380**, liquidity 41,622,687,268; 15.862371 SAUCE left idle |
| move price down: wrap, approve, swap | `0xd312cba0…0c27`, `0x1a3ad29c…dd65`, `0xf05334b2…1a48` | SUCCESS | 77,966; 726,840; 172,329 | 142.1 WHBAR → 6,512.183911 SAUCE; spot −7699 → −7850 |
| **`rebalance`** | **`0x890be6b4…08aa`** | SUCCESS | **5,257,516** / 8,000,000 | executed TWAP −7850 → **[−7920, −7800)**; NFT **#380 → #381**; #380 liquidity 41,622,687,268 → **0**; #381 liquidity 43,510,992,498; both NFTs still owned by the vault; `FeesCollected(782708, 0)`; 7.634641 SAUCE left idle |
| restore: approve, swap back | `0x181dd5f3…1e4a`, `0xf109b4c1…d796` | SUCCESS | 726,840; 211,030 | 6,518.359326 SAUCE → 141.42039494 WHBAR; spot back to −7700 (the 600 s TWAP follows) |

**Gas findings:**
- **Each HTS allowance approval made by the vault costs 705,424 gas.** In the deployed version `compound()` made six (set and clear, for router and manager), 4,232,544 gas, 83% of the call. The source now grants standing allowances once in `initialize()` instead; expected cost after redeploying (not yet measured): `initialize` ≈ 5.14M, first `compound` / `rebalance` ≈ 0.9–1.1M.
- Inside `compound()`: router swap ~104k gas, SaucerSwap `mint` ~633k, HTS NFT mint ~283k.
- An EOA's HTS association is estimated at ~782k gas, an EOA approval at ~783k, and a WhbarHelper wrap at ~839k (before association).
- **Hedera charged by gas used (about 109 tinybars per gas) in every transaction observed**, not by 80% of the gas limit, so generous limits cost nothing extra on success.
- The frontend's original fixed `gas: 3_000_000` for compound and rebalance was too low; `KeeperCard` now uses 8,000,000.
- `rebalance()` (deployed version) used 5,257,516 gas: six approvals 4,232,544, `decreaseLiquidity` 116,552, collects 154,524 + 39,945, swap 97,523, SaucerSwap `mint` 575,872.

**Simulation limit:** `eth_call` and `eth_estimateGas` return `INVALID_NFT_ID` for any SaucerSwap V2 position mint (the HTS NFT mint followed by `transferFrom` of the new serial), including mints that succeeded on-chain. Replaying real mint `0x4cf676ed…66f7` reproduced it. So `compound()` (first position) and `rebalance()` cannot be pre-checked; send them with a fixed gas limit (`scripts/tidepoolCompound.ts`).

## 18. Sources

- Bounty brief: https://hedera.com/blog/scaffold-hbar-template-bounty/
- Scaffold-HBAR docs: https://docs.hedera.com/solutions/tools/scaffold-hbar · CLI: https://github.com/hedera-dev/create-scaffold-hbar · templates: https://github.com/hedera-dev/scaffold-hbar (branch `templates/blank-template`)
- SaucerSwap developer docs (index https://docs.saucerswap.finance/llms.txt): contracts, V2 new position, increase, decrease, claiming fees, liquidity position fee, WHBAR overview and WhbarHelper wrap/unwrap
- SaucerSwap V2 source: https://github.com/saucerswaplabs/saucerswaplabs-v2-periphery (GPL-2.0), https://github.com/saucerswaplabs/saucerswaplabs-v2-core (BUSL-1.1)
- Hiero contracts: https://github.com/hiero-ledger/hiero-contracts (npm `@hiero-ledger/hiero-contracts@0.2.0`)
- Uniswap v4-core: https://github.com/Uniswap/v4-core (per-file SPDX; the libraries used are MIT)
- Hedera docs: HBAR units https://docs.hedera.com/hedera/sdks-and-apis/sdks/hbars · fees https://docs.hedera.com/hedera/networks/mainnet/fees · HIP-719, HIP-904
- Sourcify APIv2: https://sourcify.dev/server/api-docs/
- Hedera Forking: https://github.com/hashgraph/hedera-forking (`@hashgraph/system-contracts-forking`)
