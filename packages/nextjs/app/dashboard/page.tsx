"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { ActivityFeed } from "~~/app/_components/tidepool/ActivityFeed";
import { HoldingsCard } from "~~/app/_components/tidepool/HoldingsCard";
import { KeeperCard } from "~~/app/_components/tidepool/KeeperPanel";
import { PositionCard, SpotPrice, VaultStatusPill } from "~~/app/_components/tidepool/PositionCard";
import { UserActions } from "~~/app/_components/tidepool/UserActions";
import { VaultSelector } from "~~/app/_components/tidepool/VaultSelector";
import { Skeleton } from "~~/app/_components/tidepool/ui";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { useSelectedVault } from "~~/hooks/tidepool/useSelectedVault";
import { useUserPosition } from "~~/hooks/tidepool/useUserPosition";
import { useVault } from "~~/hooks/tidepool/useVault";
import type { TidepoolVaultConfig, TidepoolVaultId } from "~~/utils/tidepool/vaults";

const Home: NextPage = () => {
  const { vault, select } = useSelectedVault();

  return (
    <div className="tp-scope mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pb-8 pt-4 sm:px-6">
      <p className="text-sm text-base-content/60">
        Automated SaucerSwap V2 liquidity vault ·{" "}
        <Link href="/docs" className="text-primary hover:underline">
          Docs
        </Link>
      </p>
      {/* Keyed by vault so inputs and transaction status reset when switching. */}
      <VaultDashboard key={vault.id} config={vault} onSelect={select} />
    </div>
  );
};

const VaultDashboard = ({
  config,
  onSelect,
}: {
  config: TidepoolVaultConfig;
  onSelect: (id: TidepoolVaultId) => void;
}) => {
  const { targetNetwork } = useTargetNetwork();
  const vault = useVault(config);
  const user = useUserPosition(vault);
  const ready = !vault.isLoading && !vault.notFound;

  const topRow = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <VaultSelector selected={config} onSelect={onSelect} />
      {ready && (
        <>
          <VaultStatusPill vault={vault} />
          <SpotPrice vault={vault} />
        </>
      )}
      {config.demo && <span className="text-xs text-warning">Demo vault for rebalance tests</span>}
    </div>
  );

  if (vault.isLoading) {
    return (
      <>
        {topRow}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy>
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </>
    );
  }

  if (vault.notFound) {
    return (
      <>
        {topRow}
        <div className="rounded-xl border border-base-300 bg-base-100 p-6 text-sm">
          <h2 className="m-0 text-base font-semibold">
            {config.label} not found on {targetNetwork.name}
          </h2>
          <p className="mt-2 text-base-content/60">
            {config.demo
              ? "No TidepoolVaultNarrow deployment was found for this network. Deploy one with `npm run hardhat:deploy:narrow`, which regenerates contracts/deployedContracts.ts."
              : "No TidepoolVault deployment was found for this network. Deploy one with `npm run hardhat:deploy:testnet`, which regenerates contracts/deployedContracts.ts."}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {topRow}
      {vault.readError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-sm"
        >
          <span>Could not read the vault: {vault.readError}</span>
          <button type="button" className="btn btn-xs shadow-none" onClick={() => void vault.refetch()}>
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <PositionCard vault={vault} />
        <div className="flex min-w-0 flex-col gap-6">
          <HoldingsCard vault={vault} user={user} />
          <UserActions vault={vault} user={user} />
        </div>
      </div>

      <KeeperCard vault={vault} />
      <ActivityFeed vault={vault} />
    </>
  );
};

export default Home;
