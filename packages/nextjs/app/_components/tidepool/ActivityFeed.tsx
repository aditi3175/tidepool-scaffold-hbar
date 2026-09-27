import type { ReactNode } from "react";
import { Card, ExternalLink, Skeleton } from "~~/app/_components/tidepool/ui";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { ACTIVITY_LIMIT, type VaultEvent, useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatAmount, shortAddress } from "~~/utils/tidepool/math";

const LABELS: Record<string, string> = {
  Initialized: "Vault initialized",
  Deposit: "Deposit",
  Withdraw: "Withdraw",
  FeesCollected: "Fees collected",
  Compound: "Compound",
  Rebalance: "Rebalance",
};

const big = (value: unknown) => (typeof value === "bigint" ? value : undefined);

function describe(event: VaultEvent, vault: VaultState): ReactNode {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  const a = event.args;
  const tokens = (x: unknown, y: unknown) =>
    `${formatAmount(big(x), decimals0)} ${symbol0 ?? ""} + ${formatAmount(big(y), decimals1)} ${symbol1 ?? ""}`;
  switch (event.name) {
    case "Deposit":
      return `${tokens(a.amount0, a.amount1)} in, ${formatAmount(big(a.shares), SHARE_DECIMALS)} shares to ${shortAddress(String(a.receiver))}`;
    case "Withdraw":
      return `${formatAmount(big(a.shares), SHARE_DECIMALS)} shares burned, ${tokens(a.amount0, a.amount1)} to ${shortAddress(String(a.receiver))}`;
    case "FeesCollected":
      return tokens(a.fee0, a.fee1);
    case "Compound":
      return `${tokens(a.amount0, a.amount1)} added (liquidity +${formatAmount(big(a.liquidityAdded), 0)}) by ${shortAddress(String(a.caller))}`;
    case "Rebalance": {
      const opened = a.oldTickLower === 0 && a.oldTickUpper === 0;
      const range = opened
        ? `position opened at [${a.newTickLower}, ${a.newTickUpper})`
        : `[${a.oldTickLower}, ${a.oldTickUpper}) → [${a.newTickLower}, ${a.newTickUpper})`;
      return `${range}, TWAP tick ${a.twapTick}, LP NFT #${String(a.newPositionSerial)}, by ${shortAddress(String(a.caller))}`;
    }
    case "Initialized":
      return `share token ${shortAddress(String(a.shareToken))}`;
    default:
      return null;
  }
}

/** The vault's recent events from the Hedera mirror node, with amounts and HashScan links. */
export const ActivityFeed = ({ vault }: { vault: VaultState }) => {
  const { data: events, isLoading, error } = useVaultActivity(vault.address, vault.abi);

  return (
    <Card title="Activity" actions={<span className="text-xs text-base-content/55">Last {ACTIVITY_LIMIT} events</span>}>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-error">Could not load activity: {error.message}</p>
      ) : !events?.length ? (
        <p className="text-sm text-base-content/55">No activity yet</p>
      ) : (
        <div role="table" aria-label="Vault events" className="text-sm">
          <div
            role="row"
            className="hidden grid-cols-[9rem_1fr_13rem] gap-4 border-b border-base-300 pb-2 text-xs text-base-content/55 sm:grid"
          >
            <span role="columnheader">Event</span>
            <span role="columnheader">Details</span>
            <span role="columnheader" className="text-right">
              Time
            </span>
          </div>
          {events.map(event => (
            <div
              role="row"
              key={`${event.transactionHash}-${event.logIndex}`}
              className="grid grid-cols-1 gap-1 border-b border-base-300 py-2 last:border-b-0 sm:grid-cols-[9rem_1fr_13rem] sm:gap-4"
            >
              <span role="cell" className="font-medium">
                {LABELS[event.name] ?? event.name}
              </span>
              <span role="cell" className="tp-num min-w-0 break-words text-base-content/70">
                {describe(event, vault)}
              </span>
              <span role="cell" className="tp-num text-xs text-base-content/55 sm:text-right sm:text-sm">
                <ExternalLink href={hashscan.tx(event.transactionHash)}>
                  {new Date(event.timestamp * 1000).toLocaleString()}
                </ExternalLink>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
