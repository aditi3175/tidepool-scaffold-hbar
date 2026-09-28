# Quickstart

This page gets a Tidepool project running on your machine against the live testnet vault in a few minutes.

## Prerequisites

- Node.js 20.18.3 or later.
- Git with `user.name` and `user.email` set.
- A wallet that can connect to Hedera Testnet (chain 296), such as MetaMask.

## Create the project

```bash
npm create scaffold-hbar@latest -- --template aditi3175/tidepool-scaffold-hbar
cd <your-project>
npm run next:dev
```

The CLI will ask for the Hedera network (choose testnet) and whether to install Hedera Skills (optional).

Open http://localhost:3000/dashboard, connect a wallet on Hedera Testnet (chain 296), and you're looking at the live reference vault.

The commands in these docs use npm, the template's default. If you scaffolded with Yarn, drop the `run` (`yarn hardhat:test`). Pass extra flags to npm scripts after `--`, because npm swallows flags like `--network` otherwise.

## What a fresh scaffold gives you

- **A dashboard wired to the reference vaults.** `packages/nextjs/contracts/deployedContracts.ts` is committed, so the frontend reads the main vault (and the narrow demo vault) deployed by the template author. You can deposit, withdraw, and compound against them straight away.
- **Unit tests that run offline.** `npm run hardhat:test` uses mocks for SaucerSwap, HTS (`0x167`), and the exchange-rate system contract (`0x168`). No network or keys needed.
- **Operator scripts that target your own deployment.** `hardhat-deploy` records (`packages/hardhat/deployments/`) are gitignored, so `hardhat:smoke`, `hardhat:compound`, `hardhat:withdraw` and friends only work after you deploy your own vault. See [Adapt it to your pool](adapt-it.md).

There is no local-chain flow. The vault calls live SaucerSwap V2 contracts, so it only makes sense on testnet (or mainnet).

## Run the checks

```bash
npm run hardhat:test               # unit tests, offline
npm run lint
npm run next:check-types
npm run next:build
```

Stop the dev server before `npm run next:build`: both use `packages/nextjs/.next/`.

## Get testnet funds

Testnet HBAR comes from the Hedera faucet at https://portal.hedera.com/faucet. To deposit you also need WHBAR (the dashboard wraps HBAR for you) and SAUCE (swap for it on https://testnet.saucerswap.finance). [Using the vault](using-the-vault.md) walks through each step.

## Project map

```text
packages/hardhat/
  contracts/tidepool/TidepoolVault.sol       the vault
  contracts/tidepool/libraries/RangeMath.sol TWAP, range placement, swap-to-ratio (MIT v4-core maths only)
  contracts/tidepool/interfaces/             the SaucerSwap V2 surface the vault calls
  contracts/tidepool/test/Mocks.sol          test doubles, never deployed
  tidepool.config.ts                         pool, router, manager and vault parameters per network
  deploy/                                    main vault and optional narrow demo vault
  scripts/                                   smoke, compound, withdraw, rebalance, move-price, verify
  test/TidepoolVault.test.ts                 unit tests
packages/nextjs/
  app/page.tsx                               landing page
  app/dashboard/page.tsx                     dashboard
  app/how-it-works/, app/docs/, app/debug/   How it works, docs, contract debugger
  app/_components/tidepool/                  dashboard components (the Gauge is shared by every page)
  content/docs/                              docs pages, in Markdown
  hooks/tidepool/                            vault reads, HTS association, keeper preconditions, activity
  utils/tidepool/                            constants, errors, maths, vault list
```
