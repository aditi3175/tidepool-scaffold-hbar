# Tidepool

A Scaffold-HBAR template for a vault that owns one SaucerSwap V2 concentrated-liquidity position on Hedera. Depositors get a native HTS share token. Anyone can compound the position's fees, and anyone can re-centre its range once the pool's TWAP has left it.

Contracts are Hardhat, the dashboard is Next.js, and everything runs on Hedera testnet.

> Testnet reference code. Not audited, not production-ready, no yield implied. Testnet pool prices are set by testnet traders and do not track real markets.

## Quick start

Prerequisites: Node.js 20.18.3 or later, and Git with `user.name` and `user.email` set.

```bash
npm create scaffold-hbar@latest -- --template aditi3175/tidepool-scaffold-hbar
cd <your-project>
npm run next:dev
```

The CLI will ask for the Hedera network (choose testnet) and whether to install Hedera Skills (optional).

Open http://localhost:3000/dashboard, connect a wallet on Hedera Testnet (chain 296), and you're looking at the live reference vault. The site also has a landing page (`/`), How it works (`/how-it-works`), these docs (`/docs`) and a contract debugger (`/debug`).

The commands in this README use npm, the template's default. If you scaffolded with Yarn, drop the `run` (`yarn hardhat:test`). Pass extra flags to npm scripts after `--`, because npm swallows flags like `--network` otherwise.

## What a fresh scaffold gives you

- **A dashboard wired to the reference vaults.** `packages/nextjs/contracts/deployedContracts.ts` is committed, so the frontend reads the main vault (and the narrow demo vault) deployed by the template author. You can deposit, withdraw, and compound against them straight away.
- **Unit tests that run offline.** `npm run hardhat:test` uses mocks for SaucerSwap, HTS (`0x167`), and the exchange-rate system contract (`0x168`). No network or keys needed.
- **Operator scripts that target your own deployment.** `hardhat-deploy` records (`packages/hardhat/deployments/`) are gitignored, so `hardhat:smoke`, `hardhat:compound`, `hardhat:withdraw` and friends only work after you deploy your own vault. See [Deploy your own vault](#deploy-your-own-vault).

There is no local-chain flow. The vault calls live SaucerSwap V2 contracts, so it only makes sense on testnet (or mainnet).

## How it works

```
Next.js dashboard ──JSON-RPC──► TidepoolVault ──► SaucerSwap V2 pool          slot0, observe → spot + TWAP
                                     │         ──► NonfungiblePositionManager  mint / increase / decrease / collect
        │ REST                       │         ──► SwapRouter                  exactInputSingle
        ▼                            ├─ HTS 0x167: associate, create / mint / burn the share token
Hedera mirror node                   └─ exchange rate 0x168: position fee tinycents → tinybars
(activity feed)
```

1. **Deposit.** You deposit both pool tokens in the vault's current ratio and receive HTS shares. Deposits sit idle until the next compound, so depositing costs no SaucerSwap fee.
2. **Compound.** `compound()` collects fees, swaps idle balances to the range's token ratio, and adds everything to the position. The first call mints the position, centred on the TWAP tick.
3. **Rebalance.** `rebalance()` only succeeds when the TWAP tick is outside the range, spot is within `maxTwapDeviation` of the TWAP, and the cooldown has passed. It removes all liquidity, re-centres a fixed-width range on the TWAP, and mints a new position NFT.
4. **Withdraw.** You get your share of the position and idle balances back, and your shares are burned. Withdrawals skip the TWAP check, so you can always exit.

There's no owner, admin key, pause, fee switch, or upgrade path. The deployer can call `initialize()` once and nothing else. `compound()` and `rebalance()` are permissionless: the caller pays SaucerSwap's HBAR position fee and the vault refunds any surplus.

The spot-vs-TWAP check is what makes permissionless keeper calls safe. Someone can push spot around inside one transaction, but not the 600-second TWAP, so a sandwich attempt makes the call revert instead of forcing a bad range.

Full design, maths, invariants and threat model: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Project map

```
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

`initialize()` sends 30 HBAR. About 15.3 HBAR pays the HTS token-creation fee and the rest is refunded. Deploying regenerates `deployedContracts.ts`, so the dashboard switches to your vault.

Other scripts:

```bash
npm run hardhat:compound                     # compound fees into the position
WITHDRAW_BPS=1000 npm run hardhat:withdraw   # withdraw 10% of your shares
npm run hardhat:simulate-traders             # swap back and forth so the position earns fees
```

## Adapt it

Every vault parameter is a constructor argument in `packages/hardhat/tidepool.config.ts`. They're immutable, so changing one means deploying a new vault.

| Parameter | Reference value | Rules |
|---|---|---|
| `pool` | WHBAR/SAUCE 0.30% | Must be a SaucerSwap V2 pool. The constructor checks it against the factory. |
| `halfWidth` | 600 ticks (≈ ±6.2%) | Positive multiple of the pool's tick spacing: fee 500 → 10, 1500 → 30, 3000 → 60, 10000 → 200. |
| `twapWindow` | 600 s | The pool needs at least this much observation history. |
| `maxTwapDeviation` | 50 ticks (≈ 0.5%) | Tighter is safer but refuses more often in volatile pools. |
| `rebalanceCooldown` | 3600 s | Minimum gap between rebalances. |
| `swapSlippageBps` | 100 (1%) | Extra slippage on the swap-to-ratio step, on top of the pool fee. Applies to compound and rebalance. |

To point Tidepool at a different pool:

1. Check the pool's oracle. Call `slot0()` on the pool and look at `observationCardinality`. If it's 1, `observe()` reverts after any swap and the vault will refuse to act. Anyone can fix that by calling `increaseObservationCardinalityNext(n)` on the pool, then waiting for history to build up past `twapWindow`.
2. Set `pool` and a valid `halfWidth` in `tidepool.config.ts`.
3. Deploy with `npm run hardhat:deploy:testnet`.

For mainnet, add a `hederaMainnet` entry. SaucerSwap mainnet addresses are listed in `docs/ARCHITECTURE.md` §2.4 but haven't been tested with this template.

Natural extensions: a keeper (a cron job that calls `compound()` only when collected fees exceed the cost, and `rebalance()` when `getPriceState()` reports out of range), other range strategies, burning emptied position NFTs, or single-sided deposits.

### When does compounding pay?

Each compound costs SaucerSwap's position fee (5 US cents in HBAR, ≈ 0.64 HBAR at the testnet rate) plus gas: a compound into an existing position used 563,157 gas on testnet, charged 0.61 HBAR, so about 1.25 HBAR in total with the position fee (opening the first position: 894,762 gas, 0.98 HBAR). Compound when the fees you'd collect are worth more than that. On a small vault, compounding often loses money, so a keeper should check `positions()` fees before calling.

## Hedera gotchas

Things that work differently from Ethereum and cost time to discover. Each has a longer write-up with a reproduction in `docs/ARCHITECTURE.md` §6.

- **HTS amounts are `int64`.** An 18-decimal share token would cap supply at about 9.2 tokens. Tidepool uses 8 decimals, and approvals never use `uint256` max: each standing allowance is the token's max supply (finite-supply tokens) or `type(int64).max`.
- **Contracts must associate before receiving tokens.** The vault associates itself with both pool tokens and the SaucerSwap LP NFT collection in `initialize()`. Users associate the share token from their wallet (HIP-719: call `associate()` on the token address). The dashboard shows the button.
- **Association and approval from a contract are expensive gas.** Roughly 650–780k gas each. `initialize()` (three associations, share-token creation, four standing approvals) used 5,236,012 gas on testnet; an early version with only the associations failed at a 2M limit with `HtsCallFailed(21)`.
- **HTS rejects an allowance above a finite token's max supply** (`AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY`). SAUCE has a finite supply, so a `type(int64).max` approval of it reverts. The vault reads each token's supply type and caps its allowances at `maxSupply`.
- **HBAR has two unit systems.** JSON-RPC `value` is weibar (18 decimals); contracts see tinybar (8 decimals). Multiply tinybars by 1e10 in the frontend.
- **SaucerSwap charges a position fee in HBAR** on every `mint` and `increaseLiquidity`. It's quoted in tinycents; the vault converts it with the exchange-rate system contract (`0x168`) and forwards exactly `tinycentsToTinybars(fee) + 1`. Sending more lets the manager wrap the caller's HBAR instead of pulling the vault's WHBAR.
- **Use WhbarHelper, not the WHBAR contract.** SaucerSwap says not to call or approve the WHBAR contract directly. Approving the WHBAR *token* is fine.
- **Position mints can't be simulated.** `eth_call` and `eth_estimateGas` return `INVALID_NFT_ID` for SaucerSwap V2 mints that succeed on chain. The dashboard and scripts send `compound()` and `rebalance()` with `disableSimulate` and a fixed 8M gas limit after read-only precondition checks. Don't "fix" this by re-enabling simulation.
- **`quoteMintFee()` isn't `view`** because the exchange-rate interface is declared non-view. Call it with `eth_call` / `simulateContract`.
- **Fresh scaffolds need two build fixes**, both included: a root `.npmrc` with `legacy-peer-deps=true` (Hardhat plugin peer mismatch) and a webpack alias that stubs the optional `@x402/*` peers pulled in by wagmi.
- **Sourcify v1 routes return 404.** `hardhat verify` fails; `npm run hardhat:verify:sourcify` uses the v2 API instead.

## Dashboard

The dashboard shows the position's range against spot and TWAP on a live range chart, the vault's holdings, your share of the vault, and the vault's activity from the mirror node. Connected accounts without shares get a Get started checklist (associate, wrap HBAR, get SAUCE, deposit). Deposit and withdraw handle association, HBAR wrapping, approvals, and 1% minimums. The keeper panel lists every condition `compound()` and `rebalance()` check on chain, so you can see why an action is unavailable before paying for it.

`deposit` and `withdraw` are simulated before sending. `compound` and `rebalance` aren't (see gotchas). Vault errors like `PriceDeviation` or `CooldownActive` show as plain-language messages, via small edits to the template's `getParsedError.ts` and `useTransactor.tsx`.

## Optional: narrow-vault rebalance demo

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

## Testnet evidence

All links go to HashScan (testnet).

| Item | Reference |
|---|---|
| Main vault | [`0x3BfC02f414956E66fB3B722fC935500B946ac181`](https://hashscan.io/testnet/contract/0x3BfC02f414956E66fB3B722fC935500B946ac181) (0.0.10743961) · share token 0.0.10743964 · LP NFT 0.0.1310436 #392 |
| Narrow demo vault | [`0x7bBfa539173e44aA41aFe7aB9D9Dd52edd42D244`](https://hashscan.io/testnet/contract/0x7bBfa539173e44aA41aFe7aB9D9Dd52edd42D244) (0.0.10744069) · share token 0.0.10744072 · LP NFT 0.0.1310436 #394 (#393 emptied by the rebalance) |
| Pool, WHBAR/SAUCE 0.30% | [`0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7`](https://hashscan.io/testnet/contract/0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7) (0.0.2661057) |

| Step | Transaction | Result |
|---|---|---|
| Main: initialize (associations, share token, standing approvals) | [`0x9c08525d…ead0`](https://hashscan.io/testnet/transaction/0x9c08525dfeaf083807dcffe31a8c44699ccfc7a8d8322af92eaab1efe7acead0) | 5,236,012 gas; fee charged 20.98 HBAR, of which 15.27 HBAR is the HTS token-creation fee (14.73 of the 30 HBAR sent was refunded) |
| Main: deposit | [`0xd799426f…7eb1`](https://hashscan.io/testnet/transaction/0xd799426f2162a34100648cfb0c2a317caac457258a4b80902ba6994fe4227eb1) | 161.42039494 WHBAR + 922.334593 SAUCE in; 99.999 shares out (0.001 kept by the vault as dead shares) |
| Main: first compound (mints position NFT #392) | [`0x236d6545…1741`](https://hashscan.io/testnet/transaction/0x236d65455eec356fe3d726b04a4c91b829341433ddeb07946e089787292a1741) | TWAP tick −7702 → range [−8340, −7140); 894,762 gas; 0.98 HBAR fee + 0.64 HBAR position fee |
| Swaps to generate fees (3) | [`0x823cf988…6dae`](https://hashscan.io/testnet/transaction/0x823cf98821ce66a7befecad7ae13a9ab33c5662fa87ef2273bf2a8320b9e6dae), [`0x530100cd…31b1`](https://hashscan.io/testnet/transaction/0x530100cd7e77c59234adee575e8714e4af1a1777aba214839606e966cffc31b1), [`0xc9436787…40c9`](https://hashscan.io/testnet/transaction/0xc9436787d51aef1b7c4f4e28fc97019ee81f4876e4fad47bd6ce053a97e340c9) | 228.45 SAUCE → 4.97 WHBAR each, inside the range |
| Main: compound with collected fees | [`0x76c31145…a9ca`](https://hashscan.io/testnet/transaction/0x76c3114520d0693e07ae4f3b53128d89d9a0ef672e9aec153b8291fbc7e1a9ca) | `FeesCollected` 0.00466241 WHBAR + 0.213024 SAUCE; +24,510,816,970 liquidity on #392; 563,157 gas; 0.61 HBAR fee + 0.64 HBAR position fee |
| Main: deposit, sent from the dashboard by a second account | [`0xbcfc48e9…d82f`](https://hashscan.io/testnet/transaction/0xbcfc48e9cee0edcb1610f430ce150e85152c9677f5a77811375cbc4bf18fd82f) | 0.99988942 WHBAR + 38.245393 SAUCE in; 1.00966568 shares out |
| Main: withdraw, sent from the dashboard by a second account | [`0xb8132ee0…f7b4`](https://hashscan.io/testnet/transaction/0xb8132ee09d555da31bab3a66daf33e305269eda8b808a6e2b2de8b78cee6f7b4) | 0.001 shares burned; 0.0009903 WHBAR + 0.037879 SAUCE out |
| Narrow: first compound (mints NFT #393) | [`0x1063c0d5…61d3`](https://hashscan.io/testnet/transaction/0x1063c0d56c7fc4463a0e09228d9f81d9035144162b83780817b9ff272bef61d3) | TWAP tick −7793 → range [−7860, −7740); 942,891 gas |
| Price move down | [`0xd3afb662…c658`](https://hashscan.io/testnet/transaction/0xd3afb662d0c7d96af20fa625d337f715cfb2d61b7116960fa70feff31017c658) | 120 WHBAR → 5,459.99313 SAUCE; spot tick −7793 → −7899 |
| Narrow: rebalance (#393 → #394) | [`0xf55864c1…0654`](https://hashscan.io/testnet/transaction/0xf55864c1fc7bdd54ae9597ecae2f8f70e534c0af4c0c7fb14da31065ceda0654) | TWAP tick −7899: [−7860, −7740) → [−7980, −7860); #393 liquidity now 0; 982,492 gas; 1.07 HBAR fee + 0.64 HBAR position fee |
| Price restored | [`0xac066a24…5a06`](https://hashscan.io/testnet/transaction/0xac066a24749c6d70f9f278d2de2cf80a3c31d38cbf530f22aa551ef1a9d35a06) | 5,459 SAUCE → 119.29406227 WHBAR; spot tick −7902 → −7794 |

Fees are the network fee charged for each transaction; the SaucerSwap position fee (0.64079562 HBAR) is paid on top by every compound and rebalance, from the HBAR sent with the call. The full log, including the two failed `initialize` attempts (association gas, then an allowance above SAUCE's max supply), is in `docs/ARCHITECTURE.md` §13.

## Known limitations

- Not audited. Testnet only; mainnet addresses in the docs are untested.
- One pool per vault and one strategy: a fixed-width range around the TWAP tick.
- No keeper is included. `compound()` and `rebalance()` run only when someone calls them.
- Each compound or rebalance costs the SaucerSwap position fee (≈ 0.64 HBAR on testnet) plus gas: on testnet 0.61 HBAR for a compound into an existing position (563,157 gas) and 1.07 HBAR for a rebalance (982,492 gas). Compounding small fees loses money.
- The vault gives the SaucerSwap position manager and swap router standing allowances (set once in `initialize()`) to avoid about 700k gas per approval on every call. Both addresses are immutable and checked against the SaucerSwap factory in the constructor.
- compound() refuses to add to a position whose range no longer contains the TWAP (OutOfRange). Call rebalance() instead.
- Standing allowances are capped per token: a token's `maxSupply` if it has a finite supply (HTS rejects larger allowances with `AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY`), otherwise `type(int64).max`. They shrink as the manager and router spend them and are not topped up automatically; once one runs low, compound and rebalance revert until someone calls the permissionless `refreshApprovals()`.
- The swap-to-ratio step ignores its own price impact, so some tokens can stay idle until the next compound.
- `getTotalAmounts()` excludes fees that haven't been collected yet. Every deposit, withdraw, compound and rebalance collects first, so this only affects the view.
- Emptied position NFTs stay in the vault after a rebalance. Burning them would need an NFT approval to the manager.
- Pools with an observation cardinality of 1 can't be used until it's increased (see [Adapt it](#adapt-it)).
- A contract that calls `compound()` or `rebalance()` must be able to receive HBAR, or the refund reverts with `RefundFailed`.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `initialize` reverts with `HtsCallFailed(21)` | Out of gas during token association. The child record on the mirror node shows `INSUFFICIENT_GAS`. Use at least 5M gas; the deploy script already does. |
| `TwapUnavailable` | The pool's oracle can't answer for `twapWindow`. See step 1 of [Adapt it](#adapt-it). |
| `PriceDeviation` | Spot is too far from the TWAP, usually right after a large swap. Wait for the TWAP to catch up. |
| `CooldownActive` / `StillInRange` | Rebalance preconditions aren't met yet. The keeper panel shows which one. |
| Deposit or withdraw fails with a token error | Your account isn't associated with WHBAR, SAUCE, or the share token. Use the Associate buttons. |
| `hardhat:deploy --network hederaTestnet` deploys to the wrong network | npm swallowed the flag. Use `npm run hardhat:deploy:testnet` or `npm run hardhat:deploy -- --network hederaTestnet`. |
| `yarn` is not recognized | Run `corepack enable`, or call the bundled copy: `node .yarn/releases/yarn-3.2.3.cjs <script>`. |
| "Invalid Chai property" when running tests on Windows | The terminal path's casing doesn't match the real folder, so chai loads twice. `cd` into the folder with the exact casing. |
| `ChunkLoadError` in the dev server | `next build` and `next dev` share `.next/`. Stop the dev server and delete `packages/nextjs/.next` before building. |

## Licence

MIT, see [`LICENCE`](LICENCE). Depends on `@uniswap/v4-core` (MIT libraries only), `@hiero-ledger/hiero-contracts` (Apache-2.0) and OpenZeppelin (MIT). No GPL or BUSL code is copied.