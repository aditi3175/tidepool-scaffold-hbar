/**
 * Display formatting for the UI: one rule per kind of number, so every value on the site reads the same way.
 * Full precision stays available for titles/tooltips via `formatFull`.
 */

const group = (digits: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** A price to 4 significant figures: 45.8653 -> "45.87", 0.021804 -> "0.02180", 1234.5 -> "1,235". */
export function formatPriceSig(price: number | undefined, significant = 4): string {
  if (price === undefined || !Number.isFinite(price)) return "–";
  if (price === 0) return "0";
  const magnitude = Math.floor(Math.log10(Math.abs(price)));
  const digits = Math.max(0, significant - 1 - magnitude);
  return group(digits).format(price);
}

/**
 * A token amount: 2 decimals at or above 1,000, 4 below (trailing zeros trimmed to 2), compact ("3.82K") when asked.
 * Amounts too small to show become "<0.0001".
 */
export function formatToken(amount: number | undefined, { compact = false }: { compact?: boolean } = {}): string {
  if (amount === undefined || !Number.isFinite(amount)) return "–";
  if (amount === 0) return "0";
  const abs = Math.abs(amount);
  if (compact && abs >= 10_000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(amount);
  }
  if (abs >= 1_000) return group(2).format(amount);
  if (abs < 0.0001) return "<0.0001";
  const text = group(4).format(amount);
  return text.replace(/(\.\d\d\d*?)0+$/, "$1");
}

/** A bigint token amount with its decimals, formatted by `formatToken`. */
export function formatTokenUnits(
  value: bigint | undefined,
  decimals: number | undefined,
  options?: { compact?: boolean },
): string {
  if (value === undefined || decimals === undefined) return "–";
  return formatToken(Number(value) / 10 ** decimals, options);
}

/** Every digit, for a title attribute or tooltip. */
export function formatFull(value: bigint | undefined, decimals: number | undefined): string {
  if (value === undefined || decimals === undefined) return "";
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = (abs / base).toLocaleString("en-US");
  const fraction = decimals > 0 ? (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

/** A percentage with sensible precision: 0.3 -> "0.30%", 12.345 -> "12.3%". */
export function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "–";
  return `${Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(1)}%`;
}

/** "3h ago", "2d ago", "just now" from a unix timestamp in seconds. */
export function formatAgo(timestamp: number | undefined, now = Date.now() / 1000): string {
  if (timestamp === undefined) return "–";
  const s = Math.max(0, now - timestamp);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
