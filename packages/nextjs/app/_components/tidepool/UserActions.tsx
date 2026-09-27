"use client";

import { useEffect, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { DepositCard } from "~~/app/_components/tidepool/DepositCard";
import { WithdrawCard } from "~~/app/_components/tidepool/WithdrawCard";
import { Card } from "~~/app/_components/tidepool/ui";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";

const OPEN_EVENT = "tidepool:open-deposit";

/**
 * Brings the deposit panel into view on its Deposit tab, then either opens the Wrap HBAR form or focuses the first
 * deposit amount. Used by the Get started checklist; the panel's own logic is unchanged.
 */
export function openDepositPanel(target: "wrap" | "deposit") {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: target }));
}

/** Deposit and withdraw, the actions that change the connected account's shares. */
export const UserActions = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    const onOpen = (event: Event) => {
      const target = (event as CustomEvent<"wrap" | "deposit">).detail;
      setTab("deposit");
      requestAnimationFrame(() => {
        document.getElementById("deposit-panel")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        if (target === "wrap") {
          const details = document.getElementById("wrap-hbar") as HTMLDetailsElement | null;
          if (details) details.open = true;
          document.getElementById("wrap-input")?.focus({ preventScroll: true });
        } else {
          document.getElementById("deposit-input-0")?.focus({ preventScroll: true });
        }
      });
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  if (!user.connected) {
    return (
      <div id="deposit-panel">
        <Card title="Deposit or withdraw">
          <p className="text-sm text-muted">Connect a wallet to deposit tokens for shares or withdraw them.</p>
          <button
            type="button"
            className="btn btn-primary mt-4 h-10 min-h-10 w-full rounded-lg text-sm font-medium"
            onClick={openConnectModal}
          >
            Connect wallet
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div id="deposit-panel">
      <Card>
        <div role="tablist" aria-label="Action" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-bg p-1">
          {(["deposit", "withdraw"] as const).map(id => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              className={`rounded-lg py-2 text-sm capitalize ${
                tab === id ? "bg-raised font-medium text-fg" : "text-muted hover:text-fg"
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
    </div>
  );
};
