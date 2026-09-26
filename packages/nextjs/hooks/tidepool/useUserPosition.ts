import { useAccount } from "wagmi";
import { useHtsAccount } from "~~/hooks/tidepool/useHtsAccount";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { sharePercent } from "~~/utils/tidepool/math";

/**
 * The connected account's stake in a vault: share balance, association, allowance to the vault, and its
 * pro-rata slice of getTotalAmounts(). The slice is an estimate at the current spot price and excludes
 * uncollected fees; the exact withdrawal amounts come from simulating withdraw().
 */
export function useUserPosition(vault: VaultState) {
  const { address } = useAccount();
  const shares = useHtsAccount(vault.shareToken, vault.address);
  const { totalShares, total0, total1 } = vault;

  const hasSlice = shares.balance !== undefined && totalShares !== undefined && totalShares > 0n;
  return {
    connected: Boolean(address),
    shareAccount: shares,
    shares: shares.balance,
    isAssociated: shares.isAssociated,
    percent: hasSlice ? sharePercent(shares.balance!, totalShares!) : undefined,
    slice0: hasSlice && total0 !== undefined ? (total0 * shares.balance!) / totalShares! : undefined,
    slice1: hasSlice && total1 !== undefined ? (total1 * shares.balance!) / totalShares! : undefined,
  };
}

export type UserPosition = ReturnType<typeof useUserPosition>;
