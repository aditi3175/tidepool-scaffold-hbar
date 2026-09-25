import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useScaffoldWriteContract, useTransactor } from "~~/hooks/scaffold-hbar";
import { useHtsAccount } from "~~/hooks/tidepool/useHtsAccount";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { HTS_TOKEN_ABI } from "~~/utils/tidepool/constants";
import { safeParseUnits, sharePercent } from "~~/utils/tidepool/math";

const SHARE_DECIMALS = 8;
const SLIPPAGE_BPS = 100n;

export const WithdrawCard = ({ vault }: { vault: VaultState }) => {
  const { address } = useAccount();
  const [input, setInput] = useState("");
  const shares = useHtsAccount(vault.shareToken, vault.address);
  const { writeContractAsync: writeToken, isPending: approving } = useWriteContract();
  const { writeContractAsync: writeVault, isPending } = useScaffoldWriteContract({ contractName: "TidepoolVault" });
  const writeTx = useTransactor();

  const { totalShares, total0, total1, symbol0, symbol1, decimals0, decimals1 } = vault;
  if (
    !totalShares ||
    total0 === undefined ||
    total1 === undefined ||
    decimals0 === undefined ||
    decimals1 === undefined
  )
    return null;

  const amount = safeParseUnits(input, SHARE_DECIMALS);
  const out0 = (total0 * amount) / totalShares;
  const out1 = (total1 * amount) / totalShares;

  const withdraw = async () => {
    // The vault pulls the shares back into its HTS treasury before burning them.
    if ((shares.allowance ?? 0n) < amount) {
      await writeTx(() =>
        writeToken({
          address: vault.shareToken!,
          abi: HTS_TOKEN_ABI,
          functionName: "approve",
          args: [vault.address!, amount],
          gas: 1_000_000n,
        }),
      );
    }
    await writeVault({
      functionName: "withdraw",
      args: [
        amount,
        (out0 * (10_000n - SLIPPAGE_BPS)) / 10_000n,
        (out1 * (10_000n - SLIPPAGE_BPS)) / 10_000n,
        address!,
      ],
      gas: 2_000_000n,
    });
    setInput("");
    await Promise.all([shares.refetch(), vault.refetch()]);
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-3">
        <h2 className="card-title">Withdraw</h2>
        <p className="text-sm">
          Your shares: {shares.balance === undefined ? "-" : formatUnits(shares.balance, SHARE_DECIMALS)} (
          {shares.balance === undefined ? 0 : sharePercent(shares.balance, totalShares)}% of the vault)
        </p>
        <input
          className="input input-bordered"
          inputMode="decimal"
          placeholder="Shares"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        {amount > 0n && (
          <p className="text-xs opacity-70">
            ≈ {formatUnits(out0, decimals0)} {symbol0} + {formatUnits(out1, decimals1)} {symbol1}
          </p>
        )}
        <button
          className="btn btn-secondary"
          disabled={!address || amount === 0n || amount > (shares.balance ?? 0n) || isPending || approving}
          onClick={withdraw}
        >
          Approve & withdraw
        </button>
      </div>
    </div>
  );
};
