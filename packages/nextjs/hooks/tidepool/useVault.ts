import { useEffect } from "react";
import { zeroAddress } from "viem";
import { useBlock, useReadContract, useReadContracts } from "wagmi";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { contracts } from "~~/utils/scaffold-hbar/contract";
import { HTS_TOKEN_ABI, POLL_INTERVAL_MS, POSITION_MANAGER_ABI } from "~~/utils/tidepool/constants";
import { friendlyError } from "~~/utils/tidepool/errors";
import { useSnapshot, writeSnapshot } from "~~/utils/tidepool/snapshot";
import { type TidepoolVaultConfig, VAULT_ABI } from "~~/utils/tidepool/vaults";

type Address = `0x${string}`;

/**
 * Everything the dashboard reads about one vault, grouped by how often it can change:
 * - immutable settings (read once per vault),
 * - live vault state, the vault's idle balances, its SaucerSwap position and the latest block (polled),
 * - token metadata (read once).
 * viem's Hedera chains define no multicall3 contract, so each read is its own eth_call; the transport sends the calls
 * of one render together as a JSON-RPC batch (services/web3/wagmiConfig.tsx).
 *
 * The reads start from the address in the generated deployedContracts.ts, alongside the deployment (bytecode) check
 * rather than after it. A return visit shows this browser's last values (utils/tidepool/snapshot.ts) as placeholder
 * data until the fresh reads land; `cached` is true meanwhile, and the keeper checks wait for fresh data.
 */
export function useVault(config: TidepoolVaultConfig) {
  const { targetNetwork } = useTargetNetwork();
  const { data: info, isLoading: infoLoading } = useDeployedContractInfo({ contractName: config.contractName });
  const listed = contracts?.[targetNetwork.id]?.[config.contractName]?.address as Address | undefined;
  // Read from the listed address straight away; stop once the bytecode check says nothing is deployed there.
  const address = infoLoading ? listed : (info?.address as Address | undefined);
  const snapshotKey = `${targetNetwork.id}.${config.contractName}`;
  const snap = useSnapshot<Snapshot>(snapshotKey);
  const base = address ? ({ address, abi: VAULT_ABI } as const) : undefined;

  const settings = useReadContracts({
    allowFailure: true,
    contracts: base
      ? [
          { ...base, functionName: "token0" },
          { ...base, functionName: "token1" },
          { ...base, functionName: "pool" },
          { ...base, functionName: "fee" },
          { ...base, functionName: "tickSpacing" },
          { ...base, functionName: "halfWidth" },
          { ...base, functionName: "twapWindow" },
          { ...base, functionName: "maxTwapDeviation" },
          { ...base, functionName: "rebalanceCooldown" },
          { ...base, functionName: "swapSlippageBps" },
          { ...base, functionName: "positionManager" },
          { ...base, functionName: "positionNft" },
        ]
      : [],
    query: { enabled: Boolean(base), staleTime: Infinity, placeholderData: snap?.settings as never },
  });
  const s = settings.data;
  const token0 = s?.[0]?.result as Address | undefined;
  const token1 = s?.[1]?.result as Address | undefined;
  const positionManager = s?.[10]?.result as Address | undefined;

  const live = useReadContracts({
    allowFailure: true,
    contracts: base
      ? [
          { ...base, functionName: "shareToken" },
          { ...base, functionName: "tickLower" },
          { ...base, functionName: "tickUpper" },
          { ...base, functionName: "positionSerial" },
          { ...base, functionName: "totalShares" },
          { ...base, functionName: "getTotalAmounts" },
          { ...base, functionName: "getPriceState" },
          { ...base, functionName: "lastRebalance" },
        ]
      : [],
    query: { enabled: Boolean(base), refetchInterval: POLL_INTERVAL_MS, placeholderData: snap?.live as never },
  });
  const l = live.data;
  const positionSerial = l?.[3]?.result as bigint | undefined;

  // The vault's idle balances: deposits and collected fees waiting for the next compound.
  const holdings = useReadContracts({
    allowFailure: true,
    contracts:
      address && token0 && token1
        ? [
            { address: token0, abi: HTS_TOKEN_ABI, functionName: "balanceOf", args: [address] },
            { address: token1, abi: HTS_TOKEN_ABI, functionName: "balanceOf", args: [address] },
          ]
        : [],
    query: {
      enabled: Boolean(address && token0 && token1),
      refetchInterval: POLL_INTERVAL_MS,
      placeholderData: snap?.holdings as never,
    },
  });

  // The vault's SaucerSwap position, straight from the position manager.
  const positionRead = useReadContract({
    address: positionManager,
    abi: POSITION_MANAGER_ABI,
    functionName: "positions",
    args: positionSerial ? [positionSerial] : undefined,
    query: {
      enabled: Boolean(positionManager && positionSerial),
      refetchInterval: POLL_INTERVAL_MS,
      placeholderData: snap?.position as never,
    },
  });
  const position = positionRead.data;

  const shareToken = l?.[0]?.result as Address | undefined;
  const initialized = shareToken !== undefined ? shareToken !== zeroAddress : undefined;

  const meta = useReadContracts({
    allowFailure: true,
    contracts:
      token0 && token1
        ? [
            { address: token0, abi: HTS_TOKEN_ABI, functionName: "symbol" },
            { address: token0, abi: HTS_TOKEN_ABI, functionName: "decimals" },
            { address: token1, abi: HTS_TOKEN_ABI, functionName: "symbol" },
            { address: token1, abi: HTS_TOKEN_ABI, functionName: "decimals" },
          ]
        : [],
    query: { enabled: Boolean(token0 && token1), staleTime: Infinity, placeholderData: snap?.meta as never },
  });

  const shareSymbol = useReadContract({
    address: initialized ? shareToken : undefined,
    abi: HTS_TOKEN_ABI,
    functionName: "symbol",
    query: { enabled: Boolean(initialized), staleTime: Infinity },
  });

  // Chain time for the rebalance cooldown: the contract compares against block.timestamp, not the browser clock.
  const block = useBlock({
    chainId: targetNetwork.id,
    query: { enabled: Boolean(base), refetchInterval: POLL_INTERVAL_MS },
  });

  const totals = l?.[5]?.result as readonly [bigint, bigint] | undefined;
  const priceState = l?.[6]?.result as readonly [number, number, boolean] | undefined;
  const priceFailure = l?.[6]?.status === "failure" ? friendlyError(l[6].error, VAULT_ABI) : undefined;

  // Save the latest fresh reads for the next visit (never placeholder data).
  const fresh =
    live.data !== undefined &&
    !live.isPlaceholderData &&
    settings.data !== undefined &&
    !settings.isPlaceholderData &&
    meta.data !== undefined &&
    !meta.isPlaceholderData;
  useEffect(() => {
    if (!fresh) return;
    writeSnapshot(snapshotKey, {
      settings: settings.data,
      live: live.data,
      meta: meta.data,
      holdings: holdings.isPlaceholderData ? undefined : holdings.data,
      position: positionRead.isPlaceholderData ? undefined : positionRead.data,
    } satisfies Snapshot);
  }, [
    fresh,
    snapshotKey,
    settings.data,
    live.data,
    meta.data,
    holdings.data,
    holdings.isPlaceholderData,
    positionRead.data,
    positionRead.isPlaceholderData,
  ]);

  const refetch = async () => {
    await Promise.all([live.refetch(), holdings.refetch(), positionRead.refetch(), block.refetch()]);
  };

  return {
    config,
    address,
    abi: VAULT_ABI,
    isLoading: address ? live.isLoading || settings.isLoading : infoLoading,
    /** Showing this browser's last values while fresh reads are in flight. */
    cached: live.isPlaceholderData || settings.isPlaceholderData || meta.isPlaceholderData,
    /** No contract code at the configured address on the target network. */
    notFound: !infoLoading && !address,
    /** The core reads failed (RPC or network trouble), as opposed to a contract revert. */
    readError: l?.[3]?.status === "failure" ? friendlyError(l[3].error, VAULT_ABI).message : live.error?.message,

    // Immutable settings
    token0,
    token1,
    pool: s?.[2]?.result as Address | undefined,
    fee: s?.[3]?.result as number | undefined,
    tickSpacing: s?.[4]?.result as number | undefined,
    halfWidth: s?.[5]?.result as number | undefined,
    twapWindow: s?.[6]?.result as number | undefined,
    maxTwapDeviation: s?.[7]?.result as number | undefined,
    rebalanceCooldown: s?.[8]?.result as number | undefined,
    swapSlippageBps: s?.[9]?.result as number | undefined,
    positionManager,
    positionNft: s?.[11]?.result as Address | undefined,

    // Live vault state
    shareToken: initialized ? shareToken : undefined,
    initialized,
    tickLower: l?.[1]?.result as number | undefined,
    tickUpper: l?.[2]?.result as number | undefined,
    positionSerial,
    hasPosition: positionSerial === undefined ? undefined : positionSerial > 0n,
    totalShares: l?.[4]?.result as bigint | undefined,
    /** getTotalAmounts(): position principal at the spot price plus idle balances; excludes uncollected fees. */
    total0: totals?.[0],
    total1: totals?.[1],
    idle0: holdings.data?.[0]?.result as bigint | undefined,
    idle1: holdings.data?.[1]?.result as bigint | undefined,
    lastRebalance: l?.[7]?.result as bigint | undefined,

    // SaucerSwap position (NonfungiblePositionManager.positions)
    liquidity: position?.[5],
    /** Fees credited to the position at its last update; not the live claimable amount. */
    tokensOwed0: position?.[8],
    tokensOwed1: position?.[9],

    // Pool price (getPriceState)
    spotTick: priceState?.[0],
    twapTick: priceState?.[1],
    /** The contract's own flag: TWAP tick inside [tickLower, tickUpper) and a position exists. */
    inRange: priceState?.[2],
    twapUnavailable: priceFailure?.errorName === "TwapUnavailable",
    priceError: priceFailure?.message,

    // Chain time (seconds) and when it was read (ms since epoch), to extrapolate between polls
    chainTime: block.data?.timestamp,
    chainTimeReadAt: block.dataUpdatedAt || undefined,

    symbol0: meta.data?.[0]?.result as string | undefined,
    decimals0: meta.data?.[1]?.result as number | undefined,
    symbol1: meta.data?.[2]?.result as string | undefined,
    decimals1: meta.data?.[3]?.result as number | undefined,
    shareSymbol: shareSymbol.data,

    updatedAt: live.dataUpdatedAt,
    refetch,
  };
}

export type VaultState = ReturnType<typeof useVault>;

/** What useVault keeps in the browser between visits: the raw read results. */
type Snapshot = {
  settings?: unknown;
  live?: unknown;
  meta?: unknown;
  holdings?: unknown;
  position?: unknown;
};
