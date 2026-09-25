import { useReadContracts } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar";
import { HTS_TOKEN_ABI } from "~~/utils/tidepool/constants";

/**
 * Everything the dashboard needs about the vault. viem's Hedera chains define no multicall3
 * contract, so wagmi sends these as individual eth_calls.
 */
export function useVault() {
  const { data: vault, isLoading } = useDeployedContractInfo({ contractName: "TidepoolVault" });

  const base = vault ? ({ address: vault.address, abi: vault.abi } as const) : undefined;
  const { data: state, refetch: refetchState } = useReadContracts({
    allowFailure: true,
    contracts: base
      ? [
          { ...base, functionName: "token0" },
          { ...base, functionName: "token1" },
          { ...base, functionName: "shareToken" },
          { ...base, functionName: "tickLower" },
          { ...base, functionName: "tickUpper" },
          { ...base, functionName: "positionSerial" },
          { ...base, functionName: "totalShares" },
          { ...base, functionName: "getTotalAmounts" },
          { ...base, functionName: "getPriceState" },
          { ...base, functionName: "lastRebalance" },
          { ...base, functionName: "rebalanceCooldown" },
        ]
      : [],
    query: { enabled: Boolean(base), refetchInterval: 15_000 },
  });

  const token0 = state?.[0]?.result as `0x${string}` | undefined;
  const token1 = state?.[1]?.result as `0x${string}` | undefined;
  const { data: meta } = useReadContracts({
    contracts:
      token0 && token1
        ? [
            { address: token0, abi: HTS_TOKEN_ABI, functionName: "symbol" },
            { address: token0, abi: HTS_TOKEN_ABI, functionName: "decimals" },
            { address: token1, abi: HTS_TOKEN_ABI, functionName: "symbol" },
            { address: token1, abi: HTS_TOKEN_ABI, functionName: "decimals" },
          ]
        : [],
    query: { enabled: Boolean(token0 && token1), staleTime: Infinity },
  });

  const totals = state?.[7]?.result as readonly [bigint, bigint] | undefined;
  const priceState = state?.[8]?.result as readonly [number, number, boolean] | undefined;

  return {
    isLoading,
    address: vault?.address,
    abi: vault?.abi,
    token0,
    token1,
    shareToken: state?.[2]?.result as `0x${string}` | undefined,
    tickLower: state?.[3]?.result as number | undefined,
    tickUpper: state?.[4]?.result as number | undefined,
    positionSerial: state?.[5]?.result as bigint | undefined,
    totalShares: state?.[6]?.result as bigint | undefined,
    total0: totals?.[0],
    total1: totals?.[1],
    spotTick: priceState?.[0],
    twapTick: priceState?.[1],
    inRange: priceState?.[2],
    twapError: state?.[8]?.status === "failure",
    lastRebalance: state?.[9]?.result as bigint | undefined,
    rebalanceCooldown: state?.[10]?.result as number | undefined,
    symbol0: meta?.[0]?.result as string | undefined,
    decimals0: meta?.[1]?.result as number | undefined,
    symbol1: meta?.[2]?.result as string | undefined,
    decimals1: meta?.[3]?.result as number | undefined,
    refetch: refetchState,
  };
}

export type VaultState = ReturnType<typeof useVault>;
