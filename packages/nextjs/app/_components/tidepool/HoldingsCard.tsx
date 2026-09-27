import { Card, ExternalLink, Skeleton, Stat, StatePill, TokenAmount } from "~~/app/_components/tidepool/ui";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { entityIdFromAddress, formatAmount, shortAddress } from "~~/utils/tidepool/math";

/** The vault's holdings and the connected account's stake. */
export const HoldingsCard = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined && vault.total0 !== undefined;

  return (
    <Card title="Vault holdings">
      {ready ? (
        <div className="flex flex-col gap-1 text-xl font-medium">
          <TokenAmount amount={formatAmount(vault.total0, decimals0)} symbol={symbol0} />
          <TokenAmount amount={formatAmount(vault.total1, decimals1)} symbol={symbol1} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-44" />
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat label="Total shares">{formatAmount(vault.totalShares, SHARE_DECIMALS)}</Stat>
        <Stat label="Share token">
          {vault.shareToken ? (
            <ExternalLink href={hashscan.token(vault.shareToken)}>
              {entityIdFromAddress(vault.shareToken) ?? shortAddress(vault.shareToken)}
            </ExternalLink>
          ) : vault.initialized === false ? (
            "Not initialized"
          ) : (
            "–"
          )}
        </Stat>
      </div>

      <div className="mt-4 border-t border-base-300 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-sm font-semibold">Your stake</h3>
          {user.connected && user.isAssociated === false && <StatePill tone="warning">Not associated</StatePill>}
        </div>
        {!user.connected ? (
          <p className="mt-2 text-sm text-base-content/55">Connect a wallet</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-4">
            <Stat label="Shares">
              {user.shares === undefined ? "–" : formatAmount(user.shares, SHARE_DECIMALS)}
              {user.percent !== undefined && <span className="text-base-content/55"> · {user.percent}%</span>}
            </Stat>
            <Stat label="Your tokens (est.)">
              {user.slice0 === undefined ? (
                "–"
              ) : (
                <span className="flex flex-col">
                  <TokenAmount amount={formatAmount(user.slice0, decimals0)} symbol={symbol0} />
                  <TokenAmount amount={formatAmount(user.slice1, decimals1)} symbol={symbol1} />
                </span>
              )}
            </Stat>
          </div>
        )}
      </div>
    </Card>
  );
};
