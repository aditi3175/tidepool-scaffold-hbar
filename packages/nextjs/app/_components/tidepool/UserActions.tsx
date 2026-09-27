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
      eyebrow="Act"
      title={tab === "deposit" ? "Deposit for shares" : "Withdraw your tokens"}
      subtitle="Deposit tokens for shares, or burn shares for tokens."
      style={{ animationDelay: "120ms" }}
    >
      <div
        role="tablist"
        aria-label="Action"
        className="relative mb-6 grid grid-cols-2 rounded-xl border border-white/[0.07] bg-black/30 p-1"
      >
        <span
          aria-hidden
          className="tp-stream-edge absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white/[0.07] transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${tab === "deposit" ? 0 : 100}%)` }}
        />
        {(["deposit", "withdraw"] as const).map(id => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            className={`relative z-[1] rounded-lg py-2.5 text-sm capitalize transition-colors duration-300 ${
              tab === id ? "font-medium text-base-content" : "text-base-content/50 hover:text-base-content/85"
            }`}
            onClick={() => setTab(id)}
          >
            {id}
          </button>
        ))}
      </div>
      {/* Both stay mounted so an in-flight flow keeps its status when the tab changes. */}
      <div className={tab === "deposit" ? "tp-fade-in" : "hidden"}>
        <DepositCard vault={vault} user={user} />
      </div>
      <div className={tab === "withdraw" ? "tp-fade-in" : "hidden"}>
        <WithdrawCard vault={vault} user={user} />
      </div>
    </Panel>
  );
};
