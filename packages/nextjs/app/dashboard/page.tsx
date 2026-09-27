"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import { ActivityFeed } from "~~/app/_components/tidepool/ActivityFeed";
import { GetStarted } from "~~/app/_components/tidepool/GetStarted";
import { VaultHoldingsCard, YourPositionCard } from "~~/app/_components/tidepool/HoldingsCard";
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

const Dashboard: NextPage = () => {
  const { vault, select } = useSelectedVault();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pb-8 pt-6 sm:px-6">
      {/* Keyed by vault so inputs and transaction status reset when switching. */}
      <VaultDashboard key={vault.id} config={vault} onSelect={select} />
    </div>
  );
};

/** One line on what the vault is and a Connect button, for visitors without a wallet connected. */
const ConnectPrompt = () => {
  const { openConnectModal } = useConnectModal();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
      <p className="text-sm text-muted">
        This vault owns one SaucerSwap V2 position on Hedera testnet. Connect a wallet to deposit.
      </p>
      <button type="button" className="btn btn-primary btn-sm h-9 rounded-lg px-4" onClick={openConnectModal}>
        Connect wallet
      </button>
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

  const topBar = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <VaultSelector selected={config} onSelect={onSelect} />
      {ready && (
        <>
          <VaultStatusPill vault={vault} />
          <SpotPrice vault={vault} />
        </>
      )}
      {config.demo && <span className="text-xs text-amber">Demo vault for rebalance tests</span>}
    </div>
  );

  if (vault.isLoading) {
    return (
      <>
        {topBar}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy>
          <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
            <p className="text-sm text-muted">Loading the vault from Hedera testnet…</p>
            <Skeleton className="h-[172px] w-full rounded-lg" />
          </div>
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </>
    );
  }

  if (vault.notFound) {
    return (
      <>
        {topBar}
        <div className="rounded-lg border border-line bg-surface p-6 text-sm">
          <h2 className="m-0 text-base font-semibold">
            {config.label} not found on {targetNetwork.name}
          </h2>
          <p className="mt-2 text-muted">
            {config.demo
              ? "No TidepoolVaultNarrow deployment was found for this network. Deploy one with `npm run hardhat:deploy:narrow`, which regenerates contracts/deployedContracts.ts."
              : "No TidepoolVault deployment was found for this network. Deploy one with `npm run hardhat:deploy:testnet`, which regenerates contracts/deployedContracts.ts."}
          </p>
        </div>
      </>
    );
  }

  const hasShares = (user.shares ?? 0n) > 0n;

  return (
    <>
      {topBar}
      {!user.connected && <ConnectPrompt />}
      {vault.readError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm"
        >
          <span>Could not read the vault: {vault.readError}</span>
          <button type="button" className="btn btn-xs rounded-lg" onClick={() => void vault.refetch()}>
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <PositionCard vault={vault} />
          {user.connected && user.shares !== undefined && !hasShares && <GetStarted vault={vault} user={user} />}
          {user.connected && hasShares && <YourPositionCard vault={vault} user={user} />}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <VaultHoldingsCard vault={vault} />
          <UserActions vault={vault} user={user} />
        </div>
      </div>

      <KeeperCard vault={vault} />
      <ActivityFeed vault={vault} />
    </>
  );
};

export default Dashboard;
