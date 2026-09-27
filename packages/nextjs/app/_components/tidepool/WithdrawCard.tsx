import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { TxRail } from "~~/app/_components/tidepool/TxRail";
import { TokenAmount, TxFeedback } from "~~/app/_components/tidepool/ui";
import { useScaffoldWriteContract, useTargetNetwork, useTransactor } from "~~/hooks/scaffold-hbar";
import { useTxFeedback } from "~~/hooks/tidepool/useTxFeedback";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { useWalletGate } from "~~/hooks/tidepool/useWalletGate";
import { GAS, HTS_TOKEN_ABI, SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { friendlyError } from "~~/utils/tidepool/errors";
import { formatAmount, safeParseUnits, withSlippage } from "~~/utils/tidepool/math";

export const WithdrawCard = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const gate = useWalletGate();
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [input, setInput] = useState("");
  const { writeContractAsync: writeToken } = useWriteContract();
  // withdraw() is simulated before sending (the scaffold default): it mints no SaucerSwap position.
  const { writeContractAsync: writeVault } = useScaffoldWriteContract({ contractName: vault.config.contractName });
  const writeTx = useTransactor();
  const feedback = useTxFeedback(vault.abi);

  const { totalShares, total0, total1, symbol0, symbol1, decimals0, decimals1 } = vault;
  const balance = user.shares;
  const amount = safeParseUnits(input, SHARE_DECIMALS);
  const needsApproval = (user.shareAccount.allowance ?? 0n) < amount;

  // Exact preview: simulate withdraw() (read-only eth_call) once the share allowance covers the amount.
  const exact = useQuery({
    queryKey: ["tidepool-withdraw-preview", vault.address, gate.address, amount.toString()],
    enabled: Boolean(publicClient && vault.address && gate.canTransact && amount > 0n && !needsApproval),
    staleTime: 10_000,
    retry: false,
    queryFn: async () => {
      const { result } = await publicClient!.simulateContract({
        address: vault.address!,
        abi: vault.abi,
        functionName: "withdraw",
        args: [amount, 0n, 0n, gate.address!],
        account: gate.address,
      });
      return { out0: result[0], out1: result[1] };
    },
  });

  if (decimals0 === undefined || decimals1 === undefined) return null;

  // Estimate: the pro-rata slice of getTotalAmounts(). The contract also pays out a share of any fees it
  // collects during the withdrawal, so the real amounts are usually a little higher.
  const est0 = totalShares && total0 !== undefined ? (total0 * amount) / totalShares : undefined;
  const est1 = totalShares && total1 !== undefined ? (total1 * amount) / totalShares : undefined;

  const blockReason = !gate.canTransact
    ? gate.reason
    : vault.initialized === false
      ? "The vault is not initialized."
      : balance === 0n
        ? "You have no shares in this vault."
        : amount === 0n
          ? "Enter a number of shares."
          : balance !== undefined && amount > balance
            ? "That is more than your share balance."
            : undefined;

  const withdraw = async () => {
    const ok = await feedback.run("Withdraw", async ({ step, sent }) => {
      const steps = needsApproval ? 2 : 1;
      if (needsApproval) {
        // The vault pulls the shares back into its HTS treasury before burning them.
        step(`Step 1 of 2: approving ${formatAmount(amount, SHARE_DECIMALS)} shares for the vault…`);
        const approved = await writeTx(() =>
          writeToken(
            {
              address: vault.shareToken!,
              abi: HTS_TOKEN_ABI,
              functionName: "approve",
              args: [vault.address!, amount],
              gas: GAS.approve,
            },
            { onSuccess: sent },
          ),
        );
        if (!approved) return undefined;
      }
      step(`Step ${steps} of ${steps}: checking the exact amounts…`);
      let out: readonly [bigint, bigint];
      try {
        const { result } = await publicClient!.simulateContract({
          address: vault.address!,
          abi: vault.abi,
          functionName: "withdraw",
          args: [amount, 0n, 0n, gate.address!],
          account: gate.address,
        });
        out = result;
      } catch (error) {
        throw new Error(friendlyError(error, vault.abi).message);
      }
      step(`Step ${steps} of ${steps}: withdrawing…`);
      return writeVault(
        {
          functionName: "withdraw",
          args: [amount, withSlippage(out[0]), withSlippage(out[1]), gate.address!],
          gas: GAS.withdraw,
        },
        { onSuccess: sent },
      );
    });
    if (ok) setInput("");
    await Promise.all([user.shareAccount.refetch(), vault.refetch()]);
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="tp-inset flex flex-col gap-2 px-4 py-3 transition-colors focus-within:border-primary/50">
        <span className="flex items-center justify-between text-[11px] text-base-content/45">
          <span className="tp-eyebrow">Shares to burn</span>
          <span className="tp-num">
            Balance {balance === undefined ? "–" : formatAmount(balance, SHARE_DECIMALS)}
            {user.percent !== undefined && ` · ${user.percent}%`}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <input
            className="tp-num w-full min-w-0 bg-transparent text-2xl text-base-content outline-none placeholder:text-base-content/20 disabled:opacity-50"
            inputMode="decimal"
            placeholder="0.0"
            aria-label="Shares to burn"
            value={input}
            disabled={feedback.busy}
            onChange={e => setInput(e.target.value.replace(",", "."))}
          />
          <button
            type="button"
            className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent transition-colors hover:bg-primary/20 disabled:opacity-40"
            disabled={!balance || feedback.busy}
            onClick={() => setInput(formatUnits(balance ?? 0n, SHARE_DECIMALS))}
          >
            Max
          </button>
        </span>
      </label>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
        {amount === 0n ? (
          <span className="text-base-content/45">Enter shares to preview what you receive.</span>
        ) : exact.data ? (
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-base-content/60">
              You receive <span className="text-xs text-base-content/40">exact, simulated</span>
            </span>
            <span className="flex flex-col gap-0.5 text-lg">
              <TokenAmount amount={formatAmount(exact.data.out0, decimals0)} symbol={symbol0} />
              <TokenAmount amount={formatAmount(exact.data.out1, decimals1)} symbol={symbol1} />
            </span>
            <span className="text-[11px] text-base-content/45">Minimums accepted: 1% below these amounts.</span>
          </div>
        ) : exact.error ? (
          <span className="text-error">{friendlyError(exact.error, vault.abi).message}</span>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-base-content/60">
              About <span className="text-xs text-base-content/40">estimate</span>
            </span>
            <span className="flex flex-col gap-0.5 text-lg">
              <TokenAmount amount={formatAmount(est0, decimals0)} symbol={symbol0} />
              <TokenAmount amount={formatAmount(est1, decimals1)} symbol={symbol1} />
            </span>
            <span className="text-[11px] leading-snug text-base-content/45">
              Pro-rata share of vault holdings, before uncollected fees. The exact amount is simulated after approval.
            </span>
          </div>
        )}
      </div>

      {amount > 0n && (
        <TxRail
          flow="Withdraw"
          state={feedback.state}
          steps={[
            { label: needsApproval ? "Approve shares" : "Shares approved", done: !needsApproval, match: "approving" },
            { label: "Withdraw", done: false, match: ["exact amounts", "withdrawing"] },
          ]}
        />
      )}
      <button
        type="button"
        className="btn btn-primary tp-cta h-12 w-full rounded-xl text-[15px] font-medium shadow-none"
        disabled={Boolean(blockReason) || feedback.busy}
        onClick={withdraw}
      >
        {feedback.busy && <span className="loading loading-spinner loading-sm" />}
        {needsApproval && amount > 0n ? "Approve & withdraw" : "Withdraw"}
      </button>
      {blockReason && !feedback.busy && <p className="-mt-1 text-center text-xs text-base-content/45">{blockReason}</p>}
      <TxFeedback state={feedback.state} />
      <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-base-content/50">
        Withdrawals skip the TWAP guard, so you can always exit. You receive {symbol0} and {symbol1} (WHBAR stays
        wrapped).
      </p>
    </div>
  );
};
