"use client";

import { Arc, Label, Tile } from "~~/components/pulse";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { formatAgo, formatPriceSig, formatToken } from "~~/utils/tidepool/format";
import { tickToPrice } from "~~/utils/tidepool/math";

const big = (value: unknown) => (typeof value === "bigint" ? value : 0n);
const units = (value: bigint | undefined, decimals: number | undefined) =>
  value === undefined || decimals === undefined ? undefined : Number(value) / 10 ** decimals;

/**
 * The dashboard's live strip: spot, the TWAP guard, vault value, fees collected and the last rebalance. Read-only; the
 * activity query is shared with the Activity card (same key), so this adds no request.
 */
export const DashboardStats = ({ vault }: { vault: VaultState }) => {
  const activity = useVaultActivity(vault.address, vault.abi);
  const { spotTick, twapTick, decimals0, decimals1, symbol0, symbol1 } = vault;
  const spot =
    spotTick !== undefined && decimals0 !== undefined && decimals1 !== undefined
      ? tickToPrice(spotTick, decimals0, decimals1)
      : undefined;
  const total0 = units(vault.total0, decimals0);
  const total1 = units(vault.total1, decimals1);
  const value1 =
    spot !== undefined && total0 !== undefined && total1 !== undefined ? total1 + total0 * spot : undefined;
  const apart = spotTick !== undefined && twapTick !== undefined ? Math.abs(spotTick - twapTick) : undefined;

  const events = activity.data ?? [];
  const fees = events.filter(e => e.name === "FeesCollected");
  const fee0 = units(
    fees.reduce((sum, e) => sum + big(e.args.fee0), 0n),
    decimals0,
  );
  const fee1 = units(
    fees.reduce((sum, e) => sum + big(e.args.fee1), 0n),
    decimals1,
  );
  const lastRebalance =
    events.find(e => e.name === "Rebalance")?.timestamp ??
    (vault.lastRebalance ? Number(vault.lastRebalance) : undefined);
  const s0 = symbol0 ?? "";
  const s1 = symbol1 ?? "";
  const unit = symbol0 && symbol1 ? `${symbol1} per ${symbol0}` : " ";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Tile>
        <Label>Spot</Label>
        <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-fg">{formatPriceSig(spot)}</div>
        <div className="mt-1 truncate text-xs text-faint">{unit}</div>
      </Tile>
      <Tile>
        <Label>TWAP guard</Label>
        <div className="mt-2 flex items-end justify-between gap-2">
          <Arc value={apart} limit={vault.maxTwapDeviation} size={72} />
          <div className="font-mono text-sm tabular-nums text-fg">
            {apart ?? "–"}
            <span className="text-faint">/{vault.maxTwapDeviation ?? "–"}</span>
          </div>
        </div>
      </Tile>
      <Tile>
        <Label>Vault value</Label>
        <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-fg">
          {formatToken(value1, { compact: true })}
        </div>
        <div className="mt-1 text-xs text-faint">{s1 ? `${s1}, at spot` : " "}</div>
      </Tile>
      <Tile>
        <Label>Fees · last 50 events</Label>
        <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-neon">
          {activity.isLoading || fee1 === undefined ? "–" : `+${formatToken(fee1)}`}
        </div>
        <div className="mt-1 truncate text-xs text-faint">
          {s1}
          {fee0 ? ` + ${formatToken(fee0)} ${s0}` : ""}
        </div>
      </Tile>
      <Tile className="col-span-2 md:col-span-1">
        <Label>Last rebalance</Label>
        <div className="mt-3 font-mono text-2xl font-bold text-fg">{formatAgo(lastRebalance)}</div>
        <div className="mt-1 text-xs text-faint">re-centred on the TWAP</div>
      </Tile>
    </div>
  );
};
