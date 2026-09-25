import { parseUnits } from "viem";

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

/** Share of the vault a holder owns, in percent. */
export function sharePercent(shares: bigint, totalShares: bigint): number {
  if (totalShares === 0n) return 0;
  return Number((shares * 1_000_000n) / totalShares) / 10_000;
}

/** parseUnits that returns 0n for empty or half-typed input ("", ".", "1.2.3") instead of throwing. */
export function safeParseUnits(value: string, decimals: number): bigint {
  try {
    return value ? parseUnits(value, decimals) : 0n;
  } catch {
    return 0n;
  }
}
