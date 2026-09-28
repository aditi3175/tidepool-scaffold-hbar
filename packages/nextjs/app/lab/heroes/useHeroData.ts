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

export type HeroData = ReturnType<typeof useHeroData>;

/** Everything the hero mockups show, read live from the main vault (read-only). */
export function useHeroData() {
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

  const lower = price(tickLower);
  const upper = price(tickUpper);
  const spot = price(spotTick);
  const twap = price(twapTick);

  const total0 = units(vault.total0, decimals0);
  const total1 = units(vault.total1, decimals1);
  const value1 =
    spot !== undefined && total0 !== undefined && total1 !== undefined ? total1 + total0 * spot : undefined;
  const shares = units(vault.totalShares, 8);
  const sharePrice = value1 !== undefined && shares ? value1 / shares : undefined;

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
  const lastCompound = lastOf("Compound");
  const lastRebalance = lastOf("Rebalance") ?? (vault.lastRebalance ? Number(vault.lastRebalance) : undefined);

  const describe = (e: VaultEvent): string => {
    const a = e.args;
    switch (e.name) {
      case "Deposit":
        return `Deposit ${formatToken(units(big(a.amount0), decimals0))} ${symbol0 ?? ""} + ${formatToken(
          units(big(a.amount1), decimals1),
        )} ${symbol1 ?? ""}`;
      case "Withdraw":
        return `Withdraw ${formatToken(units(big(a.shares), 8))} shares`;
      case "FeesCollected":
        return `Fees ${formatToken(units(big(a.fee0), decimals0))} ${symbol0 ?? ""} + ${formatToken(
          units(big(a.fee1), decimals1),
        )} ${symbol1 ?? ""}`;
      case "Compound":
        return "Compound: fees back into the position";
      case "Rebalance":
        return Number(a.oldTickLower) === 0 && Number(a.oldTickUpper) === 0
          ? `Position opened ${formatPriceSig(price(Number(a.newTickLower)))}–${formatPriceSig(price(Number(a.newTickUpper)))}`
          : `Rebalance to ${formatPriceSig(price(Number(a.newTickLower)))}–${formatPriceSig(price(Number(a.newTickUpper)))}`;
      default:
        return e.name;
    }
  };

  return {
    ready,
    loadingEvents: activity.isLoading,
    pair: symbol0 && symbol1 ? `${symbol0} / ${symbol1}` : "WHBAR / SAUCE",
    unit: symbol0 && symbol1 ? `${symbol1} per ${symbol0}` : "SAUCE per WHBAR",
    symbol0: symbol0 ?? "WHBAR",
    symbol1: symbol1 ?? "SAUCE",
    feeTier: vault.fee !== undefined ? `${(vault.fee / 10_000).toFixed(2)}%` : "0.30%",
    lower,
    upper,
    spot,
    twap,
    inRange: vault.inRange,
    ticksApart: spotTick !== undefined && twapTick !== undefined ? Math.abs(spotTick - twapTick) : undefined,
    maxTicksApart: vault.maxTwapDeviation,
    value1,
    total0,
    total1,
    sharePrice,
    fee0,
    fee1,
    lastCompound,
    lastRebalance,
    ago: formatAgo,
    recent: events.slice(0, 8).map(e => ({
      key: `${e.transactionHash}-${e.logIndex}`,
      text: describe(e),
      name: e.name,
      ago: formatAgo(e.timestamp),
      tx: e.transactionHash,
    })),
  };
}
