import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { TxFeedback } from "~~/app/_components/tidepool/ui";
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
      <label className="flex flex-col gap-1">
        <span className="flex justify-between text-xs text-base-content/70">
          <span>Shares to burn</span>
          <span>
            Balance: {balance === undefined ? "–" : formatAmount(balance, SHARE_DECIMALS)}
            {user.percent !== undefined && ` (${user.percent}%)`}
          </span>
        </span>
        <div className="join w-full">
          <input
            className="input input-bordered join-item w-full font-mono"
            inputMode="decimal"
            placeholder="0.0"
            value={input}
            disabled={feedback.busy}
            onChange={e => setInput(e.target.value.replace(",", "."))}
          />
          <button
            type="button"
            className="btn join-item"
            disabled={!balance || feedback.busy}
            onClick={() => setInput(formatUnits(balance ?? 0n, SHARE_DECIMALS))}
          >
            Max
          </button>
        </div>
      </label>

      <div className="rounded-box bg-base-200 px-3 py-2 text-sm">
        {amount === 0n ? (
          <span className="text-base-content/60">Enter shares to preview what you receive.</span>
        ) : exact.data ? (
          <div className="flex flex-col gap-0.5">
            <span>
              You receive <span className="font-mono">{formatAmount(exact.data.out0, decimals0)}</span> {symbol0} +{" "}
              <span className="font-mono">{formatAmount(exact.data.out1, decimals1)}</span> {symbol1}
              <span className="text-xs text-base-content/60"> (exact, simulated)</span>
            </span>
            <span className="text-xs text-base-content/60">Minimums accepted: 1% below these amounts.</span>
          </div>
        ) : exact.error ? (
          <span className="text-error">{friendlyError(exact.error, vault.abi).message}</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span>
              About <span className="font-mono">{formatAmount(est0, decimals0)}</span> {symbol0} +{" "}
              <span className="font-mono">{formatAmount(est1, decimals1)}</span> {symbol1}
              <span className="text-xs text-base-content/60"> (estimate)</span>
            </span>
            <span className="text-xs text-base-content/60">
              Pro-rata share of vault holdings, before uncollected fees. The exact amount is simulated after approval.
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={Boolean(blockReason) || feedback.busy}
        onClick={withdraw}
      >
        {feedback.busy && <span className="loading loading-spinner loading-sm" />}
        {needsApproval && amount > 0n ? "Approve & withdraw" : "Withdraw"}
      </button>
      {blockReason && !feedback.busy && <p className="-mt-2 text-xs text-base-content/60">{blockReason}</p>}
      <TxFeedback state={feedback.state} />
      <p className="border-t border-base-300 pt-3 text-xs text-base-content/60">
        Withdrawals skip the TWAP guard, so you can always exit. You receive {symbol0} and {symbol1} (WHBAR stays
        wrapped).
      </p>
    </div>
  );
};
