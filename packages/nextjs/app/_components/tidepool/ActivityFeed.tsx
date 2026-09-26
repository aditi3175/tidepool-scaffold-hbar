import type { ReactNode } from "react";
import { ExternalLink, Panel, Skeleton } from "~~/app/_components/tidepool/ui";
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

  const fees = events?.filter(event => event.name === "FeesCollected") ?? [];
  const fee0 = fees.reduce((sum, event) => sum + (big(event.args.fee0) ?? 0n), 0n);
  const fee1 = fees.reduce((sum, event) => sum + (big(event.args.fee1) ?? 0n), 0n);

  return (
    <Panel
      title="Activity"
      subtitle={`The vault's last ${ACTIVITY_LIMIT} events, from the Hedera mirror node.`}
      actions={
        fees.length > 0 && (
          <div className="text-right text-xs">
            <div className="text-base-content/60">Fees collected in these events</div>
            <div className="font-mono">
              {formatAmount(fee0, vault.decimals0)} {vault.symbol0} + {formatAmount(fee1, vault.decimals1)}{" "}
              {vault.symbol1}
            </div>
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-error">Could not load activity: {error.message}</p>
      ) : !events?.length ? (
        <p className="text-sm text-base-content/70">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-base-300">
          {events.map(event => (
            <li
              key={`${event.transactionHash}-${event.logIndex}`}
              className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="w-32 shrink-0 font-medium">{LABELS[event.name] ?? event.name}</span>
              <span className="min-w-0 grow break-words font-mono text-xs text-base-content/80">
                {describe(event, vault)}
              </span>
              <ExternalLink className="shrink-0 text-xs text-base-content/60" href={hashscan.tx(event.transactionHash)}>
                {new Date(event.timestamp * 1000).toLocaleString()}
              </ExternalLink>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
