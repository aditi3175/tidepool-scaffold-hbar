import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  FlagIcon,
} from "@heroicons/react/20/solid";
import { Card, ExternalLink, Skeleton } from "~~/app/_components/tidepool/ui";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { ACTIVITY_LIMIT, type VaultEvent, useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { formatAgo, formatToken, formatTokenUnits } from "~~/utils/tidepool/format";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { shortAddress } from "~~/utils/tidepool/math";

const LABELS: Record<string, string> = {
  Initialized: "Vault initialized",
  Deposit: "Deposit",
  Withdraw: "Withdraw",
  FeesCollected: "Fees collected",
  Compound: "Compound",
  Rebalance: "Rebalance",
};

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Initialized: FlagIcon,
  Deposit: ArrowDownTrayIcon,
  Withdraw: ArrowUpTrayIcon,
  FeesCollected: BanknotesIcon,
  Compound: ArrowPathIcon,
  Rebalance: ArrowsRightLeftIcon,
};

const big = (value: unknown) => (typeof value === "bigint" ? value : undefined);

function describe(event: VaultEvent, vault: VaultState): ReactNode {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  const a = event.args;
  const tokens = (x: unknown, y: unknown) =>
    `${formatTokenUnits(big(x), decimals0)} ${symbol0 ?? ""} + ${formatTokenUnits(big(y), decimals1)} ${symbol1 ?? ""}`;
  switch (event.name) {
    case "Deposit":
      return `${tokens(a.amount0, a.amount1)} in, ${formatTokenUnits(big(a.shares), SHARE_DECIMALS)} shares to ${shortAddress(String(a.receiver))}`;
    case "Withdraw":
      return `${formatTokenUnits(big(a.shares), SHARE_DECIMALS)} shares burned, ${tokens(a.amount0, a.amount1)} to ${shortAddress(String(a.receiver))}`;
    case "FeesCollected":
      return tokens(a.fee0, a.fee1);
    case "Compound":
      return `${tokens(a.amount0, a.amount1)} added (liquidity +${formatToken(Number(big(a.liquidityAdded) ?? 0n), { compact: true })}) by ${shortAddress(String(a.caller))}`;
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
    <Card title="Activity" actions={<span className="text-xs text-faint">Last {ACTIVITY_LIMIT} events</span>}>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-danger">Could not load events from the mirror node: {error.message}</p>
      ) : !events?.length ? (
        <p className="text-sm text-muted">No events yet. Deposits, compounds and rebalances will appear here.</p>
      ) : (
        <div role="table" aria-label="Vault events" className="text-sm">
          <div
            role="row"
            className="hidden grid-cols-[10rem_1fr_8rem] gap-4 border-b border-white/[0.07] pb-2 text-xs text-faint sm:grid"
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
              className="grid grid-cols-1 gap-1 border-b border-white/[0.06] py-3 last:border-b-0 sm:grid-cols-[10rem_1fr_8rem] sm:gap-4"
            >
              <span role="cell" className="flex items-center gap-2 font-medium">
                {(() => {
                  const Icon = ICONS[event.name] ?? FlagIcon;
                  return <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />;
                })()}
                {LABELS[event.name] ?? event.name}
              </span>
              <span role="cell" className="min-w-0 break-words tabular-nums text-muted">
                {describe(event, vault)}
              </span>
              <span role="cell" className="text-xs text-faint sm:text-right sm:text-sm">
                <ExternalLink href={hashscan.tx(event.transactionHash)}>
                  <span title={new Date(event.timestamp * 1000).toLocaleString()}>{formatAgo(event.timestamp)}</span>
                </ExternalLink>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
