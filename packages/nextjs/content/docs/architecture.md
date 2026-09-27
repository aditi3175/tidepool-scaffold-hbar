# Architecture

This page summarises how the vault is built: its contracts, parameters, function flows, invariants and threat model. The full specification is `docs/ARCHITECTURE.md` in the repository.

## Components

```text
                           ┌──────────────────────────────────────────────┐
  Browser (Next.js)        │  Hedera testnet                              │
 ┌──────────────────┐      │                                              │
 │ Dashboard        │ JSON-RPC (hashio)                                   │
 │  Gauge           │─────►│  TidepoolVault ──────────┐                   │
 │  Deposit/Withdraw│      │   │ HTS 0x167: create/mint/burn share token  │
 │  Keeper          │      │   │           associate token0/1 + LP NFT    │
 │  Activity        │      │   │ 0x168: tinycents → tinybars              │
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

| File | Role |
|---|---|
| `contracts/tidepool/TidepoolVault.sol` | The vault |
| `contracts/tidepool/libraries/RangeMath.sol` | TWAP consult, range snapping, liquidity amounts, swap-to-ratio |
| `contracts/tidepool/interfaces/ISaucerSwapV2.sol` | Minimal factory / pool / manager / router interfaces |
| `contracts/tidepool/test/Mocks.sol` | Test doubles (never deployed live) |

Dependencies: OpenZeppelin 5.6.1, `@uniswap/v4-core@1.0.2` (`FullMath`, `TickMath`, `SqrtPriceMath`: all MIT), `@hiero-ledger/hiero-contracts@0.2.0` (`HederaTokenService`, `IHederaTokenService`, `HederaResponseCodes`, `IExchangeRate`).

## Trust model

- **Immutable vault.** All parameters are constructor immutables. There is no owner, no pause, no fee switch.
- **Deployer power:** only `initialize()` (once). It cannot touch funds.
- **Price trust:** the vault trusts the pool's `slot0` and `observe`. The constructor verifies that the pool is the factory's canonical pool for its tokens and fee, and that the router uses the same factory.
- **Keepers are untrusted.** They can only trigger actions whose preconditions the contract checks (TWAP deviation, out-of-range, cooldown). The worst a hostile keeper can do is pay SaucerSwap's fee for us.

## Parameters

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

Constants: `SHARE_DECIMALS = 8`, `INITIAL_SHARES = 1e10` (100.00000000 shares), `DEAD_SHARES = 1e5`, share token auto-renew period 7 776 000 s (90 days).

## Function flows

**`initialize(name, symbol)`** — deployer only, once. Associates the vault with token0, token1 and the LP NFT through `0x167`; creates the HTS share token (treasury and supply key = the vault, 8 decimals); reads each token's supply type with `getFungibleTokenInfo` and grants the position manager and swap router a standing allowance per token, capped at `maxSupply` for finite-supply tokens and `type(int64).max` otherwise; refunds leftover HBAR. On testnet it used 5,236,012 gas; the token creation kept 15.27009466 HBAR of the 30 sent.

**`deposit(amount0Max, amount1Max, minShares, receiver)`** — requires spot within `maxTwapDeviation` of the TWAP and collects fees first. The first deposit takes both amounts, mints `INITIAL_SHARES` and gives the depositor `INITIAL_SHARES − DEAD_SHARES`; the dead shares stay in the vault forever. Later deposits are priced pro rata against the position principal at spot plus idle balances. No HBAR fee: deposits wait idle until the next `compound()`.

**`withdraw(shares, amount0Min, amount1Min, receiver)`** — collects fees, then returns `shares / totalShares` of the idle balances and of the position's liquidity, burns the shares, and checks the minimums. **No TWAP check**, so users can always exit.

**`compound()`** — checks the TWAP guard and collects fees. With no position yet, it reverts `NothingToCompound` if both idle balances are 0, otherwise it opens a range around the TWAP tick, swaps to ratio and mints. Otherwise it reverts `OutOfRange` if the TWAP tick is outside the range, then swaps idle to the range's ratio and calls `increaseLiquidity`. The fee, `tinycentsToTinybars(mintFee) + 1`, must be ≤ `msg.value`; exactly that is forwarded and the rest refunded.

**`rebalance()`** — requires a position, the cooldown elapsed, the TWAP guard, and the TWAP tick outside `[tickLower, tickUpper)`. Collects fees, removes all liquidity, re-centres on the TWAP tick, swaps to ratio (minimum out from the TWAP price minus fee and slippage), mints, and refunds surplus HBAR. The old NFT stays in the vault with zero liquidity.

**`refreshApprovals()`** — permissionless. Re-approves the manager and router up to `approvalCap0/1`. The spenders and caps are fixed, so it can only restore allowances that compound and rebalance spent down.

**Views:** `getTotalAmounts()` (principal at spot + idle; excludes uncollected fees), `getPriceState()` (spot, TWAP, in-range), `quoteMintFee()` (non-view because `IExchangeRate` is declared non-view; call it with `eth_call` / `simulateContract`).

## Range maths in brief

- **Tick.** Price = 1.0001^tick (token1 per token0, in raw units). Human price = 1.0001^tick × 10^(dec0 − dec1). Tick −7665 ≈ 46.5 SAUCE per HBAR on testnet.
- **Range convention.** A position is active when `tickLower ≤ tick < tickUpper`. Ticks must be multiples of `tickSpacing`.
- **TWAP tick.** Mean of `tickCumulative` over a window, `(c[now] − c[now−w]) / w`, rounded toward −∞.
- **Why compare spot to TWAP.** An attacker can move spot within one transaction, but not the TWAP. Acting only when |spot − TWAP| ≤ `maxTwapDeviation` stops sandwich-driven bad re-centres and deposits at manipulated prices.
- **Why exactly `tinycentsToTinybars(fee) + 1`.** If the vault sent more HBAR than the fee, the leftover would sit on the manager during the mint callback and the manager could wrap the caller's HBAR instead of pulling the vault's WHBAR. Sending exactly the fee leaves the manager's balance at zero, so it always pulls WHBAR.

## Invariants

1. `totalShares` equals the share token's HTS total supply.
2. `totalShares ≥ DEAD_SHARES` once anyone has deposited.
3. The vault holds no HBAR at rest (all fee HBAR is forwarded or refunded in the same call).
4. The vault's only token allowances are the standing allowances on token0 and token1 to the immutable `positionManager` and `swapRouter`, never above `approvalCap0/1`. They are granted in `initialize()` and re-granted, to the same caps, only by `refreshApprovals()`.
5. `tickLower`/`tickUpper` are multiples of `tickSpacing`, `tickLower < tickUpper`.

## Threat model

| Threat | Mitigation |
|---|---|
| Sandwich a rebalance or compound to force a bad range or swap | Spot-vs-TWAP guard; swap `amountOutMinimum` priced at TWAP; range centred on TWAP, not spot. |
| Deposit at a manipulated price | Spot-vs-TWAP guard on deposit; proportional deposits get a fair basket at any price. |
| First-depositor share inflation | Fixed 1e10 initial shares + 1e5 dead shares; a test shows a large donation leaves the victim at ~50%. |
| Fake pool/router | Constructor checks `factory.getPool` and `router.factory()`. |
| Reentrancy via callbacks | `nonReentrant` on all external state-changing functions. |
| Keeper griefing (calling repeatedly) | Caller pays the ≈ 0.64 HBAR fee each time; rebalance cooldown. |
| Oracle unavailable | `TwapUnavailable` → deposit/compound/rebalance stop; **withdraw still works**. |
| HBAR stuck | Exact-fee forwarding + refunds; `initialize` refunds leftovers. |
| Standing allowances to manager and router | Both addresses are immutable and checked against the SaucerSwap factory; allowances are capped per token and restored only by `refreshApprovals()`. |
| int64 overflow of shares | `SafeCast.toInt64` reverts. |
| Rounding | Deposits round amounts **up**, withdrawals round **down**, both in the vault's favour. |

## Testing

27 unit tests run offline on the in-process Hardhat chain, with `MockHts` at `0x167`, `MockExchangeRate` at `0x168`, and mock pool, manager and router doing real v4 liquidity maths (`npm run hardhat:test`). What mocks cannot prove — real HTS association, token creation and refunds, the NFT transfer to a contract, `0x168` from the vault, SaucerSwap's exact rounding — is covered by the live runs in [Testnet evidence](testnet-evidence.md).
