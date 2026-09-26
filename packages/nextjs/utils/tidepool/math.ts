import { formatUnits, parseUnits } from "viem";
import { SLIPPAGE_BPS } from "~~/utils/tidepool/constants";

/**
 * Human price of token0 in token1 at a tick: 1.0001^tick scaled by the decimal difference.
 * Floating point is fine here: it is only used for display, never for amounts sent on-chain.
 */
export function tickToPrice(tick: number, decimals0: number, decimals1: number): number {
  return Math.pow(1.0001, tick) * Math.pow(10, decimals0 - decimals1);
}

export function formatPrice(price: number): string {
  if (price === 0) return "0";
  if (price >= 1000) return price.toFixed(0);
  if (price >= 1) return price.toFixed(4);
  return price.toPrecision(4);
}

/** Token amount for display: thousands separators and at most `maxFraction` decimals (truncated, not rounded). */
export function formatAmount(value: bigint | undefined, decimals: number | undefined, maxFraction = 6): string {
  if (value === undefined || decimals === undefined) return "–";
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = fraction.slice(0, maxFraction).replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

/** Share of the vault a holder owns, in percent. */
export function sharePercent(shares: bigint, totalShares: bigint): number {
  if (totalShares === 0n) return 0;
  return Number((shares * 1_000_000n) / totalShares) / 10_000;
}

/** The minimum accepted for a previewed amount (SLIPPAGE_BPS below it). */
export function withSlippage(amount: bigint): bigint {
  return (amount * (10_000n - SLIPPAGE_BPS)) / 10_000n;
}

/** parseUnits that returns 0n for empty or half-typed input ("", ".", "1.2.3") instead of throwing. */
export function safeParseUnits(value: string, decimals: number): bigint {
  try {
    return value ? parseUnits(value, decimals) : 0n;
  } catch {
    return 0n;
  }
}

/**
 * Hedera entity ID (0.0.N) for a long-zero EVM address, as HTS tokens have. Contracts deployed through
 * the EVM have a different address, so this returns undefined for them.
 */
export function entityIdFromAddress(address: string | undefined): string | undefined {
  if (!address || !/^0x0{24}[0-9a-fA-F]{16}$/.test(address)) return undefined;
  return `0.0.${BigInt(address)}`;
}

export function shortAddress(address: string | undefined): string {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "–";
}

/** "12m 05s" style countdown. */
export function formatDuration(seconds: bigint | number): string {
  const total = Math.max(0, Number(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
