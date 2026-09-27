# Tidepool — Architecture

> **A SaucerSwap V2 liquidity vault, packaged as a Scaffold-HBAR template.**
> Target: Hedera **Scaffold-HBAR Template Bounty** (submissions close **Sun 4 Oct 2026, 11:59 PM ET**).
> Document version 1.0 · research and verification done 24–25 Sep 2026.

---

Evidence tags used below: **[CHAIN]** checked against Hedera testnet (mirror node or `eth_call` through
`testnet.hashio.io`); **[SRC]** read in source code (SaucerSwap V2, `hiero-contracts`, `create-scaffold-hbar`,
Uniswap v4-core, the Scaffold-HBAR blank template); **[DOCS]** stated in official documentation; **[BUILD]** proven by
running it (compile, tests, lint, `next build`). If reality disagrees with this document, reality wins: re-verify,
fix the document, continue.

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
- No mainnet deployment claims. The template ships mainnet addresses only as documentation (section 2.4).

---

## 2. Verified facts register

### 2.1 SaucerSwap V2 on Hedera testnet [CHAIN] (24 Sep 2026)

| Contract / token | Hedera ID | EVM address | Checked |
|---|---|---|---|
| SaucerSwapV2Factory | 0.0.1197038 | `0x00000000000000000000000000000000001243ee` | `mintFee()` = **500000000** tinycents (5 US cents); `feeAmountTickSpacing`: 500→10, 1500→30, 3000→60, 10000→200 |
| NonfungiblePositionManager | 0.0.1308184 | `0x000000000000000000000000000000000013f618` | `nft()` = 0.0.1310436; `WHBAR()` = 0.0.15057; `whbar()` = 0.0.15058; `factory()` = 0.0.1197038 |
| SwapRouter | 0.0.1414040 | `0x0000000000000000000000000000000000159398` | `WHBAR()`, `whbar()`, `factory()` as above; used by traders 22–23 Sep |
| QuoterV2 | 0.0.1390002 | `0x00000000000000000000000000000000001535b2` | exists |
| LP NFT (HTS) | 0.0.1310436 | `0x000000000000000000000000000000000013fee4` | — |
| WHBAR contract | 0.0.15057 | `0x0000000000000000000000000000000000003ad1` | **do not call directly** (section 6.9) |
| WHBAR token (HTS, 8 dp) | 0.0.15058 | `0x0000000000000000000000000000000000003ad2` | — |
| SAUCE token (HTS, 6 dp) | 0.0.1183558 | `0x0000000000000000000000000000000000120f46` | — |
| USDC (SaucerSwap testnet, 6 dp) | 0.0.5449 | `0x0000000000000000000000000000000000001549` | not Circle's testnet USDC (0.0.429274) |
| **WhbarHelper** | 0.0.5286055 | `0x000000000000000000000000000000000050a8a7` | `deposit()` (`0xd0e30db0`) and `unwrapWhbar(uint256)` (`0xa65292ae`) called on 21 and 25 Sep |

### 2.2 The demo pool [CHAIN]

| Pool | Address | token0 / token1 | Fee | Spacing | Tick | Liquidity | Observation cardinality |
|---|---|---|---|---|---|---|---|
| **WHBAR/SAUCE** (use this) | `0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7` | WHBAR / SAUCE | 3000 | 60 | −7665 | 1.204e12 | **1000** (oldest observation ≈ 90 days old) |
| WHBAR/USDC | `0x914B98992d7eD602D1f5d9084ECe8160Fc0e741a` | USDC / WHBAR | 3000 | 60 | 38874 | 1.200e11 | **1** |

- On WHBAR/SAUCE, `observe([600,0])`, `observe([1800,0])` and `observe([3600,0])` all returned sane mean ticks (−7665, −7664, −7661).
- Tick −7665 ≈ 1.0001^−7665 × 10^(8−6) ≈ **46.5 SAUCE per HBAR** on testnet.
- **Testnet prices are not market prices.** The WHBAR/USDC testnet pool implies ≈ $2.05/HBAR while the
  exchange-rate system contract says ≈ $0.078. Irrelevant for LP maths; say so in the UI (the page does).

### 2.3 Hedera platform facts

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

### 2.4 Mainnet addresses (documentation only) [DOCS]

Factory 0.0.3946833 · SwapRouter 0.0.3949434 · QuoterV2 0.0.3949424 · NonfungiblePositionManager**V2** 0.0.4053945
(LP NFT 0.0.4054027; the older manager 0.0.3949448 is deprecated) · WHBAR contract 0.0.1456985 / token 0.0.1456986 ·
WhbarHelper 0.0.5808826. Not tested by this project.

### 2.5 Scaffold-HBAR facts [SRC][BUILD]

| Fact | Consequence |
|---|---|
| CLI `create-scaffold-hbar@0.4.0`; Node **≥ 20.18.3**; git `user.name`/`user.email` must be set | Put in README prerequisites. |
| `template.json` Zod schema **requires top-level `"name"`**; `packageManager` enum is `yarn \| npm \| none` | The docs' example (no `name`, uses `"pnpm"`) **fails validation twice**. Use the root `template.json`. |
| `template.json` supports `name`, `description`, `version`, and under `create-scaffold-hbar`: `capabilities`, `defaults`, `requirements`, `envVars`, `rename`, `outro.sections` | The CLI deletes `template.json` after scaffolding. |
| Outro placeholders: `{run:script}` → `npm run script` / `yarn script`; `{run:framework:x}` | Only reference root scripts that exist. |
| Templates are authored in **yarn form** (`yarn workspace @sh/hardhat deploy`); for npm the CLI rewrites to `npm run deploy -w @sh/hardhat --` and deletes `.yarnrc.yml`, `.yarn`, `yarn.lock`, `.husky` | Author root scripts like the root `package.json`. |
| With npm, `npm run hardhat:deploy --network X` **drops `--network`** (npm eats the flag) | Ship `hardhat:deploy:testnet`; document `-- --network`. |
| A fresh blank scaffold with npm **fails `npm install`** with ERESOLVE (`@nomicfoundation/hardhat-verify@2.1.3` wants `hardhat ^2.26.0`, template pins 2.22.19). The template's `packages/hardhat/.npmrc` is **ignored** by npm for workspace installs | Commit a **root** `.npmrc` with `legacy-peer-deps=true`. |
| A fresh blank scaffold **fails `next build`**: wagmi → `@base-org/account` → `@coinbase/cdp-sdk@1.56.0` (published 14 Sep 2026) imports optional peers `@x402/*` that are not installed | webpack `resolve.alias` to `false` for `@x402/core`, `@x402/evm`, `@x402/svm`, `@x402/extensions` (`packages/nextjs/next.config.ts`). |
| `hardhat.config.ts` forks testnet for the in-process `hardhat` network unconditionally | Make forking opt-in (`enabled: HEDERA_FORKING === "true"`) so unit tests run offline. |
| The hedera-forking plugin emulates **HTS only** (not `0x168`, not the schedule service) | SaucerSwap's `pool.mint` calls `0x168`, so fork tests of minting would fail; use mocks + live smoke tests instead. |
| Hardhat compiles with solc 0.8.28, evm target **paris** | Deployed bytecode 19,048 bytes (< 24,576). |

---

## 3. System architecture

### 3.1 Component diagram

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

### 3.2 Trust model

- **Immutable vault.** All parameters are constructor immutables. There is no owner, no pause, no fee switch.
- **Deployer power:** only `initialize()` (once). It cannot touch funds.
- **Price trust:** the vault trusts the pool's `slot0` and `observe`. The constructor verifies that the pool is the
  factory's canonical pool for its tokens and fee, and that the router uses the same factory.
- **Keepers are untrusted.** They can only trigger actions whose preconditions the contract checks (TWAP deviation,
  out-of-range, cooldown). The worst a hostile keeper can do is pay SaucerSwap's fee for us.

### 3.3 State machine

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

## 4. Concepts primer (read before touching the maths)

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

## 5. Smart contract design

### 5.1 Files

| File | Role | Lines |
|---|---|---|
| `contracts/tidepool/TidepoolVault.sol` | The vault | ~530 |
| `contracts/tidepool/libraries/RangeMath.sol` | TWAP consult, range snapping, liquidity amounts, swap-to-ratio | ~115 |
| `contracts/tidepool/interfaces/ISaucerSwapV2.sol` | Minimal factory / pool / manager / router interfaces | ~160 |
| `contracts/tidepool/test/Mocks.sol` | Test doubles (never deployed live) | ~300 |

Dependencies: OpenZeppelin 5.6.1 (already in the template), `@uniswap/v4-core@1.0.2` (`FullMath`, `TickMath`,
`SqrtPriceMath`: all SPDX **MIT**), `@hiero-ledger/hiero-contracts@0.2.0` (`HederaTokenService`,
`IHederaTokenService`, `HederaResponseCodes`, `IExchangeRate`).

### 5.2 Parameters (constructor `Config`) and testnet values

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

### 5.3 Function-by-function flows

**`initialize(name, symbol)` payable, deployer only, once**
1. `associateTokens(this, [token0, token1, positionNft])` via `0x167` → must return 22 (SUCCESS).
2. `createFungibleToken` with treasury = vault, supply key = `contractId(vault)`, auto-renew account = vault,
   initial supply 0, decimals 8. `msg.value` is forwarded (HederaTokenService helper does `call{value: msg.value}`).
3. Standing allowances: a cap per token from `getFungibleTokenInfo` (finite supply → `maxSupply`; infinite supply,
   or a failed lookup such as a non-HTS token → `type(int64).max`), stored as `approvalCap0/1`, then a plain
   `approve` of that cap to `positionManager` and `swapRouter` on each token, with the result checked (a rejection
   reverts once; no `forceApprove` reset-and-retry). HTS allowances are int64, so `type(uint256).max` is never
   valid, and HTS rejects an allowance above a finite token's max supply (`AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY`, see
   §13). Paid once here (~705k gas each) instead of six approvals on every compound/rebalance.
4. Any HBAR left in the vault is refunded to the deployer. Deploy script sends **30 HBAR**
   (TokenCreate $1.00 + 20% ≈ 15.4 HBAR at 7.8 ¢/HBAR, with headroom). [CHAIN]: the token creation kept 15.27009466 HBAR
   and the vault refunded 14.72990534 HBAR, on every testnet vault. `initialize` used 2.31M gas with only the three
   associations; with the two token-info lookups and four standing approvals it used 5,236,012 gas (26 Sep 2026).
   The deploy scripts use an 8M limit and run `initialize()` as an `eth_call` first, stopping if it would revert.

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

**`refreshApprovals()`**, permissionless, after `initialize()`
1. Re-approves `positionManager` and `swapRouter` on token0 and token1 up to `approvalCap0/1`. The spenders and caps are
   fixed, so the call can only restore allowances that compound/rebalance spent down.

**Views:** `getTotalAmounts()` (principal at spot + idle; excludes uncollected fees), `getPriceState()` (spot, TWAP, in-range),
`quoteMintFee()` (non-view because `IExchangeRate` is declared non-view; call it with `eth_call`/`simulateContract`).

### 5.4 Why exactly `tinycentsToTinybars(fee) + 1` (the WHBAR pay trap) [SRC]

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

### 5.5 Invariants

1. `totalShares` equals the share token's HTS total supply (every mint/burn goes through `_mintShares`/`_burnShares`).
2. `totalShares ≥ DEAD_SHARES` once anyone has deposited.
3. The vault holds no HBAR at rest (all fee HBAR is forwarded or refunded in the same call).
4. The vault's only token allowances are the standing allowances on token0 and token1 to the immutable
   `positionManager` and `swapRouter`, never above `approvalCap0/1` (set once in `initialize()`). They are granted
   in `initialize()` and re-granted, to the same caps, only by the permissionless `refreshApprovals()`; no other
   function grants, raises or clears an allowance. (The manager and router are SaucerSwap contracts checked in the constructor:
   the pool must come from the manager's factory and the router must report the same factory.)
5. `tickLower`/`tickUpper` are multiples of `tickSpacing`, `tickLower < tickUpper`.

### 5.6 Threat model

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
| Standing allowances to manager and router | Both addresses are immutable and checked against the SaucerSwap factory in the constructor; the vault trusts SaucerSwap's manager and router code (it already holds its position in them). Allowance per token is its max supply if finite (SAUCE on testnet: 1e15 units = 1e9 SAUCE), otherwise `type(int64).max` (~9.2e10 WHBAR at 8 dp). It decreases as it is spent; `refreshApprovals()` (permissionless, fixed spenders and amounts) restores it. |
| int64 overflow of shares | `SafeCast.toInt64` reverts. Headroom: ~9.2e8× growth over the first deposit. |
| Rounding | Deposits round amounts **up**, withdrawals round **down**, both in the vault's favour. |

Known limitations (put them in the README): uncollected fees are excluded from `getTotalAmounts()` until the next
collect; a rebalance swap ignores price impact (leftovers stay idle until the next compound); empty old NFTs accumulate;
standing allowances are capped per token and not topped up automatically (compound and rebalance revert once one runs
low, until someone calls `refreshApprovals()`); not audited.

---

## 6. Hedera and SaucerSwap landmines (docs gold)

Each item includes how to reproduce it. These go into the README "Hedera gotchas" chapter.

1. **Position fee in tinycents, paid in HBAR, on every mint and increase.** Reproduce:
   `cast`-style `eth_call` of `mintFee()` on the factory (500000000) and `tinycentsToTinybars(500000000)` on `0x168`
   (≈ 64 079 561 tinybars). Consequence: compounding dust loses money. Rule of thumb for the README:
   compound only when collected fees are worth more than the fee (≈ $0.05) plus gas, i.e. roughly
   `fees_usd > 0.05 / (1 − swap_fee)`, plus the ~0.3% swap on the unbalanced part.
2. **The WHBAR pay trap** (section 5.4): send exactly the fee.
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
16. **HTS association from a contract is paid in gas, and it is expensive.** Found live on 25 Sep 2026 (tx `0xe13de31b…53cc`): `initialize()` with a 2,000,000 gas limit failed. The child `TOKENASSOCIATE` record says `INSUFFICIENT_GAS` (code 30), and the hiero `HederaTokenService` helper surfaced it as `HtsCallFailed(21)` (`UNKNOWN`) because the failed call returned no decodable code. Each association costs about 650–700k gas (≈ $0.05 + 20%), so three need about 2M. `eth_estimateGas` returned 2,511,738. `initialize()` now also grants four standing approvals (5,236,012 gas in total), and the deploy scripts use 8,000,000. Debug this kind of failure with the mirror node: `/api/v1/contracts/results/{hash}/actions` shows the system call's output, and `/api/v1/transactions/{id}` lists the child records with their real response codes. Also observed: an EVM-deployed contract gets `max_automatic_token_associations = -1`.
17. **HTS rejects an allowance above a finite token's maxSupply (AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY).** Found live on
    26 Sep 2026 (tx `0x9e323774…513c`): `initialize()` granted `type(int64).max` allowances; WHBAR (INFINITE supply)
    accepted, SAUCE (FINITE, maxSupply 1e15) returned response code 289 on the `CRYPTOAPPROVEALLOWANCE` child record.
    `SafeERC20.forceApprove` then reset to 0 and retried, spending a third ~705k-gas approval before reverting. Fix: read
    the supply type with `getFungibleTokenInfo` and cap each allowance at `maxSupply` (or `type(int64).max` if
    infinite), approve with a plain checked `approve`, and let anyone restore spent allowances with
    `refreshApprovals()`. Reproduce: `GET /api/v1/tokens/0.0.1183558` shows `supply_type` and `max_supply`.

---

## 7. Repository layout

The repo is authored in **yarn form**, exactly like `hedera-dev/scaffold-hbar` branch `templates/blank-template`,
minus Foundry and minus the sample contracts. The CLI converts it for npm users.

```
tidepool/                                 (GitHub: <you>/tidepool, public, MIT)
├── .github/workflows/ci.yml
├── .agents/  .claude/  .husky/           copied from the blank template (unchanged)
├── .yarn/  .yarnrc.yml  yarn.lock        from the blank template; yarn.lock regenerated
├── .gitignore  .lintstagedrc.js          from the blank template
├── .npmrc                                legacy-peer-deps=true   (NEW, root)
├── AGENTS.md                             section 11.1; replaces the blank one
├── CLAUDE.md                             unchanged ("@AGENTS.md")
├── LICENCE                               MIT, your name
├── README.md                             project README (section 11.2)
├── docs/ARCHITECTURE.md                  this document
├── package.json                          yarn form
├── template.json
└── packages/
    ├── hardhat/
    │   ├── .npmrc  .gitignore  eslint.config.mjs  tsconfig.json   (unchanged)
    │   ├── hardhat.config.ts             one change: forking opt-in
    │   ├── package.json
    │   ├── tidepool.config.ts
    │   ├── contracts/tidepool/
    │   │   ├── TidepoolVault.sol
    │   │   ├── interfaces/ISaucerSwapV2.sol
    │   │   ├── libraries/RangeMath.sol
    │   │   └── test/Mocks.sol
    │   ├── deploy/00_deploy_tidepool_vault.ts            main vault
    │   ├── deploy/01_deploy_tidepool_vault_narrow.ts     rebalance demo vault (opt-in: TIDEPOOL_DEPLOY_NARROW=true)
    │   ├── scripts/                      template account scripts + runScriptWithPK, tidepoolScriptUtils, tidepoolSmoke,
    │   │                                 tidepoolCompound, tidepoolWithdraw, tidepoolDeposit, tidepoolMovePrice,
    │   │                                 tidepoolRebalance, simulateTraders, verifySourcify
    │   ├── test/TidepoolVault.test.ts
    │   └── utils/getDeployGasPrice.ts (unchanged), utils/preflightInitialize.ts
    └── nextjs/
        ├── next.config.ts                x402 alias
        ├── contracts/deployedContracts.ts   GENERATED by deploy, then COMMITTED (both testnet vaults)
        ├── app/page.tsx
        ├── app/_components/tidepool/*
        ├── hooks/tidepool/*
        └── utils/tidepool/*
```

**Delete from the blank template:** `packages/foundry/` (and its workspace entry), `contracts/HederaToken.sol`,
`contracts/HtsTokenCreator.sol`, `contracts/interfaces/IHederaTokenService.sol`, `deploy/00_…`–`02_…`,
`test/HederaToken.test.ts`, `test/HtsTokenCreator.test.ts`, the old `.github/workflows/*` and `.gitmodules`
(it only lists Foundry submodules).

---

## 8. Frontend architecture and user flows

> **Shipped frontend differs.** This section records the design-stage frontend. The shipped dashboard
> (`packages/nextjs`, see `AGENTS.md`) is laid out as numbered loop stages, has a Main / Narrow Demo vault selector,
> replaces `KeeperCard` with the keeper stages in `KeeperPanel.tsx`, sends `compound`/`rebalance` with
> `disableSimulate: true`, fixed 8M gas and fee + 0.1 HBAR, and maps custom errors to plain language. The code and
> the README's Dashboard section are authoritative.

### 8.1 Data sources

| Data | Source | Hook |
|---|---|---|
| Vault address and ABI | `deployedContracts.ts` | `useDeployedContractInfo` |
| Vault state, totals, ticks | `eth_call` via hashio (no multicall on Hedera chains) | `useVault` |
| Token symbol/decimals | HTS ERC-20 facade | `useVault` |
| Association, balance, allowance | HIP-719 facade (`account` = user) | `useHtsAccount` |
| Position fee quote | `simulateContract(quoteMintFee)` | `KeeperCard` |
| History | mirror node `GET /api/v1/contracts/{vault}/results/logs` decoded with the ABI | `useVaultActivity` |

### 8.2 Deposit flow (first-time user on testnet)

1. Connect wallet (RainbowKit, Hedera Testnet 296). Fund from `portal.hedera.com/faucet`.
2. The Deposit card lists missing associations (WHBAR, SAUCE, share token) → **Associate** buttons (HIP-719).
3. **Wrap** HBAR → WHBAR via WhbarHelper `deposit()` (`value` in weibar).
4. Get SAUCE: swap on `testnet.saucerswap.finance` (or `npm run hardhat:smoke` for the deployer).
5. Enter an amount; the other side auto-fills in the vault's ratio; preview shares minus 1%.
6. **Approve & deposit**: `approve(vault, exact)` per token if needed, then `deposit(a0, a1, minShares, me)`.

### 8.3 Withdraw flow

Enter shares → preview amounts from `getTotalAmounts()` → `approve(vault, shares)` on the share token → `withdraw(shares, 99%·preview0, 99%·preview1, me)`.

### 8.4 Keeper flow

The Keeper card shows the position fee (`quoteMintFee`, tinybars → HBAR). **Open position / Compound fees** sends
`(fee + 0.1 HBAR) × 1e10` weibar; the vault refunds the extra. **Rebalance** is enabled only when the TWAP is out of range,
the cooldown is over, and a position exists. Both buttons use a fixed 8,000,000 gas limit (a position mint cannot be
pre-simulated; testnet usage is 0.56–0.98M with standing approvals, 4.8–5.3M before them). No keeper is included; an integrator can call `compound()`/`rebalance()`
from their own scheduler, and the contract guards make that safe to leave permissionless.

---

## 9. Testing strategy

| Layer | What | Where | Status |
|---|---|---|---|
| Unit (offline) | 27 tests on the in-process Hardhat chain with `MockHts` etched at `0x167`, `MockExchangeRate` at `0x168`, mock pool/manager/router doing real v4 liquidity maths, and a finite-supply SAUCE mock that rejects allowances above its max supply | `test/TidepoolVault.test.ts` | [BUILD] 27/27 |
| Live smoke | associate → wrap → buy → approve → deposit → compound on testnet; prints HashScan links | `scripts/tidepoolSmoke.ts` (+ `tidepoolCompound.ts`) | [CHAIN] section 13 |
| Live fee generation | `simulate-traders`, then compound again and check `FeesCollected` | `scripts/simulateTraders.ts`, `tidepoolCompound.ts` | [CHAIN] 466,241 / 213,024 units collected, `0x76c31145…a9ca` |
| Live withdraw | partial withdraw (script, or the dashboard) | `scripts/tidepoolWithdraw.ts`, dashboard | [CHAIN] `0xb8132ee0…f7b4` (dashboard, second account) |
| Live rebalance | narrow vault: deposit → compound → move price → rebalance → restore | `tidepoolDeposit/MovePrice/Rebalance.ts` | [CHAIN] `0xf55864c1…0654` |

Unit tests cover: pool validation, init once/deployer only, first-deposit dead shares, compound opening a TWAP-centred
position + exact HBAR refund, insufficient fee, pro-rata second deposit, deposit blocked by deviation, unusable oracle,
**share-inflation attack**, fee collection + compounding, pro-rata withdraw + burn, withdraw mins, withdraw still works
under deviation, rebalance refusals (in range, cooldown, **sandwich**), rebalance re-centring with value preserved
within the 0.3% swap fee, compound refusing an out-of-range position (`OutOfRange`) and an empty first compound
(`NothingToCompound`), `TwapUnavailable` on deposit and rebalance, standing allowances granted once (compound twice
without re-approving), allowance caps (finite supply → max supply, infinite → int64 max, failed lookup → int64 max, a
rejected approval reverts `initialize` once), and `refreshApprovals()`.

What mocks cannot prove (hence the smoke test): real HTS association, token creation and refunds, the NFT transfer to a
contract, facade `approve` from a contract, `0x168` from the vault, SaucerSwap's exact rounding.

---

## 10. Deployment and operations runbook (testnet)

```bash
# 0. prerequisites: Node >= 20.18.3, git user.name/email set
npm run hardhat:account:generate          # encrypted key → packages/hardhat/.env (gitignored)
npm run hardhat:account                   # shows the address; fund it with ~100+ testnet HBAR (portal.hedera.com/faucet)

# 1. build and test
npm run hardhat:compile && npm run hardhat:test

# 2. deploy + initialize (deploy 4,860,874 gas, then an eth_call preflight, then initialize with 30 HBAR: 5,236,012 gas)
npm run hardhat:deploy:testnet            # writes packages/nextjs/contracts/deployedContracts.ts

# 3. evidence
npm run hardhat:smoke                     # prints HashScan links (associate, wrap, buy, deposit, compound)
npm run hardhat:simulate-traders          # optional: generate fees
npm run hardhat:compound                  # collect fees and add them (fixed 8M gas)
npm run hardhat:withdraw                  # partial withdraw (WITHDRAW_BPS, default 10%)
npm run hardhat:verify:sourcify           # verify on Sourcify → HashScan shows source

# 4. commit the regenerated deployedContracts.ts (main and narrow vault entries) and push
```

**Demonstrating `rebalance` (narrow test vault).** Rebalancing the main vault would need a ~6% move of the shared pool,
so the template ships a separate vault, `TidepoolVaultNarrow` (`TIDEPOOL_NARROW`: ±60 ticks, 600 s cooldown), deployed only
by `hardhat:deploy:narrow` (the deploy script is skipped unless `TIDEPOOL_DEPLOY_NARROW=true`, which only
`scripts/runNarrowDeployWithPK.ts` sets). Flow: `hardhat:deposit` →
`hardhat:compound` (both with `TIDEPOOL_VAULT=TidepoolVaultNarrow`) → `hardhat:move-price` (quoted, confirmed one-way swap on
the **shared** pool) → wait for the 600 s TWAP to leave the range and come within 50 ticks of spot → `hardhat:rebalance`
(no default vault; refuses the main vault without `ALLOW_MAIN_VAULT_REBALANCE=true`; read-only preflight; fixed 8M gas;
post-mining checks) → `hardhat:move-price` back to restore the pool. Commands and evidence: README and section 13.
The narrow deploy adds a `TidepoolVaultNarrow` entry to the generated `deployedContracts.ts`; the dashboard reads both vaults from it.

---

## 11. Documentation deliverables

### 11.1 `AGENTS.md` (full text)

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
The root `package.json` scripts are authored in yarn form (`yarn workspace @sh/hardhat …`), like the Scaffold-HBAR
templates; `create-scaffold-hbar` rewrites them for npm when a project is created with npm. In this template
repository itself, run them with Yarn (`corepack enable` provides the pinned version); the `npm run` lines below are
what an npm-created project uses. With npm, pass extra flags after `--`
(`npm run hardhat:deploy -- --network hederaTestnet`); without the `--`, npm swallows `--network`.

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
- `packages/hardhat/utils/preflightInitialize.ts` — both deploy scripts run `initialize()` as an `eth_call` first and
  stop, printing the revert reason, if it would revert
- `packages/hardhat/scripts/tidepool*.ts` — testnet operator scripts; shared helpers in `tidepoolScriptUtils.ts`
- `packages/nextjs/app/page.tsx` + `packages/nextjs/app/_components/tidepool/*` — dashboard, laid out as "the loop":
  `VaultSelector`; `VaultHero` (holdings, `VaultStatusPill`, and `YourStake` from `YourPosition.tsx`); numbered
  `LoopStage`s (`Loop.tsx`) for 01 Price and 02 Range (`PriceRange.tsx`, chart in `RangeChart.tsx`), 03 Fees
  (`FeesStage.tsx`), and 04 Compound / 05 Rebalance (`KeepStages` in `KeeperPanel.tsx`); the sticky Act column
  (`UserActions` with `DepositCard`/`WithdrawCard` and `AssociateButton`); the `ActivityFeed` timeline; shared
  `TxRail.tsx` (transaction steps), `motion.tsx` (number tweens, reveals, range highlight) and `ui.tsx`
- `packages/nextjs/hooks/tidepool/` — `useVault` (vault, idle balances, `positions()`, chain time), `useUserPosition`,
  `useHtsAccount`, `useKeeperStatus` (keeper checklist and fee/gas quotes), `useTxFeedback` (inline tx status and
  mirror-node revert reasons), `useSelectedVault`, `useWalletGate`, `useVaultActivity`
- `packages/nextjs/utils/tidepool/` — `vaults.ts` (selectable vaults), `constants.ts` (gas limits, ABIs), `errors.ts`
  (plain-language custom errors), `hashscan.ts`, `math.ts`
- `packages/nextjs/contracts/deployedContracts.ts` — generated by the deploy scripts and committed; holds both
  `TidepoolVault` and `TidepoolVaultNarrow`

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
   make no approvals. Observed on testnet: `initialize` 5.24M, first `compound` 0.89M, `compound` into an existing
   position 0.56M, `rebalance` 0.98M, `withdraw` 0.34M (the earlier version with six approvals per call used 5.13M
   for the first compound and 5.26M for a rebalance). Hedera charged the gas used, not the limit.
9. **Position mints cannot be simulated.** `eth_call`/`eth_estimateGas` return `INVALID_NFT_ID` for any SaucerSwap
   V2 position mint (first `compound`, every `rebalance`), even when the real transaction succeeds. Send those with
   a fixed gas limit (8M) after read-only precondition checks; estimate everything else x 1.3.
10. **Deployment records.** `deployments/` is git-ignored. After any deploy, `generateTsAbis` rewrites
    `packages/nextjs/contracts/deployedContracts.ts` from every local record, so it contains `TidepoolVault` and, once
    `hardhat:deploy:narrow` has run, `TidepoolVaultNarrow`. The frontend reads both vaults from it; commit it after a
    deploy. `externalContracts.ts` is empty; an entry there would override a generated one with the same name.
11. **Allowances and max supply.** HTS rejects an allowance above a finite-supply token's `maxSupply`
    (`AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY`); SAUCE is finite, WHBAR is not. The vault caps its standing allowances per
    token (`approvalCap0/1`, read with `getFungibleTokenInfo`) and `refreshApprovals()` restores them once spent.

## Frontend conventions

Scaffold hooks: `useScaffoldReadContract`, `useScaffoldWriteContract`, `useDeployedContractInfo`, `useTransactor`.
DaisyUI classes. `~~` import alias. `"use client"` on pages with hooks. Prefer `type` over `interface`.

- **Vault selector.** `utils/tidepool/vaults.ts` lists the Main Vault (`TidepoolVault`) and the Narrow Demo Vault
  (`TidepoolVaultNarrow`), both from the generated `deployedContracts.ts`; they share the `TidepoolVault` ABI.
  Never hand-edit `deployedContracts.ts`; redeploy (or add an entry to `externalContracts.ts` for a vault this
  project did not deploy) and list it in `vaults.ts`.
- **Simulation.** `deposit`/`withdraw` go through `useScaffoldWriteContract` with its default simulation.
  `compound`/`rebalance` use `disableSimulate: true` and a fixed `GAS.keeper` (8,000,000) because a SaucerSwap mint
  returns `INVALID_NFT_ID` in `eth_call`; `useKeeperStatus` performs the read-only precondition checks that gate the
  buttons. Do not disable simulation anywhere else.
- **Errors.** `utils/tidepool/errors.ts` maps the vault's custom errors to plain language; the template's
  `getParsedError.ts` and `useTransactor.tsx` call it, and wallet rejections show "Transaction cancelled".
- **Wallets.** The burner wallet is disabled (`enableBurnerWallet: false` in `scaffold.config.ts`).
````

### 11.2 `README.md`

Written; see the repository root. Its sections: what Tidepool is, why, what it does, architecture, Hedera-specific
integration, why it is a useful template, setup, environment variables, local development, testnet deployment,
using the vault (deposit, compound, withdraw), the optional narrow-vault rebalance demo with the shared-pool warning,
live testnet evidence, known limitations, licence. The original outline was:


1. **Tidepool in one paragraph** + screenshot + testnet HashScan links (vault, share token, first compound).
2. **60-second path:** `npm create scaffold-hbar@latest --template <you>/tidepool` → `npm run next:dev` → open the live vault.
3. **What you learn:** owning a SaucerSwap V2 position from a contract; HTS share tokens from a contract; TWAP guards; HBAR fee handling.
4. **Architecture** (section 3 diagram) and the state machine.
5. **Range maths in plain words** (section 4) with the WHBAR/SAUCE example (tick −7665 ≈ 46.5 SAUCE/HBAR on testnet).
6. **When does compounding pay?** Fee ≈ $0.05 + gas vs collected fees.
7. **Hedera gotchas** (section 6), each with its reproduction command.
8. **Deploy your own vault** (section 10) and **adapt it** (change `tidepool.config.ts`: pool, width, windows).
9. **Keepers:** calling `compound()`/`rebalance()` from a cron job; costs; why it is safe to let anyone call.
10. **Security notes and limitations** (section 5.6); "not audited".
11. **Prior art & credits**; licence.

---

## 12. Extensions (README only, not built)

Single-sided zap deposits · LARI reward claiming · burning empty NFTs after rebalance (needs NFT approval to the manager) ·
HSS-scheduled compounding (HIP-1215) · multiple strategies (asymmetric ranges, volatility-based width) · performance fee ·
mainnet deployment (addresses in section 2.4).

---

## 13. Testnet evidence log [CHAIN]

Vaults deployed 26 Sep 2026 from one ECDSA deployer account, 0.0.10694876, through the Hashio JSON-RPC relay (so the
mirror node's transaction IDs carry the relay's operator account as payer). Pool: WHBAR/SAUCE 0.30%, 0.0.2661057.
"Fee" is the network fee charged (`charged_tx_fee`); every compound and rebalance also forwards SaucerSwap's position
fee, 0.64079562 HBAR (exactly `tinycentsToTinybars(fee) + 1`), and the vault refunds the 1 HBAR headroom sent with it.

**Main vault** `TidepoolVault`: 0.0.10743961 / `0x3BfC02f414956E66fB3B722fC935500B946ac181`; share token
0.0.10743964; LP NFT 0.0.1310436 #392. Standing allowances read on chain: WHBAR `approvalCap0` = `type(int64).max`,
SAUCE `approvalCap1` = 1,000,000,000,000,000 (its max supply).

| Step | Tx hash | Result | Gas used / limit | Fee (HBAR) | Notes |
|---|---|---|---|---|---|
| Deploy | `0x8f967dc59eda3dc7f01d00389376644a5327186a13b1c1f676c1820823fcf388` | SUCCESS | 4,860,874 / 6,000,000 | 5.29835266 | |
| `initialize` | `0x9c08525dfeaf083807dcffe31a8c44699ccfc7a8d8322af92eaab1efe7acead0` | SUCCESS | 5,236,012 / 8,000,000 | 20.97734774 | three associations, share token, two token-info lookups, four standing approvals; the fee includes the 15.27009466 HBAR HTS token-creation fee; 14.72990534 of the 30 HBAR sent refunded |
| `deposit` | `0xd799426f2162a34100648cfb0c2a317caac457258a4b80902ba6994fe4227eb1` | SUCCESS | 203,341 / 286,078 | 0.22164169 | 161.42039494 WHBAR + 922.334593 SAUCE in; 99.999 shares out, 0.001 dead shares kept by the vault |
| `compound` (first position) | `0x236d65455eec356fe3d726b04a4c91b829341433ddeb07946e089787292a1741` | SUCCESS | 894,762 / 8,000,000 | 0.97529058 | TWAP tick −7702 → range [−8340, −7140); NFT #392 minted to the vault |
| 3 swaps (simulate traders) | `0x823cf98821ce66a7befecad7ae13a9ab33c5662fa87ef2273bf2a8320b9e6dae`, `0x530100cd7e77c59234adee575e8714e4af1a1777aba214839606e966cffc31b1`, `0xc9436787d51aef1b7c4f4e28fc97019ee81f4876e4fad47bd6ce053a97e340c9` | SUCCESS | 142,218 each | 0.15501762 each | 228.45 SAUCE → 4.97 WHBAR each; spot −7802, inside the range |
| `compound` (fee-bearing) | `0x76c3114520d0693e07ae4f3b53128d89d9a0ef672e9aec153b8291fbc7e1a9ca` | SUCCESS | **563,157** / 8,000,000 | **0.61384113** | `FeesCollected(466241, 213024)`; `increaseLiquidity` on #392 +24,510,816,970 liquidity; no approvals made |
| `deposit`, sent from the dashboard by a second account (0.0.10726940) | `0xbcfc48e9cee0edcb1610f430ce150e85152c9677f5a77811375cbc4bf18fd82f` | SUCCESS | 276,846 / 1,500,000 | 0.30176214 | `FeesCollected(4296019, 2061845)`; 0.99988942 WHBAR + 38.245393 SAUCE in; 1.00966568 shares out |
| `withdraw`, sent from the dashboard by the same account | `0xb8132ee09d555da31bab3a66daf33e305269eda8b808a6e2b2de8b78cee6f7b4` | SUCCESS | 344,239 / 2,000,000 | 0.37522051 | 0.001 shares burned; 0.0009903 WHBAR + 0.037879 SAUCE out |

**Narrow demo vault** `TidepoolVaultNarrow`: 0.0.10744069 / `0x7bBfa539173e44aA41aFe7aB9D9Dd52edd42D244`; share token
0.0.10744072; ±60 ticks, 600 s cooldown, same pool. Same allowance caps as the main vault.

| Step | Tx hash | Result | Gas used / limit | Fee (HBAR) | Notes |
|---|---|---|---|---|---|
| Deploy | `0x08afb1da0897542130f7198e7aea5a106bbe8a5568c3f427575b8917517edb25` | SUCCESS | 4,860,862 / 6,000,000 | 5.29833958 | |
| `initialize` | `0x3002ec2f444978a5a16acb06f709ed316f6896d02d94a173c85d10c496570e5d` | SUCCESS | 5,235,952 / 8,000,000 | 20.97728234 | as for the main vault |
| `deposit` | `0xb3f503427dfb9c97a34cd9e092fc0458c3094c82e14922fc669d16cee7af8875` | SUCCESS | 204,442 / 286,781 | 0.22284178 | exactly 2 WHBAR + 93 SAUCE; 99.999 shares out |
| `compound` (first position) | `0x1063c0d56c7fc4463a0e09228d9f81d9035144162b83780817b9ff272bef61d3` | SUCCESS | 942,891 / 8,000,000 | 1.02775119 | TWAP tick −7793 → range [−7860, −7740); NFT #393 |
| Move price down (swap) | `0xd3afb662d0c7d96af20fa625d337f715cfb2d61b7116960fa70feff31017c658` | SUCCESS | 202,809 | 0.22106181 | 120 WHBAR → 5,459.99313 SAUCE; spot −7793 → −7899 |
| **`rebalance`** | **`0xf55864c1fc7bdd54ae9597ecae2f8f70e534c0af4c0c7fb14da31065ceda0654`** | SUCCESS | **982,492** / 8,000,000 | **1.07091628** | TWAP tick −7899 → range [−7980, −7860); NFT #393 → #394; #393 liquidity 0, #394 liquidity 42,713,465,962 (read after); both NFTs held by the vault; `FeesCollected(571340, 0)` |
| Restore price (swap back) | `0xac066a24749c6d70f9f278d2de2cf80a3c31d38cbf530f22aa551ef1a9d35a06` | SUCCESS | 203,646 | 0.22197414 | 5,459 SAUCE → 119.29406227 WHBAR; spot −7902 → −7794 |

**Gas and cost findings:**
- Standing approvals removed the dominant cost. Compound into an existing position: 563,157 gas / 0.61 HBAR, against
  4,802,810 gas with six per-call approvals in the previous version. First compound: 894,762 gas (previously
  5,128,563; network fee 0.98 HBAR, previously 5.59 HBAR). Rebalance: 982,492 gas (previously 5,257,516).
- Each HTS allowance approval made by the vault costs 705,424 gas (measured on the previous version). `initialize`'s
  5,236,012 gas is 2,313,512 for the associations and token creation (as before) + 4 × 705,424 for the approvals +
  a 100,804 remainder, which includes the two `getFungibleTokenInfo` lookups (derived by subtraction).
- Hedera charged gas used, not the limit: 563,157 gas × 109 tinybars = 0.61384113 HBAR, the fee charged.
- An EOA's HTS association is estimated at ~782k gas, an EOA approval at ~783k, and a WhbarHelper wrap at ~839k (before
  association) [CHAIN, previous version].
- Compound and rebalance total cost on testnet, with the position fee: about 1.25 HBAR (compound) and 1.71 HBAR
  (rebalance).

**Incidents:**
- **`initialize` out of gas (previous main vault 0.0.10710646, 25 Sep 2026).** Tx
  `0xe13de31bfe04fd42421963d1703ec7b30d26ed9edf5b84f86647d361b51053cc`: REVERT `HtsCallFailed(21)`, 1,969,541 / 2,000,000
  gas; child `TOKENASSOCIATE` = `INSUFFICIENT_GAS`; atomic, no state change; 2.148 HBAR fee (landmine 16).
- **`initialize` rejected by SAUCE's max supply (vault `0x2a0BB90055Fa38A913C137D5f920b01417cb2d6C`, 26 Sep 2026).**
  Tx `0x9e32377405a59e025ba270bba0012298a339aa52078724c9d3504458f6e6513c`: 5,136,540 / 8,000,000 gas. Child records:
  TOKENASSOCIATE, TOKENCREATION and the WHBAR approval `REVERTED_SUCCESS`; the SAUCE approval to the position manager
  `AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY` (289), then `forceApprove`'s reset to 0 and its retry, again 289. SAUCE (0.0.1183558)
  is FINITE with maxSupply 1e15; WHBAR (0.0.15058) is INFINITE. That vault was left uninitialized; the current contract
  caps allowances per token and the deploy scripts preflight `initialize()` (landmine 17).
- **Simulation limit.** `eth_call` and `eth_estimateGas` return `INVALID_NFT_ID` for any SaucerSwap V2 position mint
  (the HTS NFT mint followed by `transferFrom` of the new serial), including mints that succeeded on-chain. Replaying
  real mint `0x4cf676eda79bc22cc6b21199c1d55bfed5bd9783e3003664c0fb3e8fec0466f7` reproduced it. So `compound()` (first
  position) and `rebalance()` cannot be pre-checked; send them with a fixed gas limit (`scripts/tidepoolCompound.ts`).

The previous vaults (main 0.0.10710646, narrow 0.0.10716411, six approvals per compound/rebalance) are still on
testnet; their full log is in this file's git history (commit `49c4b6d`, section 13).

## 14. Sources

- Bounty brief: https://hedera.com/blog/scaffold-hbar-template-bounty/
- Scaffold-HBAR docs: https://docs.hedera.com/solutions/tools/scaffold-hbar · CLI: https://github.com/hedera-dev/create-scaffold-hbar · templates: https://github.com/hedera-dev/scaffold-hbar (branch `templates/blank-template`)
- SaucerSwap developer docs (index https://docs.saucerswap.finance/llms.txt): contracts, V2 new position, increase, decrease, claiming fees, liquidity position fee, WHBAR overview and WhbarHelper wrap/unwrap
- SaucerSwap V2 source: https://github.com/saucerswaplabs/saucerswaplabs-v2-periphery (GPL-2.0), https://github.com/saucerswaplabs/saucerswaplabs-v2-core (BUSL-1.1)
- Hiero contracts: https://github.com/hiero-ledger/hiero-contracts (npm `@hiero-ledger/hiero-contracts@0.2.0`)
- Uniswap v4-core: https://github.com/Uniswap/v4-core (per-file SPDX; the libraries used are MIT)
- Hedera docs: HBAR units https://docs.hedera.com/hedera/sdks-and-apis/sdks/hbars · fees https://docs.hedera.com/hedera/networks/mainnet/fees · HIP-719, HIP-904
- Sourcify APIv2: https://sourcify.dev/server/api-docs/
- Hedera Forking: https://github.com/hashgraph/hedera-forking (`@hashgraph/system-contracts-forking`)
