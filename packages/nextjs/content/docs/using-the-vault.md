# Using the vault

This page walks you through depositing into and withdrawing from the vault on the dashboard, and explains what each number on the page means.

## Before you start

- A wallet on Hedera Testnet (chain 296) with some testnet HBAR from https://portal.hedera.com/faucet.
- The dashboard at `/dashboard`. The vault switcher at the top chooses between the **Main** vault and the **Narrow** demo vault.

When you connect a wallet that holds no shares yet, the dashboard shows a **Get started** checklist. Each step reads your real on-chain state and shows the action for the step you're on.

## 1. Associate the tokens

Hedera accounts must associate an HTS token before they can receive it. You need three associations: WHBAR, SAUCE and the vault's share token. Each is one wallet transaction (HIP-719: the wallet calls `associate()` on the token address). The dashboard shows an **Associate** button for each token you're missing. Accounts with free auto-association slots can skip this.

## 2. Get WHBAR

The pool holds WHBAR, not HBAR. Use **Wrap HBAR** in the deposit panel: it wraps through SaucerSwap's WhbarHelper (testnet `0.0.5286055`). Don't call or approve the WHBAR *contract* directly; SaucerSwap says not to.

## 3. Get SAUCE

Swap some HBAR for SAUCE on SaucerSwap's testnet site, https://testnet.saucerswap.finance. Tidepool does not swap for you.

## 4. Deposit

Enter an amount of either token; the other fills in at the vault's current ratio. The panel shows an estimate, then the exact share amount from a simulation once your approvals are in place, and it accepts up to 1% fewer shares than the preview.

**Approve & deposit** sends one approval per token that needs it, then `deposit`. Your tokens sit idle in the vault until the next compound adds them to the position, so depositing costs no SaucerSwap fee.

The vault refuses deposits while spot is more than `maxTwapDeviation` ticks from the TWAP (50 on the reference vaults). Wait a few minutes for the TWAP to catch up and try again.

## 5. Withdraw anytime

Enter the shares to burn (or press **Max**). The panel approves the share token for the vault if needed, then calls `withdraw` with minimums 1% below the previewed amounts. You receive your share of the position and of the idle balances, in WHBAR and SAUCE (WHBAR stays wrapped).

Withdrawals skip the TWAP guard, so you can always exit.

## Reading the dashboard

The chart at the top is the position. The glowing band is the range, the solid line is spot (the pool's price now), and the dashed line is the TWAP (the pool's average over `twapWindow`, 600 seconds on the reference vaults). The band is green while the TWAP is inside the range and amber when it has left. The dots flowing across it are an illustration of swaps, not live trades.

| Stat | Meaning |
|---|---|
| Spot | The pool's price right now. |
| TWAP | The 10-minute average price. The vault acts on this, not on spot. |
| Ticks apart | Distance between spot and TWAP, against the vault's limit (e.g. `0 / 50`). Above the limit, deposit, compound and rebalance pause. |
| LP NFT | The SaucerSwap position NFT the vault owns. |
| Liquidity | The position's liquidity, in SaucerSwap's units. |

**Your position** shows your shares, your share of the vault, and the tokens you would get back at the current price. **Vault holdings** shows everything the vault controls: the position at the spot price plus idle balances. Uncollected fees are added at the next compound, deposit or withdrawal.

## The Narrow demo vault

The Narrow vault is a separate test vault with a ±60-tick range and a 600-second cooldown, deployed to demonstrate rebalancing. Its range is narrow, so it is often **out of range**. When it is, and the keeper card shows **Rebalance: Ready** (TWAP outside the range, spot within 50 ticks of the TWAP, cooldown over), anyone can press **Rebalance** on the dashboard and watch a live re-centre: the gauge's band moves to the TWAP and the activity table shows the new position NFT. The caller pays SaucerSwap's position fee (about 0.64 HBAR) and gas (a rebalance used 982,492 gas, 1.07 HBAR, on testnet).

Use the Main vault for anything else. See [Keepers & rebalancing](keepers-and-rebalancing.md).

## HBAR amounts

JSON-RPC `value` is in weibar (18 decimals); contracts see tinybar (8 decimals). The dashboard converts for you. If you call the vault directly, multiply tinybars by 1e10.
