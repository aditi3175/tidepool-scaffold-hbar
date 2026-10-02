# Quickstart

This page takes you from nothing to the live testnet vault running on your machine, then to a vault of your own.

## Before you start

- Node.js 20.18.3 or later. The template requires it.
- Git, with `user.name` and `user.email` set. The CLI checks both and stops if either is missing.
- A wallet that can connect to Hedera Testnet (chain 296), such as MetaMask.

## Scaffold it

```bash
npm create scaffold-hbar@latest "--" --template aditi3175/tidepool-scaffold-hbar
```

> Keep the quotes around `--`: npm 7+ swallows `--template` without the `--`, and Windows PowerShell strips a bare
> `--`. Or use: `npx create-scaffold-hbar@latest --template aditi3175/tidepool-scaffold-hbar`

The CLI asks for a project name, the Hedera network (choose testnet), whether to install Hedera Skills (optional), and a package manager (npm is the default).

> **If GitHub is slow or rate-limits you, pin the framework.** The CLI reads this template's `template.json` through the GitHub API. If that request fails, it quietly falls back to its own defaults, which offer Foundry first; choosing it deletes `packages/hardhat`, where the vault lives. Passing the choices yourself makes the request irrelevant (in PowerShell, write it on one line without the `\`):
>
> ```bash
> npm create scaffold-hbar@latest "--" --template aditi3175/tidepool-scaffold-hbar \
>   -s hardhat -f nextjs-app --package-manager npm
> ```

## See the live vault

```bash
cd <your-project>
npm run next:dev
```

Open http://localhost:3000. `packages/nextjs/contracts/deployedContracts.ts` is committed, so the dashboard already reads the reference vaults on Hedera testnet (the main vault and the narrow demo vault). Connect a wallet on Hedera Testnet and you can deposit, withdraw and compound against them straight away.

The commands in these docs use npm, the template's default. If you scaffolded with Yarn, drop the `run` (`yarn next:dev`). With npm, pass extra flags after `--`, because npm swallows flags like `--network` otherwise.

## Run the checks

```bash
npm run hardhat:test               # 27 unit tests, offline
npm run lint
npm run next:check-types
npm run next:build
```

The unit tests use mocks for SaucerSwap, HTS (`0x167`) and the exchange-rate system contract (`0x168`), so they need no network and no keys. Stop the dev server before `npm run next:build`: both use `packages/nextjs/.next/`.

## Get testnet funds

Testnet HBAR comes from the Hedera faucet at https://portal.hedera.com/faucet. To deposit you also need WHBAR (the dashboard wraps HBAR for you) and SAUCE (swap for it on https://testnet.saucerswap.finance). [Using the vault](using-the-vault.md) walks through each step.

## Deploy your own vault

The operator scripts target your own deployment: `hardhat-deploy` records (`packages/hardhat/deployments/`) are gitignored, so `hardhat:smoke`, `hardhat:compound` and the rest only work once you have deployed. Fund the deployer with about 100 testnet HBAR, then:

```bash
npm run hardhat:account:generate   # encrypted deployer key in packages/hardhat/.env
npm run hardhat:deploy:testnet     # deploy and initialize
npm run hardhat:smoke              # wrap HBAR, buy SAUCE, deposit, open the first position
```

Deploying regenerates `deployedContracts.ts`, so the dashboard switches to your vault. [Adapt it to your pool](adapt-it.md) covers each step, every parameter and every script.

There is no local-chain flow. The vault calls live SaucerSwap V2 contracts, so it only makes sense on testnet (or mainnet).

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
  app/_components/tidepool/                  dashboard components (cards, range chart, keeper panel)
  components/pulse/                          shared UI: tiles, labels, the TWAP dial, the range flow chart
  content/docs/                              docs pages, in Markdown
  hooks/tidepool/                            vault reads, HTS association, keeper preconditions, activity
  utils/tidepool/                            constants, errors, maths, vault list
```
