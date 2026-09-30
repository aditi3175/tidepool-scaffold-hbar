import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Abi, type Hex, decodeEventLog } from "viem";
import { MIRROR_NODE_URL } from "~~/utils/tidepool/constants";
import { useSnapshot, writeSnapshot } from "~~/utils/tidepool/snapshot";

type MirrorLog = { data: Hex; topics: Hex[]; index: number; timestamp: string; transaction_hash: Hex };

export type VaultEvent = {
  name: string;
  args: Record<string, unknown>;
  timestamp: number;
  transactionHash: Hex;
  logIndex: number;
};

/** Events the dashboard shows. CallResponseEvent (from the HTS helper contract) is internal plumbing. */
const SHOWN_EVENTS = new Set(["Initialized", "Deposit", "Withdraw", "FeesCollected", "Compound", "Rebalance"]);

export const ACTIVITY_LIMIT = 50;

/**
 * Vault history straight from the Hedera mirror node REST API, decoded with the vault ABI. A return visit shows this
 * browser's last copy (placeholder data) while the mirror node answers.
 */
export function useVaultActivity(vault: `0x${string}` | undefined, abi: Abi | undefined) {
  const key = `activity.${vault ?? "none"}`;
  const snap = useSnapshot<VaultEvent[]>(key);
  const query = useQuery({
    queryKey: ["tidepool-activity", vault],
    enabled: Boolean(vault && abi),
    refetchInterval: 30_000,
    placeholderData: snap,
    queryFn: async (): Promise<VaultEvent[]> => {
      const res = await fetch(
        `${MIRROR_NODE_URL}/api/v1/contracts/${vault}/results/logs?order=desc&limit=${ACTIVITY_LIMIT}`,
      );
      if (!res.ok) throw new Error(`The mirror node returned HTTP ${res.status}.`);
      const { logs } = (await res.json()) as { logs: MirrorLog[] };

      return logs.flatMap(log => {
        try {
          const decoded = decodeEventLog({ abi: abi!, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
          const name = String(decoded.eventName);
          if (!SHOWN_EVENTS.has(name)) return [];
          return [
            {
              name,
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
  useEffect(() => {
    if (vault && query.data && !query.isPlaceholderData) writeSnapshot(key, query.data);
  }, [vault, key, query.data, query.isPlaceholderData]);
  return query;
}
