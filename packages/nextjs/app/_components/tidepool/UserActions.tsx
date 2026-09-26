import { useState } from "react";
import { DepositCard } from "~~/app/_components/tidepool/DepositCard";
import { WithdrawCard } from "~~/app/_components/tidepool/WithdrawCard";
import { Panel } from "~~/app/_components/tidepool/ui";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";

/** Deposit and withdraw, the actions that change the connected account's shares. */
export const UserActions = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");

  return (
    <Panel
      title="Your actions"
      subtitle="Deposit tokens for shares, or burn shares for tokens."
      actions={
        <div role="tablist" className="tabs tabs-box tabs-xs">
          {(["deposit", "withdraw"] as const).map(id => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              className={`tab capitalize ${tab === id ? "tab-active" : ""}`}
              onClick={() => setTab(id)}
            >
              {id}
            </button>
          ))}
        </div>
      }
    >
      {/* Both stay mounted so an in-flight flow keeps its status when the tab changes. */}
      <div className={tab === "deposit" ? "" : "hidden"}>
        <DepositCard vault={vault} user={user} />
      </div>
      <div className={tab === "withdraw" ? "" : "hidden"}>
        <WithdrawCard vault={vault} user={user} />
      </div>
    </Panel>
  );
};
