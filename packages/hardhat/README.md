# Hardhat package — Tidepool contracts and testnet scripts

Contracts, deploy scripts, unit tests and testnet operator scripts for the Tidepool vault.
See the [root README](../../README.md) for the full walkthrough and [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for the design.

Run the `hardhat:*` scripts from the repo root (inside this package, drop the `hardhat:` prefix).

## Unit tests (no network)

```bash
yarn hardhat:compile
yarn hardhat:test
```

Tests run on the in-process Hardhat chain against mocks (`contracts/tidepool/test/Mocks.sol`). `MockHts` and
`MockExchangeRate` are etched at the HTS (`0x167`) and exchange-rate (`0x168`) system-contract addresses.
Forking is opt-in (`HEDERA_FORKING=true`); the tests do not need it.

## Testnet

Tidepool manages a live SaucerSwap V2 position, so every live script targets `hederaTestnet`.

1. Create or import the deployer key (stored encrypted in `packages/hardhat/.env`, which is git-ignored):
   ```bash
   yarn hardhat:account:generate    # or: yarn hardhat:account:import
   yarn hardhat:account             # address and balances
   ```
2. Fund it from the [Hedera Portal faucet](https://portal.hedera.com/faucet).
3. Deploy and initialize the main vault:
   ```bash
   yarn hardhat:deploy:testnet
   ```
4. Operate it:
   ```bash
   yarn hardhat:smoke              # associate, wrap, buy SAUCE, deposit, open the position
   yarn hardhat:simulate-traders   # swap back and forth so the position earns fees
   yarn hardhat:compound           # collect fees and add them to the position
   yarn hardhat:withdraw           # partial withdraw (WITHDRAW_BPS, default 1000 = 10%)
   ```
5. Verify the source on Sourcify (HashScan reads it):
   ```bash
   yarn hardhat:verify:sourcify    # CONTRACT=TidepoolVault by default
   ```

With npm instead of Yarn, pass extra flags after `--` (for example `npm run hardhat:deploy -- --network hederaTestnet`).

## Layout

- `contracts/tidepool/` — `TidepoolVault.sol`, `libraries/RangeMath.sol`, `interfaces/ISaucerSwapV2.sol`, `test/Mocks.sol`
- `deploy/` — `00_deploy_tidepool_vault.ts` (main vault) and `01_deploy_tidepool_vault_narrow.ts` (rebalance demo, opt-in)
- `scripts/` — account management, `generateTsAbis.ts`, and the `tidepool*.ts` operator scripts
- `tidepool.config.ts` — pool, position manager, router and vault parameters per network
- `test/TidepoolVault.test.ts` — unit tests

`deployments/` holds the hardhat-deploy records and is git-ignored; after each deploy, `generateTsAbis` rewrites
`packages/nextjs/contracts/deployedContracts.ts` from those records.
