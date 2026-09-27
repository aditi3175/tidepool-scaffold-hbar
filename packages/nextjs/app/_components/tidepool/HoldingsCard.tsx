import { Card, ExternalLink, Skeleton, Stat, TokenAmount } from "~~/app/_components/tidepool/ui";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { entityIdFromAddress, formatAmount, shortAddress } from "~~/utils/tidepool/math";

/** What the vault holds: both tokens (position and idle), total shares and the share token. */
export const VaultHoldingsCard = ({ vault }: { vault: VaultState }) => {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined && vault.total0 !== undefined;

  return (
    <Card title="Vault holdings">
      {ready ? (
        <div className="flex flex-col gap-1 text-xl font-medium">
          <TokenAmount amount={formatAmount(vault.total0, decimals0)} symbol={symbol0} />
          <TokenAmount amount={formatAmount(vault.total1, decimals1)} symbol={symbol1} />
        </div>
      ) : vault.readError ? (
        <p className="text-sm text-muted">Holdings could not be read. Retrying.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-44" />
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat label="Total shares" tip="All vault shares in existence, including 0.001 locked in the vault forever.">
          {formatAmount(vault.totalShares, SHARE_DECIMALS)}
        </Stat>
        <Stat label="Share token" tip="The HTS token that represents vault shares. Opens on HashScan.">
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
    </Card>
  );
};

/** The connected account's shares, their share of the vault, and the tokens they would withdraw today. */
export const YourPositionCard = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  return (
    <Card title="Your position">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Shares">{user.shares === undefined ? "–" : formatAmount(user.shares, SHARE_DECIMALS)}</Stat>
        <Stat label="Share of vault">{user.percent === undefined ? "–" : `${user.percent}%`}</Stat>
        <Stat
          label="Estimated tokens"
          tip="Your share of the vault's holdings at the current price. Uncollected fees are added at the next compound."
        >
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
    </Card>
  );
};
