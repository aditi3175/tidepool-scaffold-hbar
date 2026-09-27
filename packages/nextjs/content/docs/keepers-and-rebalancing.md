# Keepers & rebalancing

This page covers `compound()` and `rebalance()`: who can call them, what they check, what they cost, and how to run them from the dashboard or a script.

## Anyone can call them

`compound()` and `rebalance()` are permissionless. The caller pays SaucerSwap's HBAR position fee through `msg.value` and the gas; the vault forwards exactly the fee and refunds the rest. Neither call changes anybody's share balance. No keeper is included: they run only when someone calls them.

That is safe because the contract checks every precondition itself. The worst a hostile caller can do is pay SaucerSwap's fee for the vault.

## compound()

Collects fees, swaps idle balances to the range's token ratio, and adds everything to the position. The first call mints the position, centred on the TWAP tick.

It refuses when:

- spot is more than `maxTwapDeviation` ticks from the TWAP (`PriceDeviation`);
- the pool can't answer for `twapWindow` (`TwapUnavailable`);
- the TWAP tick has left the range (`OutOfRange`) — call `rebalance()` instead;
- there is nothing to add (`NothingToCompound`);
- `msg.value` doesn't cover the position fee (`InsufficientFee`).

## rebalance()

Removes all liquidity, re-centres a fixed-width range on the TWAP tick, swaps to the right ratio, and mints a new position NFT. The old NFT stays in the vault with zero liquidity.

It only succeeds when:

- a position exists (`NoPosition` otherwise);
- the cooldown has passed (`CooldownActive`);
- spot is within `maxTwapDeviation` of the TWAP (`PriceDeviation`);
- the TWAP tick is outside `[tickLower, tickUpper)` (`StillInRange` otherwise).

## On the dashboard

The keeper card shows Compound and Rebalance side by side. Each shows **Ready** or **Blocked** with the first failing condition, the fee and gas limit, and a **Conditions** list with every check the contract makes, read from the chain before you pay.

The Narrow demo vault (±60 ticks, 600-second cooldown) is often out of range. When its Rebalance shows Ready, anyone can press it and watch a live re-centre on the gauge.

## What it costs

Each compound or rebalance costs SaucerSwap's position fee (5 US cents in HBAR, ≈ 0.64 HBAR at the testnet rate) plus gas. Measured on testnet:

| Call | Gas | Network fee | With the position fee |
|---|---|---|---|
| Compound into an existing position | 563,157 | 0.61 HBAR | ≈ 1.25 HBAR |
| First compound (opens the position) | 894,762 | 0.98 HBAR | ≈ 1.62 HBAR |
| Rebalance | 982,492 | 1.07 HBAR | ≈ 1.71 HBAR |

Compound when the fees you'd collect are worth more than that. On a small vault, compounding often loses money, so a keeper should check `positions()` fees before calling.

Both calls are sent with a fixed 8,000,000 gas limit and no simulation: `eth_call` and `eth_estimateGas` return `INVALID_NFT_ID` for SaucerSwap V2 position mints that succeed on chain. Hedera charges the gas used, not the limit.

## From a script

```bash
npm run hardhat:compound                     # compound fees into the position
npm run hardhat:simulate-traders             # swap back and forth so the position earns fees
```

`TIDEPOOL_VAULT` picks the deployment (default `TidepoolVault`). The scripts target your own deployment; see [Adapt it to your pool](adapt-it.md).

## Rebalance demo on the narrow vault

A rebalance needs the TWAP to leave the range, which would take hundreds of HBAR of swaps on the main vault's ±600-tick range. So the template includes a separate demo vault with ±60 ticks and a 600-second cooldown. The main vault is never touched.

> This moves the price of the *shared* SaucerSwap WHBAR/SAUCE testnet pool for everyone, including the main vault's position. Keep the move small and swap back afterwards.

```bash
npm run hardhat:deploy:narrow
TIDEPOOL_VAULT=TidepoolVaultNarrow DEPOSIT0=2 DEPOSIT1=93 npm run hardhat:deposit
TIDEPOOL_VAULT=TidepoolVaultNarrow npm run hardhat:compound
TIDEPOOL_VAULT=TidepoolVaultNarrow DIRECTION=down AMOUNT=120 WRAP_HBAR_IF_NEEDED=true npm run hardhat:move-price
# wait ~7–10 minutes until the TWAP has left the range and is within 50 ticks of spot
TIDEPOOL_VAULT=TidepoolVaultNarrow npm run hardhat:rebalance
TIDEPOOL_VAULT=TidepoolVaultNarrow DIRECTION=up AMOUNT=<SAUCE received> npm run hardhat:move-price
```

In PowerShell, set each variable first with `$env:NAME="value"`, then run the command.

The scripts are defensive. `move-price` quotes the resulting tick and asks for confirmation before swapping, and only wraps HBAR with `WRAP_HBAR_IF_NEEDED=true` plus a second confirmation. `rebalance` has no default vault, refuses the main vault unless `ALLOW_MAIN_VAULT_REBALANCE=true`, runs every precondition read-only before sending, and verifies the new NFT and range afterwards. `AMOUNT=120` matched the pool at the time of our test, so re-quote before using it.

## Standing allowances and refreshApprovals()

The vault gives the SaucerSwap position manager and swap router standing allowances, set once in `initialize()`, so compound and rebalance make no approvals. Each allowance is capped at the token's max supply (finite-supply tokens such as SAUCE) or `type(int64).max`. They shrink as the manager and router spend them and are not topped up automatically. Once one runs low, compound and rebalance revert until someone calls `refreshApprovals()`, which is permissionless and only re-grants the same fixed allowances.

## Writing your own keeper

A natural extension is a cron job that calls `compound()` only when collected fees exceed the cost, and `rebalance()` when `getPriceState()` reports out of range. Call `quoteMintFee()` with `eth_call` for the fee (it isn't `view`), send fee plus some headroom as `value`, and use a fixed gas limit.
