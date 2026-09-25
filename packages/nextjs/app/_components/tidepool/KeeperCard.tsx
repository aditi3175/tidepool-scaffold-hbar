import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { TINYBAR_TO_WEIBAR } from "~~/utils/tidepool/constants";

const FEE_HEADROOM_TINYBARS = 10_000_000n; // 0.1 HBAR; the vault refunds whatever is not used
// Fixed: a SaucerSwap position mint cannot be pre-simulated on Hedera (INVALID_NFT_ID in eth_estimateGas).
// On testnet, compound used 4.8-5.1M gas and rebalance 5.26M; Hedera charged only the gas used.
const KEEPER_GAS_LIMIT = 8_000_000n;

/** compound() and rebalance() are permissionless: whoever calls them pays SaucerSwap's HBAR position fee. */
export const KeeperCard = ({ vault }: { vault: VaultState }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "TidepoolVault" });

  // quoteMintFee() is non-view (it calls the exchange-rate system contract), so it is simulated, not read.
  const { data: feeTinybars } = useQuery({
    queryKey: ["tidepool-mint-fee", vault.address],
    enabled: Boolean(publicClient && vault.address && vault.abi),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { result } = await publicClient!.simulateContract({
        address: vault.address!,
        abi: vault.abi!,
        functionName: "quoteMintFee",
        account: address,
      });
      return result as bigint;
    },
  });

  const now = BigInt(Math.floor(Date.now() / 1000));
  const readyAt =
    vault.lastRebalance !== undefined && vault.rebalanceCooldown !== undefined
      ? vault.lastRebalance + BigInt(vault.rebalanceCooldown)
      : undefined;
  const cooling = readyAt !== undefined && now < readyAt;
  const value = feeTinybars === undefined ? undefined : (feeTinybars + FEE_HEADROOM_TINYBARS) * TINYBAR_TO_WEIBAR;

  const run = async (functionName: "compound" | "rebalance") => {
    await writeContractAsync({ functionName, value, gas: KEEPER_GAS_LIMIT });
    await vault.refetch();
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-3">
        <h2 className="card-title">Keep the position working</h2>
        <p className="text-sm">
          SaucerSwap position fee:{" "}
          {feeTinybars === undefined ? "-" : `${formatUnits(feeTinybars, 8)} HBAR per compound or rebalance`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-outline"
            disabled={!address || value === undefined || isPending || vault.twapError}
            onClick={() => run("compound")}
          >
            {vault.positionSerial === 0n ? "Open position" : "Compound fees"}
          </button>
          <button
            className="btn btn-outline"
            disabled={
              !address ||
              value === undefined ||
              isPending ||
              vault.inRange !== false ||
              cooling ||
              !vault.positionSerial
            }
            onClick={() => run("rebalance")}
          >
            Rebalance
          </button>
        </div>
        {vault.twapError && (
          <p className="text-xs text-error">The pool&apos;s TWAP is unavailable, so the vault will not act.</p>
        )}
        {cooling && (
          <p className="text-xs opacity-70">
            Rebalance cooldown ends {new Date(Number(readyAt) * 1000).toLocaleString()}.
          </p>
        )}
      </div>
    </div>
  );
};
