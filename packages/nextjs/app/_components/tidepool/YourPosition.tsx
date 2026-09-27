import { useAccount } from "wagmi";
import { Num } from "~~/app/_components/tidepool/motion";
import { Skeleton, StatePill, TokenAmount } from "~~/app/_components/tidepool/ui";
import { HederaAddress } from "~~/components/scaffold-hbar";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { formatAmount } from "~~/utils/tidepool/math";

/**
 * The connected account's stake, shown compactly inside the hero's vault card: shares, share of the vault, estimated
 * slice of the holdings, share-token association and the account itself.
 */
export const YourStake = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;

  return (
    <div className="mt-5 border-t border-white/[0.07] pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="tp-eyebrow">Your stake</div>
        {user.connected && user.isAssociated !== undefined && (
          <StatePill tone={user.isAssociated ? "success" : "warning"}>
            {user.isAssociated ? "Associated" : "Not associated"}
          </StatePill>
        )}
      </div>
      {!user.connected ? (
        <p className="mt-2 text-sm text-base-content/50">Connect a wallet to see your shares.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              {user.shares === undefined ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <Num id="your-shares" text={formatAmount(user.shares, SHARE_DECIMALS)} className="text-2xl" />
              )}
              <div className="mt-1 text-[11px] text-base-content/45">
                {user.isAssociated === false
                  ? "Associate the share token before depositing."
                  : user.percent !== undefined
                    ? `shares · ${user.percent}% of the vault`
                    : "shares"}
              </div>
            </div>
            <div>
              {user.slice0 === undefined ? (
                <span className="tp-num">–</span>
              ) : (
                <span className="flex flex-col gap-0.5">
                  <TokenAmount id="your-slice0" amount={formatAmount(user.slice0, decimals0)} symbol={symbol0} />
                  <TokenAmount id="your-slice1" amount={formatAmount(user.slice1, decimals1)} symbol={symbol1} />
                </span>
              )}
              <div className="mt-1 text-[11px] text-base-content/45">estimated slice, before uncollected fees</div>
            </div>
          </div>
          <div className="mt-3 text-xs">
            <AccountId />
          </div>
        </>
      )}
    </div>
  );
};

/** The connected wallet's EVM address and Hedera account ID (mirror-node lookup), via the scaffold component. */
const AccountId = () => {
  const { targetNetwork } = useTargetNetwork();
  const { address } = useAccount();
  return (
    <div className="[&>div]:flex-row [&>div]:flex-wrap [&>div]:items-center [&>div]:gap-x-3">
      <HederaAddress address={address} chain={targetNetwork} />
    </div>
  );
};
