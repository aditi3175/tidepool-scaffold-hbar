import type { Abi } from "viem";
import { useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { HASHSCAN_URL } from "~~/utils/tidepool/constants";

const LABELS: Record<string, string> = {
  Initialized: "Vault initialized",
  Deposit: "Deposit",
  Withdraw: "Withdraw",
  FeesCollected: "Fees collected",
  Compound: "Compounded",
  Rebalance: "Range re-centred",
};

export const ActivityFeed = ({ vault, abi }: { vault?: `0x${string}`; abi?: Abi }) => {
  const { data: events, isLoading, error } = useVaultActivity(vault, abi);

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Activity (Hedera mirror node)</h2>
        {isLoading && <span className="loading loading-dots" />}
        {error && <p className="text-sm text-error">{error.message}</p>}
        {events?.length === 0 && <p className="text-sm">No activity yet.</p>}
        <ul className="divide-y divide-base-300">
          {events?.map(event => (
            <li key={`${event.transactionHash}-${event.logIndex}`} className="py-2 flex justify-between gap-4 text-sm">
              <span>{LABELS[event.name] ?? event.name}</span>
              <a
                className="link link-hover opacity-70"
                href={`${HASHSCAN_URL}/transaction/${event.transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {new Date(event.timestamp * 1000).toLocaleString()}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
