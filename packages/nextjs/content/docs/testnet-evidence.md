# Testnet evidence

This page lists the deployed contracts and every transaction that shows the vault working on Hedera testnet, with links to HashScan.

## Contracts

| Item | Reference |
|---|---|
| Main vault | [`0x3BfC02f414956E66fB3B722fC935500B946ac181`](https://hashscan.io/testnet/contract/0x3BfC02f414956E66fB3B722fC935500B946ac181) (0.0.10743961) · share token 0.0.10743964 · LP NFT 0.0.1310436 #396 (#392 emptied by the rebalance) · source verified on Sourcify (exact match) |
| Narrow demo vault | [`0x7bBfa539173e44aA41aFe7aB9D9Dd52edd42D244`](https://hashscan.io/testnet/contract/0x7bBfa539173e44aA41aFe7aB9D9Dd52edd42D244) (0.0.10744069) · share token 0.0.10744072 · LP NFT 0.0.1310436 #397 (#393 and #394 emptied by the rebalances) · source verified on Sourcify (exact match) |
| Pool, WHBAR/SAUCE 0.30% | [`0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7`](https://hashscan.io/testnet/contract/0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7) (0.0.2661057) |

Standing allowances read on chain: WHBAR `approvalCap0` = `type(int64).max`, SAUCE `approvalCap1` = 1,000,000,000,000,000 (its max supply).

## Transactions

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
| Main: rebalance, sent from the dashboard (#392 → #396) | [`0xbf698e4c…ccb6`](https://hashscan.io/testnet/transaction/0xbf698e4c105e67d5cdefcb7adc76da48629501f8813dc4bc24898f69af37ccb6) | TWAP tick −8920: [−8340, −7140) → [−9540, −8340); `FeesCollected` 0.21283843 WHBAR + 0.007141 SAUCE; #392 liquidity now 0; 1,043,853 gas; 0.85 HBAR fee + 0.48 HBAR position fee |
| Narrow: rebalance, sent from the dashboard (#394 → #397) | [`0xceeb9dcb…13d0`](https://hashscan.io/testnet/transaction/0xceeb9dcbbe430a5af77754b6b19de6ee5c8260f33be42fa45c3ce03e883113d0) | TWAP tick −9046: [−7980, −7860) → [−9120, −9000); #394 liquidity now 0; 1,000,182 gas; 0.81 HBAR fee + 0.48 HBAR position fee |

Fees are the network fee charged for each transaction; the SaucerSwap position fee is paid on top by every compound and rebalance, from the HBAR sent with the call. It is 5 US cents converted at the current exchange rate: 0.64079562 HBAR in September, 0.47746676 HBAR on 1 October (the amount the vault forwarded to the position manager, from the mirror node's contract actions).

Both vaults were also deployed and initialized from the same account: main deploy [`0x8f967dc5…f388`](https://hashscan.io/testnet/transaction/0x8f967dc59eda3dc7f01d00389376644a5327186a13b1c1f676c1820823fcf388) (4,860,874 gas), narrow deploy [`0x08afb1da…db25`](https://hashscan.io/testnet/transaction/0x08afb1da0897542130f7198e7aea5a106bbe8a5568c3f427575b8917517edb25), narrow initialize [`0x3002ec2f…0e5d`](https://hashscan.io/testnet/transaction/0x3002ec2f444978a5a16acb06f709ed316f6896d02d94a173c85d10c496570e5d), narrow deposit of exactly 2 WHBAR + 93 SAUCE [`0xb3f50342…8875`](https://hashscan.io/testnet/transaction/0xb3f503427dfb9c97a34cd9e092fc0458c3094c82e14922fc669d16cee7af8875).

## Gas and cost findings

- Standing approvals removed the dominant cost. Compound into an existing position: 563,157 gas / 0.61 HBAR, against 4,802,810 gas with six per-call approvals in the previous version. First compound: 894,762 gas (previously 5,128,563; network fee 0.98 HBAR, previously 5.59 HBAR). Rebalance: 982,492 gas (previously 5,257,516).
- Each HTS allowance approval made by the vault costs 705,424 gas (measured on the previous version).
- Hedera charged gas used, not the limit: 563,157 gas × 109 tinybars = 0.61384113 HBAR, the fee charged.
- Compound and rebalance total cost on testnet, with the position fee: about 1.25 HBAR (compound) and 1.71 HBAR (rebalance).

## Incidents

- **`initialize` out of gas** (previous main vault 0.0.10710646, 25 Sep 2026). Tx [`0xe13de31b…53cc`](https://hashscan.io/testnet/transaction/0xe13de31bfe04fd42421963d1703ec7b30d26ed9edf5b84f86647d361b51053cc): REVERT `HtsCallFailed(21)`, 1,969,541 / 2,000,000 gas; child `TOKENASSOCIATE` = `INSUFFICIENT_GAS`; atomic, no state change.
- **`initialize` rejected by SAUCE's max supply** (vault `0x2a0BB90055Fa38A913C137D5f920b01417cb2d6C`, 26 Sep 2026). Tx [`0x9e323774…513c`](https://hashscan.io/testnet/transaction/0x9e32377405a59e025ba270bba0012298a339aa52078724c9d3504458f6e6513c): 5,136,540 / 8,000,000 gas. The SAUCE approval to the position manager returned `AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY` (289). That vault was left uninitialized; the current contract caps allowances per token and the deploy scripts run `initialize()` as an `eth_call` first.
- **Simulation limit.** `eth_call` and `eth_estimateGas` return `INVALID_NFT_ID` for any SaucerSwap V2 position mint, including mints that succeeded on chain. Replaying real mint [`0x4cf676ed…66f7`](https://hashscan.io/testnet/transaction/0x4cf676eda79bc22cc6b21199c1d55bfed5bd9783e3003664c0fb3e8fec0466f7) reproduced it, so `compound()` (first position) and `rebalance()` are sent with a fixed gas limit.

The full log, with gas limits and fees for every transaction, is section 13 of `docs/ARCHITECTURE.md`.
