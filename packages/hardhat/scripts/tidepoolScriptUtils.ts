/**
 * Shared helpers for the Tidepool testnet operator scripts (deposit, move-price, rebalance).
 * Nothing here sends a transaction.
 */
import { createInterface } from "readline/promises";

export const HEDERA_MAX_GAS = 15_000_000n; // per-transaction gas limit on Hedera
export const TINYBAR_TO_WEIBAR = 10_000_000_000n; // JSON-RPC value is 18 decimals, the EVM sees 8
const MIRROR_NODE = "https://testnet.mirrornode.hedera.com/api/v1";

export const hashscan = (hash: string) => `https://hashscan.io/testnet/transaction/${hash}`;

/** Reads a required environment variable or stops the script before anything is sent. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") throw new Error(`Set ${name} before running this script (nothing was sent).`);
  return value.trim();
}

/** Asks on the terminal; only an explicit "yes" continues. */
export async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

/** eth_estimateGas x 1.3, capped at Hedera's limit. Never guesses: a failed estimate stops the script. */
export async function gasLimitFor(label: string, estimate: Promise<bigint>): Promise<bigint> {
  let estimated: bigint;
  try {
    estimated = await estimate;
  } catch (error) {
    throw new Error(`${label}: eth_estimateGas failed, so nothing was sent. Cause: ${(error as Error).message}`);
  }
  const limit = (estimated * 130n) / 100n;
  const capped = limit > HEDERA_MAX_GAS ? HEDERA_MAX_GAS : limit;
  console.log(`${label}: estimated ${estimated} gas, sending with limit ${capped}`);
  return capped;
}

/**
 * Hedera ID ("0.0.N") for an EVM address. HTS facades may report a contract as its EVM address or as its
 * long-zero form (0x000...N), so ownership checks compare Hedera IDs, resolved through the mirror node.
 */
export async function hederaIdOf(address: string): Promise<string> {
  const hex = address.toLowerCase().replace(/^0x/, "");
  if (/^0{24}/.test(hex)) return `0.0.${BigInt("0x" + hex)}`;
  for (const kind of ["contracts", "accounts"]) {
    const res = await fetch(`${MIRROR_NODE}/${kind}/0x${hex}`);
    if (!res.ok) continue;
    const body = (await res.json()) as { contract_id?: string; account?: string };
    const id = body.contract_id ?? body.account;
    if (id) return id;
  }
  throw new Error(`Mirror node could not resolve ${address} to a Hedera ID`);
}

/** Largest multiple of `spacing` <= tick (matches RangeMath.floorToSpacing). */
export function floorToSpacing(tick: number, spacing: number): number {
  return Math.floor(tick / spacing) * spacing;
}

/** Range the vault will mint around `centerTick` (matches RangeMath.rangeAround, including the clamp). */
export function rangeAround(centerTick: number, spacing: number, halfWidth: number): [number, number] {
  const MAX_TICK = 887272;
  const maxUsable = Math.trunc(MAX_TICK / spacing) * spacing;
  const center = floorToSpacing(centerTick, spacing);
  return [Math.max(center - halfWidth, -maxUsable), Math.min(center + halfWidth, maxUsable)];
}

/** Tick for a sqrtPriceX96 (floor of log base 1.0001 of the price). Display only. */
export function tickAtSqrtPrice(sqrtPriceX96: bigint): number {
  return Math.floor(Math.log(Number(sqrtPriceX96) ** 2 / 2 ** 192) / Math.log(1.0001));
}
