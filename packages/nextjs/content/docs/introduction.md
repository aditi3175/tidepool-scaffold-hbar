# Introduction

This page explains what Tidepool is, what the vault does on chain, and where to go next.

Tidepool is a Scaffold-HBAR template for a vault that owns one SaucerSwap V2 concentrated-liquidity position on Hedera. Depositors get a native HTS share token. Anyone can compound the position's fees, and anyone can re-centre its range once the pool's TWAP has left it.

Contracts are Hardhat, the dashboard is Next.js, and everything runs on Hedera testnet.

> Testnet reference code. Not audited, not production-ready, no yield implied. Testnet pool prices are set by testnet traders and do not track real markets.

## What the vault does

1. **Deposit.** You deposit both pool tokens in the vault's current ratio and receive HTS shares. Deposits sit idle until the next compound, so depositing costs no SaucerSwap fee.
2. **Compound.** `compound()` collects fees, swaps idle balances to the range's token ratio, and adds everything to the position. The first call mints the position, centred on the TWAP tick.
3. **Rebalance.** `rebalance()` only succeeds when the TWAP tick is outside the range, spot is within `maxTwapDeviation` of the TWAP, and the cooldown has passed. It removes all liquidity, re-centres a fixed-width range on the TWAP, and mints a new position NFT.
4. **Withdraw.** You get your share of the position and idle balances back, and your shares are burned. Withdrawals skip the TWAP check, so you can always exit.

## Who controls it

There's no owner, admin key, pause, fee switch, or upgrade path. The deployer can call `initialize()` once and nothing else. `compound()` and `rebalance()` are permissionless: the caller pays SaucerSwap's HBAR position fee and the vault refunds any surplus.

The spot-vs-TWAP check is what makes permissionless keeper calls safe. Someone can push spot around inside one transaction, but not the 600-second TWAP, so a sandwich attempt makes the call revert instead of forcing a bad range.

## How the pieces connect

```tidepool-overview
Depositors ── tokens ⇄ shares ──►┐
                                 ├─► TidepoolVault ── add / remove / collect ──► SaucerSwap V2 position
Anyone ── compound / rebalance ──►┘   (shares, TWAP guard,                         (WHBAR/SAUCE 0.30%,
                                       no owner)                                    ±600 ticks)
```

The call-by-call version, with every Hedera system contract, is in [Architecture](architecture.md).

## Where to go next

| If you want to | Read |
|---|---|
| Run the template locally | [Quickstart](quickstart.md) |
| Deposit and withdraw from the dashboard | [Using the vault](using-the-vault.md) |
| Compound, rebalance, or run a keeper | [Keepers & rebalancing](keepers-and-rebalancing.md) |
| Deploy your own vault or point it at another pool | [Adapt it to your pool](adapt-it.md) |
| Understand the contract design | [Architecture](architecture.md) |
| Avoid the Hedera-specific traps | [Hedera gotchas](hedera-gotchas.md) |
| Fix an error | [Troubleshooting](troubleshooting.md) |
| Check the on-chain proof | [Testnet evidence](testnet-evidence.md) |
