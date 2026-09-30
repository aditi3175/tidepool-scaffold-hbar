"use client";

import type { CSSProperties } from "react";
import { Arc, Label, Tile } from "~~/components/pulse";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { formatAgo, formatPriceSig, formatToken } from "~~/utils/tidepool/format";
import { tickToPrice } from "~~/utils/tidepool/math";

const big = (value: unknown) => (typeof value === "bigint" ? value : 0n);
const units = (value: bigint | undefined, decimals: number | undefined) =>
  value === undefined || decimals === undefined ? undefined : Number(value) / 10 ** decimals;
/** Two decimals, like the other figures on the page. */
const twoDp = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value)
    ? "–"
    : value >= 10_000
      ? formatToken(value, { compact: true })
      : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Value and note placeholders, the same height as the real lines, while the event history loads. */
const HistoryLoading = () => (
  <>
    <div className="mt-3 flex h-8 items-center">
      <span className="tp-shimmer block h-6 w-24 rounded" aria-hidden />
    </div>
    <div className="mt-1 flex h-4 items-center">
      <span className="tp-shimmer block h-2.5 w-32 max-w-full rounded" aria-hidden />
    </div>
  </>
);

/**
 * The dashboard's live strip: spot, the TWAP guard, vault value, fees collected and the last rebalance. Read-only; the
 * activity query is shared with the Activity card (same key), so this adds no request.
 */
export const DashboardStats = ({ vault }: { vault: VaultState }) => {
  const activity = useVaultActivity(vault.address, vault.abi);
  const { spotTick, twapTick, tickLower, tickUpper, decimals0, decimals1, symbol0, symbol1 } = vault;
  const spot =
    spotTick !== undefined && decimals0 !== undefined && decimals1 !== undefined
      ? tickToPrice(spotTick, decimals0, decimals1)
      : undefined;
  const twap =
    twapTick !== undefined && decimals0 !== undefined && decimals1 !== undefined
      ? tickToPrice(twapTick, decimals0, decimals1)
      : undefined;
  const total0 = units(vault.total0, decimals0);
  const total1 = units(vault.total1, decimals1);
  const value1 =
    spot !== undefined && total0 !== undefined && total1 !== undefined ? total1 + total0 * spot : undefined;
  const apart = spotTick !== undefined && twapTick !== undefined ? Math.abs(spotTick - twapTick) : undefined;
  const guardOk =
    apart !== undefined && vault.maxTwapDeviation !== undefined ? apart <= vault.maxTwapDeviation : undefined;

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
  const s0 = symbol0 ?? "";
  const s1 = symbol1 ?? "";
  // Lead with a token that actually earned; show the other only when it is non-zero.
  const feeParts = [
    { amount: fee1, symbol: s1 },
    { amount: fee0, symbol: s0 },
  ].filter(f => f.amount);
  const feeLead = feeParts[0];
  const feeRest = feeParts[1];

  // The first compound emits Rebalance with old ticks 0: that opened the position rather than re-centring it.
  const lastEvent = events.find(e => e.name === "Rebalance");
  const opened =
    lastEvent !== undefined &&
    Number(lastEvent.args.oldTickLower ?? 0) === 0 &&
    Number(lastEvent.args.oldTickUpper ?? 0) === 0;
  const lastRebalance = lastEvent?.timestamp ?? (vault.lastRebalance ? Number(vault.lastRebalance) : undefined);

  // Same conditions as rebalance(): a position, TWAP outside the range, the cooldown over and the guard clear.
  const outOfRange =
    vault.hasPosition && twapTick !== undefined && tickLower !== undefined && tickUpper !== undefined
      ? twapTick < tickLower || twapTick >= tickUpper
      : false;
  const cooldownOver =
    vault.lastRebalance !== undefined && vault.rebalanceCooldown !== undefined && vault.chainTime !== undefined
      ? vault.chainTime >= vault.lastRebalance + BigInt(vault.rebalanceCooldown)
      : undefined;
  const rebalanceNote = !outOfRange
    ? opened
      ? "position opened, not re-centred since"
      : "re-centred on the TWAP"
    : cooldownOver && guardOk
      ? "Out of range · anyone can rebalance"
      : cooldownOver === false
        ? "Out of range · cooldown running"
        : guardOk === false
          ? "Out of range · waiting for the guard"
          : "Out of range";

  const unit = symbol0 && symbol1 ? `${symbol1} per ${symbol0}` : " ";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Tile className="tp-in tp-lift" style={{ "--d": 0 } as CSSProperties}>
        <Label>Spot</Label>
        <div className="mt-3 text-2xl font-bold tabular-nums tracking-[-0.02em] text-fg">{formatPriceSig(spot)}</div>
        <div className="mt-1 truncate text-xs text-faint">
          TWAP {formatPriceSig(twap)} · {unit}
        </div>
      </Tile>
      <Tile className="tp-in tp-lift" style={{ "--d": 70 } as CSSProperties}>
        <Label>TWAP guard</Label>
        <div className="mt-2 flex items-end justify-between gap-2">
          <Arc value={apart} limit={vault.maxTwapDeviation} size={72} />
          <div className="text-right">
            <div
              className={`text-sm font-semibold ${guardOk === undefined ? "text-faint" : guardOk ? "text-neon" : "text-amber"}`}
            >
              {guardOk === undefined ? "–" : guardOk ? "Clear" : "Paused"}
            </div>
            <div className="mt-0.5 font-mono text-xs tabular-nums text-fg">
              {apart ?? "–"}
              <span className="text-faint">/{vault.maxTwapDeviation ?? "–"}</span>
            </div>
          </div>
        </div>
        <div className="mt-1 truncate text-xs text-faint">
          {guardOk === false ? "spot too far from TWAP; deposits wait" : "spot vs TWAP, in ticks"}
        </div>
      </Tile>
      <Tile className="tp-in tp-lift" style={{ "--d": 140 } as CSSProperties}>
        <Label>Vault value</Label>
        <div className="mt-3 text-2xl font-bold tabular-nums tracking-[-0.02em] text-fg">{twoDp(value1)}</div>
        <div className="mt-1 text-xs text-faint">{s1 ? `${s1}, at spot` : " "}</div>
      </Tile>
      <Tile className="tp-in tp-lift" style={{ "--d": 210 } as CSSProperties}>
        <Label>Fees · last 50 events</Label>
        {activity.isLoading ? (
          <HistoryLoading />
        ) : (
          <>
            <div className="mt-3 text-2xl font-bold tabular-nums tracking-[-0.02em] text-neon">
              {activity.isLoading || fee0 === undefined || fee1 === undefined
                ? "–"
                : feeLead
                  ? `+${formatToken(feeLead.amount)}`
                  : "0"}
            </div>
            <div className="mt-1 truncate text-xs text-faint">
              {activity.isLoading
                ? " "
                : feeLead
                  ? `${feeLead.symbol}${feeRest ? ` + ${formatToken(feeRest.amount)} ${feeRest.symbol}` : ""}`
                  : "none collected yet"}
            </div>
          </>
        )}
      </Tile>
      <Tile className="tp-in tp-lift col-span-2 md:col-span-1" style={{ "--d": 280 } as CSSProperties}>
        {activity.isLoading ? (
          <>
            <Label>Last rebalance</Label>
            <HistoryLoading />
          </>
        ) : (
          <>
            <Label>{opened ? "Position opened" : "Last rebalance"}</Label>
            <div className="mt-3 text-2xl font-bold tracking-[-0.02em] text-fg">{formatAgo(lastRebalance)}</div>
            <div className={`mt-1 text-xs leading-snug ${outOfRange ? "text-amber" : "text-faint"}`}>
              {rebalanceNote}
            </div>
          </>
        )}
      </Tile>
    </div>
  );
};
