"use client";

import { useVault } from "~~/hooks/tidepool/useVault";
import { type VaultEvent, useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { formatAgo, formatPriceSig, formatToken } from "~~/utils/tidepool/format";
import { tickToPrice } from "~~/utils/tidepool/math";
import { TIDEPOOL_VAULTS } from "~~/utils/tidepool/vaults";

const MAIN = TIDEPOOL_VAULTS.find(vault => vault.id === "main") ?? TIDEPOOL_VAULTS[0];

const big = (value: unknown) => (typeof value === "bigint" ? value : 0n);
const units = (value: bigint | undefined, decimals: number | undefined) =>
  value === undefined || decimals === undefined ? undefined : Number(value) / 10 ** decimals;

export type LandingData = ReturnType<typeof useLandingData>;

export type LandingEvent = { key: string; name: string; label: string; text: string; ago: string; tx: string };

const LABELS: Record<string, string> = {
  Deposit: "Deposit",
  Withdraw: "Withdraw",
  FeesCollected: "Fees",
  Compound: "Compound",
  Rebalance: "Rebalance",
  Initialized: "Initialize",
};

/** The main vault's live state and recent events, as the landing page shows them (read-only). */
export function useLandingData() {
  const vault = useVault(MAIN);
  const activity = useVaultActivity(vault.address, vault.abi);
  const { tickLower, tickUpper, spotTick, twapTick, decimals0, decimals1, symbol0, symbol1 } = vault;
  const ready =
    tickLower !== undefined &&
    tickUpper !== undefined &&
    spotTick !== undefined &&
    twapTick !== undefined &&
    decimals0 !== undefined &&
    decimals1 !== undefined;
  const price = (tick: number | undefined) =>
    ready && tick !== undefined ? tickToPrice(tick, decimals0!, decimals1!) : undefined;
  const s0 = symbol0 ?? "WHBAR";
  const s1 = symbol1 ?? "SAUCE";

  const spot = price(spotTick);
  const total0 = units(vault.total0, decimals0);
  const total1 = units(vault.total1, decimals1);
  const value1 =
    spot !== undefined && total0 !== undefined && total1 !== undefined ? total1 + total0 * spot : undefined;

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
  const lastOf = (name: string) => events.find(e => e.name === name)?.timestamp;

  const describe = (e: VaultEvent): string => {
    const a = e.args;
    const t0 = (v: unknown) => `${formatToken(units(big(v), decimals0))} ${s0}`;
    const t1 = (v: unknown) => `${formatToken(units(big(v), decimals1))} ${s1}`;
    switch (e.name) {
      case "Deposit":
        return `${t0(a.amount0)} + ${t1(a.amount1)} in, ${formatToken(units(big(a.shares), 8))} shares minted`;
      case "Withdraw":
        return `${formatToken(units(big(a.shares), 8))} shares burned for ${t0(a.amount0)} + ${t1(a.amount1)}`;
      case "FeesCollected":
        return `${t0(a.fee0)} + ${t1(a.fee1)} collected`;
      case "Compound":
        return `${t0(a.amount0)} + ${t1(a.amount1)} added to the position`;
      case "Rebalance": {
        const range = `${formatPriceSig(price(Number(a.newTickLower)))}–${formatPriceSig(price(Number(a.newTickUpper)))}`;
        return Number(a.oldTickLower) === 0 && Number(a.oldTickUpper) === 0
          ? `Position opened at ${range}`
          : `Range moved to ${range}`;
      }
      case "Initialized":
        return "Vault initialized, share token created";
      default:
        return e.name;
    }
  };

  const toRow = (e: VaultEvent): LandingEvent => ({
    key: `${e.transactionHash}-${e.logIndex}`,
    name: e.name,
    label: LABELS[e.name] ?? e.name,
    text: describe(e),
    ago: formatAgo(e.timestamp),
    tx: e.transactionHash,
  });

  return {
    ready,
    eventsLoading: activity.isLoading,
    eventsError: activity.isError,
    pair: `${s0} / ${s1}`,
    unit: `${s1} per ${s0}`,
    symbol0: s0,
    symbol1: s1,
    lower: price(tickLower),
    upper: price(tickUpper),
    spot,
    twap: price(twapTick),
    inRange: vault.inRange,
    hasPosition: vault.hasPosition,
    ticksApart: spotTick !== undefined && twapTick !== undefined ? Math.abs(spotTick - twapTick) : undefined,
    maxTicksApart: vault.maxTwapDeviation,
    twapWindow: vault.twapWindow,
    cooldown: vault.rebalanceCooldown,
    value1,
    fee0,
    fee1,
    lastCompound: lastOf("Compound"),
    lastRebalance: lastOf("Rebalance") ?? (vault.lastRebalance ? Number(vault.lastRebalance) : undefined),
    events: events.map(toRow),
  };
}
