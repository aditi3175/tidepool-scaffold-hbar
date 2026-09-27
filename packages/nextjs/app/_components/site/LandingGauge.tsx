"use client";

import Link from "next/link";
import { LiveGauge } from "~~/app/_components/tidepool/LiveGauge";
import { SpotPrice, VaultStatusPill } from "~~/app/_components/tidepool/PositionCard";
import { useVault } from "~~/hooks/tidepool/useVault";
import { TIDEPOOL_VAULTS } from "~~/utils/tidepool/vaults";

const MAIN = TIDEPOOL_VAULTS.find(vault => vault.id === "main") ?? TIDEPOOL_VAULTS[0];

/** The main vault's live gauge, read from Hedera testnet. */
export const LandingGauge = () => {
  const vault = useVault(MAIN);
  const pair = vault.symbol0 && vault.symbol1 ? `${vault.symbol0} / ${vault.symbol1}` : "Main vault";

  return (
    <section className="rounded-lg border border-line bg-surface p-4 sm:p-6" aria-label="Main vault, live">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="m-0 text-base font-semibold text-fg">{pair}</h2>
        {!vault.isLoading && !vault.notFound && (
          <>
            <VaultStatusPill vault={vault} />
            <SpotPrice vault={vault} />
          </>
        )}
        <Link href="/dashboard" className="ml-auto text-sm text-teal hover:underline">
          Open dashboard
        </Link>
      </div>
      <LiveGauge vault={vault} size="md" />
      <p className="mt-4 text-xs text-muted">Live from the main vault on Hedera testnet</p>
    </section>
  );
};
