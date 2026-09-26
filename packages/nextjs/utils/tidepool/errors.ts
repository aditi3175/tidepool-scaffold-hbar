import { type Abi, BaseError, ContractFunctionRevertedError, type Hex, decodeErrorResult, formatUnits } from "viem";

/**
 * Plain-language messages for TidepoolVault's custom errors. Each entry receives the decoded error arguments,
 * in the order the Solidity error declares them.
 */
const MESSAGES: Record<string, (args: readonly unknown[]) => string> = {
  PriceDeviation: ([spotTick, twapTick]) =>
    `The pool's spot price (tick ${spotTick}) is too far from its time-weighted average (tick ${twapTick}). ` +
    "The vault pauses deposits, compounds and rebalances until the two converge; withdrawals still work. Try again shortly.",
  StillInRange: ([twapTick]) =>
    `The time-weighted price (tick ${twapTick}) is still inside the position's range, so there is nothing to rebalance.`,
  CooldownActive: ([readyAt]) =>
    `The rebalance cooldown is still running. It ends at ${formatTimestamp(readyAt)} (chain time).`,
  TwapUnavailable: () =>
    "The pool's price history is shorter than the vault's TWAP window, so the vault will not act until it grows.",
  NothingToCompound: () =>
    "There is nothing to compound: the vault holds no idle tokens and the position had no fees to collect.",
  InsufficientFee: ([required, provided]) =>
    `The HBAR sent (${tinybars(provided)}) does not cover SaucerSwap's position fee (${tinybars(required)}). ` +
    "Refresh the fee quote and try again.",
  SlippageExceeded: () =>
    "The result fell outside the 1% tolerance because the vault or pool changed after the preview. Refresh and try again.",
  ZeroShares: () => "The amount is too small to mint or burn any shares. The first deposit needs both tokens.",
  NoPosition: () => "The vault has no liquidity position yet. Open one with Compound first.",
  NotInitialized: () => "This vault has not been initialized by its deployer yet.",
  SafeERC20FailedOperation: () =>
    "A token transfer failed. Check your balance and approval, and that the token is associated with your account.",
  HtsCallFailed: ([responseCode]) =>
    `A Hedera Token Service call failed (response code ${responseCode}). Check token associations and balances.`,
  RefundFailed: () => "The vault could not refund the unused HBAR to the caller.",
};

export type FriendlyError = {
  /** The user rejected the request in their wallet: not an error, nothing was sent. */
  cancelled: boolean;
  message: string;
  /** The decoded custom error name, when there is one. */
  errorName?: string;
};

export const CANCELLED_MESSAGE = "Transaction cancelled";

function tinybars(value: unknown): string {
  return typeof value === "bigint" ? `${formatUnits(value, 8)} HBAR` : "?";
}

function formatTimestamp(value: unknown): string {
  return typeof value === "bigint" ? new Date(Number(value) * 1000).toLocaleString() : "?";
}

/** Message for a decoded custom error, or undefined when the error is not one of the vault's. */
export function customErrorMessage(errorName: string, args: readonly unknown[] = []): string | undefined {
  return MESSAGES[errorName]?.(args);
}

/** Wallet rejections (EIP-1193 code 4001, or the equivalent wording from wallets that do not set a code). */
export function isUserRejection(error: unknown): boolean {
  const matches = (e: unknown) => {
    const candidate = e as { code?: unknown; name?: unknown; message?: unknown } | null;
    if (!candidate) return false;
    if (candidate.code === 4001 || candidate.code === "ACTION_REJECTED") return true;
    if (candidate.name === "UserRejectedRequestError") return true;
    return (
      typeof candidate.message === "string" && /user (rejected|denied)|rejected the request/i.test(candidate.message)
    );
  };
  if (error instanceof BaseError) return Boolean(error.walk(matches));
  return matches(error);
}

/** Decodes raw revert data (for example from the mirror node) against an ABI. */
export function decodeRevert(data: Hex, abi: Abi): { errorName: string; args: readonly unknown[] } | undefined {
  try {
    const decoded = decodeErrorResult({ abi, data });
    return { errorName: decoded.errorName, args: (decoded.args ?? []) as readonly unknown[] };
  } catch {
    return undefined;
  }
}

function findCustomError(error: unknown, abi?: Abi): { errorName: string; args: readonly unknown[] } | undefined {
  if (!(error instanceof BaseError)) return undefined;
  const reverted = error.walk(e => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
  if (reverted?.data?.errorName && reverted.data.errorName !== "Error") {
    return { errorName: reverted.data.errorName, args: (reverted.data.args ?? []) as readonly unknown[] };
  }
  if (!abi) return undefined;
  // Revert data that viem could not decode against the ABI it had (for example a raw eth_call error).
  const withData = error.walk(e => typeof (e as { data?: unknown }).data === "string") as { data?: string } | null;
  const data = withData?.data;
  return data && /^0x[0-9a-fA-F]{8}/.test(data) ? decodeRevert(data as Hex, abi) : undefined;
}

/** Turns any wallet, RPC or contract error into a short message suitable for the UI. */
export function friendlyError(error: unknown, abi?: Abi): FriendlyError {
  if (isUserRejection(error)) return { cancelled: true, message: CANCELLED_MESSAGE };

  const custom = findCustomError(error, abi);
  if (custom) {
    return {
      cancelled: false,
      errorName: custom.errorName,
      message:
        customErrorMessage(custom.errorName, custom.args) ??
        `The contract rejected the transaction (${custom.errorName}).`,
    };
  }

  if (error instanceof BaseError) return { cancelled: false, message: error.shortMessage || error.message };
  if (error instanceof Error) return { cancelled: false, message: error.message };
  return { cancelled: false, message: "Something went wrong." };
}
