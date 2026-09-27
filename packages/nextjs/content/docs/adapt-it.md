# Adapt it to your pool

This page shows how to deploy your own vault on Hedera testnet and how to point it at a different pool or range.

## Deploy your own vault

```bash
npm run hardhat:account:generate   # or hardhat:account:import with an existing ECDSA key
npm run hardhat:account            # shows the address to fund
```

Fund the account with about 100 testnet HBAR from https://portal.hedera.com/faucet, then:

```bash
npm run hardhat:deploy:testnet     # deploy + initialize
npm run hardhat:smoke              # wrap HBAR, buy SAUCE, deposit, open the first position; prints HashScan links
npm run hardhat:verify:sourcify    # verify on Sourcify so HashScan shows the source
```

`initialize()` sends 30 HBAR. About 15.3 HBAR pays the HTS token-creation fee and the rest is refunded. Deploying regenerates `deployedContracts.ts`, so the dashboard switches to your vault. The deploy scripts run `initialize()` as an `eth_call` first and stop, printing the reason, if it would revert.

Other scripts:

```bash
npm run hardhat:compound                     # compound fees into the position
WITHDRAW_BPS=1000 npm run hardhat:withdraw   # withdraw 10% of your shares
npm run hardhat:simulate-traders             # swap back and forth so the position earns fees
```

To deploy to a named network directly, pass the flag after `--`: `npm run hardhat:deploy -- --network hederaTestnet`.

## Vault parameters

Every vault parameter is a constructor argument in `packages/hardhat/tidepool.config.ts`. They're immutable, so changing one means deploying a new vault.

| Parameter | Reference value | Rules |
|---|---|---|
| `pool` | WHBAR/SAUCE 0.30% | Must be a SaucerSwap V2 pool. The constructor checks it against the factory. |
| `halfWidth` | 600 ticks (≈ ±6.2%) | Positive multiple of the pool's tick spacing: fee 500 → 10, 1500 → 30, 3000 → 60, 10000 → 200. |
| `twapWindow` | 600 s | The pool needs at least this much observation history. |
| `maxTwapDeviation` | 50 ticks (≈ 0.5%) | Tighter is safer but refuses more often in volatile pools. |
| `rebalanceCooldown` | 3600 s | Minimum gap between rebalances. |
| `swapSlippageBps` | 100 (1%) | Extra slippage on the swap-to-ratio step, on top of the pool fee. Applies to compound and rebalance. |

The narrow demo vault uses the same pool, manager and router with `halfWidth` 60 and `rebalanceCooldown` 600 s (`TIDEPOOL_NARROW` in the same file). It deploys only through `npm run hardhat:deploy:narrow`.

## Point Tidepool at a different pool

1. Check the pool's oracle. Call `slot0()` on the pool and look at `observationCardinality`. If it's 1, `observe()` reverts after any swap and the vault will refuse to act. Anyone can fix that by calling `increaseObservationCardinalityNext(n)` on the pool, then waiting for history to build up past `twapWindow`.
2. Set `pool` and a valid `halfWidth` in `tidepool.config.ts`.
3. Deploy with `npm run hardhat:deploy:testnet`.

For mainnet, add a `hederaMainnet` entry. SaucerSwap mainnet addresses are listed in `docs/ARCHITECTURE.md` §2.4 but haven't been tested with this template.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY_ENCRYPTED` | `packages/hardhat/.env` | Written by `hardhat:account:generate` / `import`. Encrypted, decrypted with your password at run time. Never commit `.env`. |
| `HEDERA_RPC_URL` | Hardhat | Optional RPC override. Default `https://testnet.hashio.io/api`. |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, `NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL`, `NEXT_PUBLIC_MIRROR_NODE_URL` | frontend | Optional overrides. |

Script options:

| Variable | Script | Purpose |
|---|---|---|
| `TIDEPOOL_VAULT` | deposit, compound, withdraw, move-price, rebalance | Deployment to target. Defaults to `TidepoolVault`, except deposit and rebalance, which require it. |
| `DEPOSIT0`, `DEPOSIT1` | deposit | Exact token amounts. |
| `WITHDRAW_BPS` | withdraw | Share of your balance in basis points. Default 1000. |
| `DIRECTION`, `AMOUNT`, `WRAP_HBAR_IF_NEEDED` | move-price | `down` sells token0, `up` sells token1. |
| `ALLOW_MAIN_VAULT_REBALANCE` | rebalance | Must be `true` to target the main vault. |
| `WRAP_HBAR`, `BUY_HBAR` | smoke | HBAR to wrap and to spend on SAUCE. Default 20 each. |
| `ROUNDS`, `AMOUNT_HBAR` | simulate-traders | Round trips and HBAR per trip. Default 3 and 5. |

In PowerShell, set a variable first with `$env:NAME="value"`, then run the command.

## Extensions

Natural extensions: a keeper (a cron job that calls `compound()` only when collected fees exceed the cost, and `rebalance()` when `getPriceState()` reports out of range), other range strategies, burning emptied position NFTs, or single-sided deposits.
