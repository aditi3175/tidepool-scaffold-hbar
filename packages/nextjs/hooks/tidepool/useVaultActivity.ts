import { useQuery } from "@tanstack/react-query";
import { type Abi, type Hex, decodeEventLog } from "viem";
import { MIRROR_NODE_URL } from "~~/utils/tidepool/constants";

type MirrorLog = { data: Hex; topics: Hex[]; index: number; timestamp: string; transaction_hash: Hex };

export type VaultEvent = {
  name: string;
  args: Record<string, unknown>;
  timestamp: number;
  transactionHash: Hex;
  logIndex: number;
};

/** Vault history straight from the Hedera mirror node REST API, decoded with the vault ABI. */
export function useVaultActivity(vault: `0x${string}` | undefined, abi: Abi | undefined) {
  return useQuery({
    queryKey: ["tidepool-activity", vault],
    enabled: Boolean(vault && abi),
    refetchInterval: 15_000,
    queryFn: async (): Promise<VaultEvent[]> => {
      const res = await fetch(`${MIRROR_NODE_URL}/api/v1/contracts/${vault}/results/logs?order=desc&limit=50`);
      if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);
      const { logs } = (await res.json()) as { logs: MirrorLog[] };

      return logs.flatMap(log => {
        try {
          const decoded = decodeEventLog({ abi: abi!, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
          return [
            {
              name: String(decoded.eventName),
              args: (decoded.args ?? {}) as Record<string, unknown>,
              timestamp: Math.floor(Number(log.timestamp)),
              transactionHash: log.transaction_hash,
              logIndex: log.index,
            },
          ];
        } catch {
          return []; // a log whose signature is not in this ABI version
        }
      });
    },
  });
}
