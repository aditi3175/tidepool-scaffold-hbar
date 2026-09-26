import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { AssociateButton } from "~~/app/_components/tidepool/AssociateButton";
import { ExternalLink, TxFeedback } from "~~/app/_components/tidepool/ui";
import { useScaffoldWriteContract, useTargetNetwork, useTransactor } from "~~/hooks/scaffold-hbar";
import { useHtsAccount } from "~~/hooks/tidepool/useHtsAccount";
import { useTxFeedback } from "~~/hooks/tidepool/useTxFeedback";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { useWalletGate } from "~~/hooks/tidepool/useWalletGate";
import {
  GAS,
  HTS_TOKEN_ABI,
  SAUCERSWAP_TESTNET_URL,
  SHARE_DECIMALS,
  WHBAR_HELPER,
  WHBAR_HELPER_ABI,
} from "~~/utils/tidepool/constants";
import { friendlyError } from "~~/utils/tidepool/errors";
import { formatAmount, safeParseUnits, withSlippage } from "~~/utils/tidepool/math";

/**
 * Shares deposit() would mint, using the contract's formula on getTotalAmounts(). The contract collects pending
 * fees first, which raises its totals slightly, so this is an upper estimate; the exact figure comes from
 * simulating deposit() once the approvals are in place.
 */
function estimateShares(vault: VaultState, amount0: bigint, amount1: bigint): bigint | undefined {
  const { totalShares: supply, total0, total1 } = vault;
  if (supply === undefined || total0 === undefined || total1 === undefined) return undefined;
  if (supply === 0n) return amount0 > 0n && amount1 > 0n ? 100n * 10n ** 8n - 100_000n : 0n; // INITIAL - DEAD shares
  if (total0 === 0n && total1 === 0n) return 0n;
  if (total0 === 0n) return (amount1 * supply) / total1;
  if (total1 === 0n) return (amount0 * supply) / total0;
  const s0 = (amount0 * supply) / total0;
  const s1 = (amount1 * supply) / total1;
  return s0 < s1 ? s0 : s1;
}

export const DepositCard = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const gate = useWalletGate();
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [input0, setInput0] = useState("");
  const [input1, setInput1] = useState("");
  const [wrapInput, setWrapInput] = useState("");

  const acc0 = useHtsAccount(vault.token0, vault.address);
  const acc1 = useHtsAccount(vault.token1, vault.address);
  const { writeContractAsync: writeToken } = useWriteContract();
  // deposit() is simulated before sending (the scaffold default): it mints no SaucerSwap position.
  const { writeContractAsync: writeVault } = useScaffoldWriteContract({ contractName: vault.config.contractName });
  const writeTx = useTransactor();
  const feedback = useTxFeedback(vault.abi);

  const { decimals0, decimals1, symbol0, symbol1, total0, total1, totalShares } = vault;
  const amount0 = decimals0 === undefined ? 0n : safeParseUnits(input0, decimals0);
  const amount1 = decimals1 === undefined ? 0n : safeParseUnits(input1, decimals1);
  const firstDeposit = totalShares === 0n;
  const needs0 = (acc0.allowance ?? 0n) < amount0;
  const needs1 = (acc1.allowance ?? 0n) < amount1;
  const approvalsInPlace = amount0 + amount1 > 0n && !needs0 && !needs1;

  // Exact preview: simulate deposit() (read-only eth_call) once the allowances cover the amounts.
  const exact = useQuery({
    queryKey: ["tidepool-deposit-preview", vault.address, gate.address, amount0.toString(), amount1.toString()],
    enabled: Boolean(publicClient && vault.address && gate.canTransact && approvalsInPlace),
    staleTime: 10_000,
    retry: false,
    queryFn: async () => {
      const { result } = await publicClient!.simulateContract({
        address: vault.address!,
        abi: vault.abi,
        functionName: "deposit",
        args: [amount0, amount1, 0n, gate.address!],
        account: gate.address,
      });
      return { shares: result[0], used0: result[1], used1: result[2] };
    },
  });
  const estimate = estimateShares(vault, amount0, amount1);

  if (decimals0 === undefined || decimals1 === undefined || !symbol0 || !symbol1) return null;

  const ratioKnown = !firstDeposit && total0 !== undefined && total1 !== undefined && total0 > 0n && total1 > 0n;
  // Deposits are taken in the vault's current ratio; fill the other side to match.
  const onInput0 = (value: string) => {
    setInput0(value);
    if (ratioKnown)
      setInput1(value ? formatUnits((safeParseUnits(value, decimals0) * total1!) / total0!, decimals1) : "");
  };
  const onInput1 = (value: string) => {
    setInput1(value);
    if (ratioKnown)
      setInput0(value ? formatUnits((safeParseUnits(value, decimals1) * total0!) / total1!, decimals0) : "");
  };

  const deviation =
    vault.spotTick !== undefined && vault.twapTick !== undefined
      ? Math.abs(vault.spotTick - vault.twapTick)
      : undefined;
  const priceBlocked =
    vault.twapUnavailable ||
    Boolean(vault.priceError) ||
    (deviation !== undefined && vault.maxTwapDeviation !== undefined && deviation > vault.maxTwapDeviation);

  const missing = [
    { token: vault.token0, symbol: symbol0, account: acc0 },
    { token: vault.token1, symbol: symbol1, account: acc1 },
    { token: vault.shareToken, symbol: vault.shareSymbol ?? "vault shares", account: user.shareAccount },
  ].filter(entry => entry.token && entry.account.isAssociated === false);

  const overBalance0 = acc0.balance !== undefined && amount0 > acc0.balance;
  const overBalance1 = acc1.balance !== undefined && amount1 > acc1.balance;
  const blockReason = !gate.canTransact
    ? gate.reason
    : vault.initialized === false
      ? "The vault is not initialized."
      : missing.length > 0
        ? "Associate the tokens above first."
        : priceBlocked
          ? "Deposits are paused while the pool price is away from its TWAP (see Position)."
          : amount0 + amount1 === 0n
            ? "Enter an amount."
            : firstDeposit && (amount0 === 0n || amount1 === 0n)
              ? "The first deposit needs both tokens."
              : overBalance0 || overBalance1
                ? `Not enough ${overBalance0 ? symbol0 : symbol1} in your wallet.`
                : estimate === 0n
                  ? "The amount is too small to mint any shares."
                  : undefined;

  const refresh = () => Promise.all([acc0.refetch(), acc1.refetch(), user.shareAccount.refetch(), vault.refetch()]);

  const approve = (token: `0x${string}`, amount: bigint, sent: (hash: `0x${string}`) => void) =>
    writeTx(() =>
      writeToken(
        {
          address: token,
          abi: HTS_TOKEN_ABI,
          functionName: "approve",
          args: [vault.address!, amount],
          gas: GAS.approve,
        },
        { onSuccess: sent },
      ),
    );

  const deposit = async () => {
    const steps = Number(needs0) + Number(needs1) + 1;
    let n = 0;
    const ok = await feedback.run("Deposit", async ({ step, sent }) => {
      if (needs0) {
        step(`Step ${++n} of ${steps}: approving ${symbol0} for the vault…`);
        if (!(await approve(vault.token0!, amount0, sent))) return undefined;
      }
      if (needs1) {
        step(`Step ${++n} of ${steps}: approving ${symbol1} for the vault…`);
        if (!(await approve(vault.token1!, amount1, sent))) return undefined;
      }
      step(`Step ${++n} of ${steps}: checking the exact share amount…`);
      let shares: bigint;
      try {
        const { result } = await publicClient!.simulateContract({
          address: vault.address!,
          abi: vault.abi,
          functionName: "deposit",
          args: [amount0, amount1, 0n, gate.address!],
          account: gate.address,
        });
        shares = result[0];
      } catch (error) {
        throw new Error(friendlyError(error, vault.abi).message);
      }
      step(`Step ${n} of ${steps}: depositing…`);
      return writeVault(
        {
          functionName: "deposit",
          args: [amount0, amount1, withSlippage(shares), gate.address!],
          gas: GAS.deposit,
        },
        { onSuccess: sent },
      );
    });
    if (ok) {
      setInput0("");
      setInput1("");
    }
    await refresh();
  };

  const wrapWeibar = safeParseUnits(wrapInput, 18);
  const wrap = async () => {
    const ok = await feedback.run("Wrap HBAR", ({ sent }) =>
      writeTx(() =>
        writeToken(
          {
            address: WHBAR_HELPER,
            abi: WHBAR_HELPER_ABI,
            functionName: "deposit",
            value: wrapWeibar, // weibar (18 decimals): the relay converts it to tinybar
            gas: GAS.wrap,
          },
          { onSuccess: sent },
        ),
      ),
    );
    if (ok) setWrapInput("");
    await refresh();
  };

  const whbarInPool = symbol0 === "WHBAR" || symbol1 === "WHBAR";
  const fields = [
    { symbol: symbol0, value: input0, onChange: onInput0, account: acc0, decimals: decimals0, over: overBalance0 },
    { symbol: symbol1, value: input1, onChange: onInput1, account: acc1, decimals: decimals1, over: overBalance1 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {missing.length > 0 && gate.canTransact && (
        <div className="rounded-box border border-warning/50 bg-warning/10 p-3 text-sm">
          <p className="mb-2">
            Hedera accounts must associate an HTS token before they can receive it. One transaction per token.
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.map(entry => (
              <AssociateButton
                key={entry.token}
                token={entry.token!}
                symbol={entry.symbol}
                disabled={feedback.busy}
                onDone={() => void entry.account.refetch()}
              />
            ))}
          </div>
        </div>
      )}

      {fields.map(field => (
        <label key={field.symbol} className="flex flex-col gap-1">
          <span className="flex justify-between text-xs text-base-content/70">
            <span>{field.symbol}</span>
            <span>
              Wallet: {field.account.balance === undefined ? "–" : formatAmount(field.account.balance, field.decimals)}
            </span>
          </span>
          <input
            className={`input input-bordered w-full font-mono ${field.over ? "input-error" : ""}`}
            inputMode="decimal"
            placeholder="0.0"
            value={field.value}
            disabled={feedback.busy}
            onChange={e => field.onChange(e.target.value.replace(",", "."))}
          />
        </label>
      ))}
      <p className="text-xs text-base-content/60">
        {firstDeposit
          ? "First deposit: both amounts are taken as entered and 99.999 shares are minted (0.001 are locked in the vault)."
          : "Deposits follow the vault's current token ratio, so the other amount fills in automatically."}
      </p>

      <div className="rounded-box bg-base-200 px-3 py-2 text-sm">
        {amount0 + amount1 === 0n ? (
          <span className="text-base-content/60">Enter an amount to preview shares.</span>
        ) : exact.data ? (
          <div className="flex flex-col gap-0.5">
            <span>
              You receive <span className="font-mono">{formatAmount(exact.data.shares, SHARE_DECIMALS)}</span> shares
              <span className="text-xs text-base-content/60"> (exact, simulated)</span>
            </span>
            <span className="text-xs text-base-content/60">
              Pulls {formatAmount(exact.data.used0, decimals0)} {symbol0} + {formatAmount(exact.data.used1, decimals1)}{" "}
              {symbol1}. Minimum accepted: {formatAmount(withSlippage(exact.data.shares), SHARE_DECIMALS)} shares (1%).
            </span>
          </div>
        ) : exact.error ? (
          <span className="text-error">{friendlyError(exact.error, vault.abi).message}</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span>
              About <span className="font-mono">{formatAmount(estimate, SHARE_DECIMALS)}</span> shares
              <span className="text-xs text-base-content/60"> (estimate)</span>
            </span>
            <span className="text-xs text-base-content/60">
              The exact amount is simulated after approval; the deposit accepts up to 1% fewer shares.
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={Boolean(blockReason) || feedback.busy}
        onClick={deposit}
      >
        {feedback.busy && <span className="loading loading-spinner loading-sm" />}
        {needs0 || needs1 ? "Approve & deposit" : "Deposit"}
      </button>
      {blockReason && !feedback.busy && <p className="-mt-2 text-xs text-base-content/60">{blockReason}</p>}
      <TxFeedback state={feedback.state} />

      <div className="flex flex-col gap-2 border-t border-base-300 pt-3 text-xs text-base-content/70">
        {whbarInPool && (
          <details>
            <summary className="cursor-pointer select-none">Need WHBAR? Wrap HBAR</summary>
            <div className="mt-2 flex items-end gap-2">
              <label className="flex grow flex-col gap-1">
                <span>HBAR to wrap (through SaucerSwap&apos;s WhbarHelper)</span>
                <input
                  className="input input-bordered input-sm w-full font-mono"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={wrapInput}
                  disabled={feedback.busy}
                  onChange={e => setWrapInput(e.target.value.replace(",", "."))}
                />
              </label>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!gate.canTransact || wrapWeibar === 0n || feedback.busy}
                onClick={wrap}
              >
                Wrap
              </button>
            </div>
          </details>
        )}
        <p>
          Need {symbol0 === "WHBAR" ? symbol1 : symbol0}? Swap for it on{" "}
          <ExternalLink href={SAUCERSWAP_TESTNET_URL}>SaucerSwap (testnet)</ExternalLink>. Tidepool does not swap for
          you.
        </p>
      </div>
    </div>
  );
};
