"use client";

import type { NextPage } from "next";
import { ActivityFeed } from "~~/app/_components/tidepool/ActivityFeed";
import { KeeperPanel } from "~~/app/_components/tidepool/KeeperPanel";
import { PositionPanel } from "~~/app/_components/tidepool/PositionPanel";
import { UserActions } from "~~/app/_components/tidepool/UserActions";
import { VaultOverview } from "~~/app/_components/tidepool/VaultOverview";
import { VaultSelector } from "~~/app/_components/tidepool/VaultSelector";
import { ExternalLink, Skeleton } from "~~/app/_components/tidepool/ui";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { useSelectedVault } from "~~/hooks/tidepool/useSelectedVault";
import { useUserPosition } from "~~/hooks/tidepool/useUserPosition";
import { useVault } from "~~/hooks/tidepool/useVault";
import { hashscan } from "~~/utils/tidepool/hashscan";
import type { TidepoolVaultConfig } from "~~/utils/tidepool/vaults";

const Home: NextPage = () => {
  const { vault, select } = useSelectedVault();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:py-8">
      <VaultSelector selected={vault} onSelect={select} />
      {/* Keyed by vault so inputs and transaction status reset when switching. */}
      <VaultDashboard key={vault.id} config={vault} />
    </div>
  );
};

const VaultDashboard = ({ config }: { config: TidepoolVaultConfig }) => {
  const { targetNetwork } = useTargetNetwork();
  const vault = useVault(config);
  const user = useUserPosition(vault);

  if (vault.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (vault.notFound) {
    return (
      <div className="rounded-box border border-base-300 bg-base-100 p-6 text-sm">
        <h1 className="text-lg font-semibold">
          {config.label} not found on {targetNetwork.name}
        </h1>
        <p className="mt-2 text-base-content/70">
          {config.demo
            ? "The narrow demo vault is configured in contracts/externalContracts.ts for Hedera testnet only."
            : "No TidepoolVault deployment was found for this network. Deploy one with `npm run hardhat:deploy:testnet`, which regenerates contracts/deployedContracts.ts."}
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {vault.symbol0 && vault.symbol1 ? `${vault.symbol0} / ${vault.symbol1}` : "Tidepool vault"}
          <span className="ml-2 align-middle text-sm font-normal text-base-content/60">{config.label}</span>
        </h1>
        <p className="text-sm text-base-content/70">
          One SaucerSwap V2 position that compounds its fees and re-centres on the pool&apos;s TWAP.{" "}
          {vault.address && <ExternalLink href={hashscan.contract(vault.address)}>Vault {vault.address}</ExternalLink>}
        </p>
      </header>

      {vault.readError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-box border border-error/40 bg-error/5 px-4 py-3 text-sm"
        >
          <span>Could not read the vault: {vault.readError}</span>
          <button type="button" className="btn btn-xs" onClick={() => void vault.refetch()}>
            Retry
          </button>
        </div>
      )}

      <VaultOverview vault={vault} user={user} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PositionPanel vault={vault} />
        </div>
        <div className="lg:col-span-2">
          <UserActions vault={vault} user={user} />
        </div>
      </div>
      <KeeperPanel vault={vault} />
      <ActivityFeed vault={vault} />
    </>
  );
};

export default Home;
