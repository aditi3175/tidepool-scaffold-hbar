# Troubleshooting

This page maps the errors and symptoms you are most likely to hit to their cause and fix.

## Vault errors

The dashboard shows these as plain-language messages.

| Error | Cause and fix |
|---|---|
| `PriceDeviation` | Spot is too far from the TWAP, usually right after a large swap. Wait for the TWAP to catch up. Withdrawals still work. |
| `TwapUnavailable` | The pool's oracle can't answer for `twapWindow`. See step 1 of [Point Tidepool at a different pool](adapt-it.md). |
| `CooldownActive` / `StillInRange` | Rebalance preconditions aren't met yet. The keeper card shows which one. |
| `OutOfRange` | `compound()` refuses to add to a position whose range no longer contains the TWAP. Call `rebalance()` instead. |
| `NothingToCompound` | The vault holds no idle tokens and the position had no fees to collect. If the vault has no position yet, deposit first. |
| `InsufficientFee` | The HBAR sent doesn't cover SaucerSwap's position fee. Refresh the fee quote and try again. |
| `SlippageExceeded` | The vault or pool changed after the preview. Refresh and try again. |
| `ApproveFailed` | A token rejected the vault's approval. If a standing allowance has been spent down, call `refreshApprovals()`. |
| `RefundFailed` | A contract that calls `compound()` or `rebalance()` must be able to receive HBAR. |
| `initialize` reverts with `HtsCallFailed(21)` | Out of gas during token association. The child record on the mirror node shows `INSUFFICIENT_GAS`. Use at least 5M gas; the deploy script already does. |

## Wallet and tokens

| Symptom | Cause and fix |
|---|---|
| Deposit or withdraw fails with a token error | Your account isn't associated with WHBAR, SAUCE, or the share token. Use the Associate buttons. |
| Compound and Rebalance buttons stay disabled | Open **Conditions** on the keeper card: it lists the check that fails. They also need a connected wallet on Hedera Testnet. |
| The wallet asks for a strange HBAR amount | JSON-RPC values are weibar (18 decimals). The dashboard converts; check any hand-written call. |

## Tooling

| Symptom | Cause and fix |
|---|---|
| `hardhat:deploy --network hederaTestnet` deploys to the wrong network | npm swallowed the flag. Use `npm run hardhat:deploy:testnet` or `npm run hardhat:deploy -- --network hederaTestnet`. |
| `yarn` is not recognized | Run `corepack enable`, or call the bundled copy: `node .yarn/releases/yarn-3.2.3.cjs <script>`. |
| "Invalid Chai property" when running tests on Windows | The terminal path's casing doesn't match the real folder, so chai loads twice. `cd` into the folder with the exact casing. |
| `ChunkLoadError` in the dev server | `next build` and `next dev` share `.next/`. Stop the dev server and delete `packages/nextjs/.next` before building. |
| `npm install` fails with ERESOLVE | The root `.npmrc` (`legacy-peer-deps=true`) is missing. It ships with the template. |

For HTS failures that the EVM revert doesn't explain, see [Debugging a failed transaction](hedera-gotchas.md).
