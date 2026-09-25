import { useState } from "react";
import { AssociateButton } from "./AssociateButton";
import { formatUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useScaffoldWriteContract, useTransactor } from "~~/hooks/scaffold-hbar";
import { useHtsAccount } from "~~/hooks/tidepool/useHtsAccount";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { HTS_TOKEN_ABI, WHBAR_HELPER, WHBAR_HELPER_ABI } from "~~/utils/tidepool/constants";
import { safeParseUnits } from "~~/utils/tidepool/math";

const SLIPPAGE_BPS = 100n; // accept 1% fewer shares than previewed

export const DepositCard = ({ vault }: { vault: VaultState }) => {
  const { address } = useAccount();
  const [input0, setInput0] = useState("");
  const [input1, setInput1] = useState("");
  const [wrapInput, setWrapInput] = useState("");

  const acc0 = useHtsAccount(vault.token0, vault.address);
  const acc1 = useHtsAccount(vault.token1, vault.address);
  const accShare = useHtsAccount(vault.shareToken, vault.address);
  const { writeContractAsync: writeToken, isPending: tokenPending } = useWriteContract();
  const { writeContractAsync: writeVault, isPending: vaultPending } = useScaffoldWriteContract({
    contractName: "TidepoolVault",
  });
  const writeTx = useTransactor();

  const { decimals0, decimals1, symbol0, symbol1, total0, total1, totalShares } = vault;
  if (decimals0 === undefined || decimals1 === undefined || !symbol0 || !symbol1) return null;

  const amount0 = safeParseUnits(input0, decimals0);
  const amount1 = safeParseUnits(input1, decimals1);
  const wrapWeibar = safeParseUnits(wrapInput, 18);
  const hasHoldings = Boolean(
    totalShares && total0 !== undefined && total1 !== undefined && (total0 > 0n || total1 > 0n),
  );

  // Deposits must match the vault's current ratio; fill the other side automatically.
  const onInput0 = (value: string) => {
    setInput0(value);
    if (hasHoldings && total0! > 0n && value) {
      setInput1(formatUnits((safeParseUnits(value, decimals0) * total1!) / total0!, decimals1));
    }
  };

  const previewShares = (): bigint => {
    if (!hasHoldings) return 0n;
    const s0 = total0! > 0n ? (amount0 * totalShares!) / total0! : undefined;
    const s1 = total1! > 0n ? (amount1 * totalShares!) / total1! : undefined;
    const shares = s0 === undefined ? s1! : s1 === undefined ? s0 : s0 < s1 ? s0 : s1;
    return (shares * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  };

  const approve = async (token: `0x${string}`, amount: bigint) => {
    await writeTx(() =>
      writeToken({
        address: token,
        abi: HTS_TOKEN_ABI,
        functionName: "approve",
        args: [vault.address!, amount],
        gas: 1_000_000n,
      }),
    );
  };

  const wrap = async () => {
    await writeTx(() =>
      writeToken({
        address: WHBAR_HELPER,
        abi: WHBAR_HELPER_ABI,
        functionName: "deposit",
        value: wrapWeibar, // weibar (18 decimals): the relay converts it to tinybar
        gas: 200_000n,
      }),
    );
    setWrapInput("");
    await acc0.refetch();
    await acc1.refetch();
  };

  const deposit = async () => {
    if ((acc0.allowance ?? 0n) < amount0) await approve(vault.token0!, amount0);
    if ((acc1.allowance ?? 0n) < amount1) await approve(vault.token1!, amount1);
    await writeVault({
      functionName: "deposit",
      args: [amount0, amount1, previewShares(), address!],
      gas: 1_500_000n,
    });
    setInput0("");
    setInput1("");
    await Promise.all([acc0.refetch(), acc1.refetch(), accShare.refetch(), vault.refetch()]);
  };

  const missingAssociations = [
    { token: vault.token0, symbol: symbol0, account: acc0 },
    { token: vault.token1, symbol: symbol1, account: acc1 },
    { token: vault.shareToken, symbol: "vault shares", account: accShare },
  ].filter(entry => entry.token && entry.account.isAssociated === false);
  const whbarIsInPool = symbol0 === "WHBAR" || symbol1 === "WHBAR";

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-3">
        <h2 className="card-title">Deposit</h2>
        {!address && <p className="text-sm">Connect a wallet to deposit.</p>}

        {missingAssociations.length > 0 && (
          <div className="alert alert-warning flex flex-col items-start gap-2">
            <span className="text-sm">
              Hedera tokens must be associated with your account before you can receive them.
            </span>
            <div className="flex flex-wrap gap-2">
              {missingAssociations.map(entry => (
                <AssociateButton
                  key={entry.token}
                  token={entry.token!}
                  symbol={entry.symbol}
                  onDone={() => void entry.account.refetch()}
                />
              ))}
            </div>
          </div>
        )}

        {whbarIsInPool && (
          <div className="flex gap-2 items-end">
            <label className="form-control grow">
              <span className="label-text text-xs">Wrap HBAR into WHBAR (SaucerSwap WhbarHelper)</span>
              <input
                className="input input-bordered input-sm"
                placeholder="HBAR"
                value={wrapInput}
                onChange={e => setWrapInput(e.target.value)}
              />
            </label>
            <button className="btn btn-sm" disabled={wrapWeibar === 0n || tokenPending} onClick={wrap}>
              Wrap
            </button>
          </div>
        )}

        {[
          { symbol: symbol0, value: input0, onChange: onInput0, balance: acc0.balance, decimals: decimals0 },
          { symbol: symbol1, value: input1, onChange: setInput1, balance: acc1.balance, decimals: decimals1 },
        ].map(field => (
          <label key={field.symbol} className="form-control">
            <span className="label-text text-xs">
              {field.symbol} · balance {field.balance === undefined ? "-" : formatUnits(field.balance, field.decimals)}
            </span>
            <input
              className="input input-bordered"
              inputMode="decimal"
              value={field.value}
              onChange={e => field.onChange(e.target.value)}
            />
          </label>
        ))}
        {hasHoldings && <p className="text-xs opacity-70">Amounts follow the vault&apos;s current token ratio.</p>}

        <button
          className="btn btn-primary"
          disabled={
            !address || missingAssociations.length > 0 || amount0 + amount1 === 0n || tokenPending || vaultPending
          }
          onClick={deposit}
        >
          Approve & deposit
        </button>
      </div>
    </div>
  );
};
