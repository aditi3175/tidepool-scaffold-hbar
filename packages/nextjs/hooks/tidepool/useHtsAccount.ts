import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { HTS_TOKEN_ABI, POLL_INTERVAL_MS } from "~~/utils/tidepool/constants";

/**
 * The connected account's view of one HTS token: association, balance and allowance to `spender`.
 * isAssociated() answers for msg.sender, so it is read as a separate eth_call with `account` set;
 * batching it through a multicall contract would ask about the multicall contract instead.
 */
export function useHtsAccount(token: `0x${string}` | undefined, spender: `0x${string}` | undefined) {
  const { address } = useAccount();
  const enabled = Boolean(token && address);

  const association = useReadContract({
    address: token,
    abi: HTS_TOKEN_ABI,
    functionName: "isAssociated",
    account: address,
    query: { enabled },
  });

  const amounts = useReadContracts({
    contracts:
      token && address && spender
        ? [
            { address: token, abi: HTS_TOKEN_ABI, functionName: "balanceOf", args: [address] },
            { address: token, abi: HTS_TOKEN_ABI, functionName: "allowance", args: [address, spender] },
          ]
        : [],
    query: { enabled: enabled && Boolean(spender), refetchInterval: POLL_INTERVAL_MS },
  });

  return {
    isAssociated: association.data,
    balance: amounts.data?.[0]?.result as bigint | undefined,
    allowance: amounts.data?.[1]?.result as bigint | undefined,
    refetch: () => Promise.all([association.refetch(), amounts.refetch()]),
  };
}

export type HtsAccount = ReturnType<typeof useHtsAccount>;
