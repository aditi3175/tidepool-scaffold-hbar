import { useState } from "react";
import { DepositCard } from "~~/app/_components/tidepool/DepositCard";
import { WithdrawCard } from "~~/app/_components/tidepool/WithdrawCard";
import { Card } from "~~/app/_components/tidepool/ui";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";

/** Deposit and withdraw, the actions that change the connected account's shares. */
export const UserActions = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");

  return (
    <Card>
      <div role="tablist" aria-label="Action" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-base-200 p-1">
        {(["deposit", "withdraw"] as const).map(id => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            className={`rounded-md py-2 text-sm capitalize ${
              tab === id ? "bg-base-300 font-medium text-base-content" : "text-base-content/60 hover:text-base-content"
            }`}
            onClick={() => setTab(id)}
          >
            {id}
          </button>
        ))}
      </div>
      {/* Both stay mounted so an in-flight flow keeps its status when the tab changes. */}
      <div className={tab === "deposit" ? undefined : "hidden"}>
        <DepositCard vault={vault} user={user} />
      </div>
      <div className={tab === "withdraw" ? undefined : "hidden"}>
        <WithdrawCard vault={vault} user={user} />
      </div>
    </Card>
  );
};
