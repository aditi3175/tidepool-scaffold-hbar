import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useBalance, usePublicClient } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { GAS, KEEPER_FEE_HEADROOM_TINYBARS, TINYBAR_TO_WEIBAR } from "~~/utils/tidepool/constants";
import { formatAmount, formatDuration } from "~~/utils/tidepool/math";

export type CheckStatus = "ok" | "warn" | "blocked" | "loading";

export type Check = {
  label: string;
  status: CheckStatus;
  detail: string;
};

export type ActionStatus = {
  checks: Check[];
  /** Every check is ok or warn (warnings do not block; the contract accepts the call). */
  ready: boolean;
  /** The first blocking or still-loading check, to explain a disabled button. */
  reason?: string;
};

function summarize(checks: Check[]): ActionStatus {
  const first = checks.find(check => check.status === "blocked" || check.status === "loading");
  return {
    checks,
    ready: !first,
    reason: first ? (first.status === "loading" ? `Checking: ${first.label}` : first.detail) : undefined,
  };
}

/** Chain time in seconds, extrapolated locally (1 s ticks, no RPC) from the latest block read. */
function useChainNow(chainTime: bigint | undefined, readAt: number | undefined): bigint | undefined {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (chainTime === undefined || readAt === undefined) return undefined;
  return chainTime + BigInt(Math.max(0, Math.floor((now - readAt) / 1000)));
}

/**
 * HBAR quotes for the keeper actions: SaucerSwap's position fee (quoteMintFee(), simulated with eth_call because
 * the exchange-rate system contract is declared non-view), the network gas price, and the caller's HBAR balance.
 */
export function useKeeperQuotes(vault: VaultState) {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });

  const fee = useQuery({
    queryKey: ["tidepool-mint-fee", vault.address],
    enabled: Boolean(publicClient && vault.address),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { result } = await publicClient!.simulateContract({
        address: vault.address!,
        abi: vault.abi,
        functionName: "quoteMintFee",
        account: address,
      });
      return result;
    },
  });

  const gasPrice = useQuery({
    queryKey: ["tidepool-gas-price", targetNetwork.id],
    enabled: Boolean(publicClient),
    refetchInterval: 60_000,
    queryFn: () => publicClient!.getGasPrice(),
  });

  const balance = useBalance({ address, chainId: targetNetwork.id, query: { enabled: Boolean(address) } });

  const feeTinybars = fee.data;
  /** msg.value in weibar: fee plus headroom; the vault refunds what SaucerSwap does not take. */
  const value =
    feeTinybars === undefined ? undefined : (feeTinybars + KEEPER_FEE_HEADROOM_TINYBARS) * TINYBAR_TO_WEIBAR;
  /** Upper bound on the gas cost in weibar: the fixed limit at the current gas price. */
  const maxGasCost = gasPrice.data === undefined ? undefined : GAS.keeper * gasPrice.data;

  return {
    feeTinybars,
    feeLoading: fee.isLoading,
    feeError: fee.error ? "Could not quote SaucerSwap's position fee." : undefined,
    value,
    maxGasCost,
    walletBalance: balance.data?.value,
    refetch: () => Promise.all([fee.refetch(), balance.refetch()]),
  };
}

export type KeeperQuotes = ReturnType<typeof useKeeperQuotes>;

/**
 * Mirrors the preconditions TidepoolVault checks in compound() and rebalance(), using data already read:
 * initialized, TWAP available, |spot - TWAP| <= maxTwapDeviation, the position-fee quote, and for rebalance
 * a position, the cooldown (against chain time) and a TWAP tick outside [tickLower, tickUpper). compound() on an
 * existing position needs the TWAP tick inside the range (OutOfRange otherwise).
 * compound()'s NothingToCompound depends on fees the pool has not credited yet, so it is a warning, not a block.
 */
export function useKeeperStatus(vault: VaultState, quotes: KeeperQuotes) {
  const chainNow = useChainNow(vault.chainTime, vault.chainTimeReadAt);
  const { symbol0, symbol1, decimals0, decimals1 } = vault;

  const initialized: Check =
    vault.initialized === undefined
      ? { label: "Vault initialized", status: "loading", detail: "" }
      : vault.initialized
        ? { label: "Vault initialized", status: "ok", detail: "Share token created." }
        : { label: "Vault initialized", status: "blocked", detail: "The deployer has not called initialize() yet." };

  let priceGuard: Check;
  if (vault.twapUnavailable) {
    priceGuard = {
      label: "TWAP available",
      status: "blocked",
      detail: "The pool's observation history is shorter than the TWAP window (TwapUnavailable).",
    };
  } else if (vault.priceError) {
    priceGuard = {
      label: "Price guard",
      status: "blocked",
      detail: `Could not read the pool price: ${vault.priceError}`,
    };
  } else if (vault.spotTick === undefined || vault.twapTick === undefined || vault.maxTwapDeviation === undefined) {
    priceGuard = { label: "Price guard", status: "loading", detail: "" };
  } else {
    const deviation = Math.abs(vault.spotTick - vault.twapTick);
    priceGuard =
      deviation <= vault.maxTwapDeviation
        ? {
            label: "Price guard",
            status: "ok",
            detail: `Spot is ${deviation} ticks from the TWAP (limit ${vault.maxTwapDeviation}).`,
          }
        : {
            label: "Price guard",
            status: "blocked",
            detail: `Spot is ${deviation} ticks from the TWAP; the limit is ${vault.maxTwapDeviation} (PriceDeviation). Wait for the TWAP to catch up.`,
          };
  }

  const feeCheck: Check = quotes.feeError
    ? { label: "Position fee quoted", status: "blocked", detail: quotes.feeError }
    : quotes.feeTinybars === undefined
      ? { label: "Position fee quoted", status: "loading", detail: "" }
      : {
          label: "Position fee quoted",
          status: "ok",
          detail: `${formatAmount(quotes.feeTinybars, 8)} HBAR, plus 0.1 HBAR headroom that the vault refunds.`,
        };

  // compound()
  let supply: Check;
  if (vault.hasPosition === undefined) {
    supply = { label: "Tokens to add", status: "loading", detail: "" };
  } else if (!vault.hasPosition) {
    const hasTokens = (vault.total0 ?? 0n) > 0n || (vault.total1 ?? 0n) > 0n;
    supply = hasTokens
      ? {
          label: "Tokens to open a position",
          status: "ok",
          detail: `No position yet: compound opens one centred on the TWAP with ${formatAmount(vault.total0, decimals0)} ${symbol0} + ${formatAmount(vault.total1, decimals1)} ${symbol1}.`,
        }
      : {
          label: "Tokens to open a position",
          status: vault.total0 === undefined ? "loading" : "blocked",
          detail: "The vault holds no tokens yet. Deposit first.",
        };
  } else if (vault.idle0 === undefined || vault.idle1 === undefined) {
    supply = { label: "Tokens to add", status: "loading", detail: "" };
  } else if (vault.idle0 > 0n || vault.idle1 > 0n) {
    supply = {
      label: "Tokens to add",
      status: "ok",
      detail: `Idle ${formatAmount(vault.idle0, decimals0)} ${symbol0} + ${formatAmount(vault.idle1, decimals1)} ${symbol1}, plus any fees collected.`,
    };
  } else if ((vault.tokensOwed0 ?? 0n) > 0n || (vault.tokensOwed1 ?? 0n) > 0n) {
    supply = { label: "Tokens to add", status: "ok", detail: "The position has fees credited to collect." };
  } else {
    supply = {
      label: "Tokens to add",
      status: "warn",
      detail:
        "No idle tokens. Compound succeeds only if the position earned fees since the last collection; otherwise it reverts with NothingToCompound and only gas is charged.",
    };
  }
  // Same order as the contract: price checks, then the range (OutOfRange), then the tokens to add.
  const compoundChecks: Check[] = [initialized, priceGuard];
  if (
    vault.hasPosition &&
    vault.twapTick !== undefined &&
    vault.tickLower !== undefined &&
    vault.tickUpper !== undefined
  ) {
    const inRange = vault.twapTick >= vault.tickLower && vault.twapTick < vault.tickUpper;
    compoundChecks.push(
      inRange
        ? {
            label: "TWAP inside range",
            status: "ok",
            detail: `TWAP tick ${vault.twapTick} is inside [${vault.tickLower}, ${vault.tickUpper}).`,
          }
        : { label: "TWAP inside range", status: "blocked", detail: "Price left the range — use Rebalance" },
    );
  }
  compoundChecks.push(supply, feeCheck);

  // rebalance()
  const positionCheck: Check =
    vault.hasPosition === undefined
      ? { label: "Position exists", status: "loading", detail: "" }
      : vault.hasPosition
        ? { label: "Position exists", status: "ok", detail: `LP NFT #${vault.positionSerial}.` }
        : { label: "Position exists", status: "blocked", detail: "No position yet (NoPosition). Compound opens one." };

  const readyAt =
    vault.lastRebalance !== undefined && vault.rebalanceCooldown !== undefined
      ? vault.lastRebalance + BigInt(vault.rebalanceCooldown)
      : undefined;
  const cooldownRemaining = readyAt !== undefined && chainNow !== undefined ? readyAt - chainNow : undefined;
  const cooldownCheck: Check =
    cooldownRemaining === undefined
      ? { label: "Cooldown over", status: "loading", detail: "" }
      : cooldownRemaining <= 0n
        ? { label: "Cooldown over", status: "ok", detail: "The cooldown since the last range change has passed." }
        : {
            label: "Cooldown over",
            status: "blocked",
            detail: `Cooldown ends in ${formatDuration(cooldownRemaining)} (chain time, ${new Date(Number(readyAt) * 1000).toLocaleTimeString()}).`,
          };

  let rangeCheck: Check;
  if (vault.twapTick === undefined || vault.tickLower === undefined || vault.tickUpper === undefined) {
    rangeCheck = {
      label: "TWAP outside range",
      status: vault.twapUnavailable || vault.priceError ? "blocked" : "loading",
      detail: "The TWAP could not be read.",
    };
  } else if (!vault.hasPosition) {
    rangeCheck = { label: "TWAP outside range", status: "blocked", detail: "There is no range yet." };
  } else if (vault.twapTick >= vault.tickLower && vault.twapTick < vault.tickUpper) {
    rangeCheck = {
      label: "TWAP outside range",
      status: "blocked",
      detail: `TWAP tick ${vault.twapTick} is inside [${vault.tickLower}, ${vault.tickUpper}); the position is still in range (StillInRange).`,
    };
  } else {
    rangeCheck = {
      label: "TWAP outside range",
      status: "ok",
      detail: `TWAP tick ${vault.twapTick} is outside [${vault.tickLower}, ${vault.tickUpper}).`,
    };
  }

  // Same order as the contract: position, cooldown, then the price checks.
  const rebalanceChecks: Check[] = [initialized, positionCheck, cooldownCheck, priceGuard, rangeCheck, feeCheck];

  return {
    compound: summarize(compoundChecks),
    rebalance: summarize(rebalanceChecks),
    cooldownReadyAt: readyAt,
    cooldownRemaining,
  };
}
