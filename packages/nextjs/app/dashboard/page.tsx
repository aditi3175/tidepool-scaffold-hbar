"use client";

import { type CSSProperties, useEffect, useState } from "react";
import type { NextPage } from "next";
import { ActivityFeed } from "~~/app/_components/tidepool/ActivityFeed";
import { DashboardColumns } from "~~/app/_components/tidepool/DashboardColumns";
import { DashboardStats } from "~~/app/_components/tidepool/DashboardStats";
import { KeeperCard } from "~~/app/_components/tidepool/KeeperPanel";
import { VaultStatusPill } from "~~/app/_components/tidepool/PositionCard";
import { VaultSelector } from "~~/app/_components/tidepool/VaultSelector";
import { Card, Skeleton } from "~~/app/_components/tidepool/ui";
import { GradientText, Tile, btn } from "~~/components/pulse";
import { Reveal } from "~~/components/pulse/Reveal";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { useSelectedVault } from "~~/hooks/tidepool/useSelectedVault";
import { useUserPosition } from "~~/hooks/tidepool/useUserPosition";
import { useVault } from "~~/hooks/tidepool/useVault";
import { useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import type { TidepoolVaultConfig, TidepoolVaultId } from "~~/utils/tidepool/vaults";

const Dashboard: NextPage = () => {
  const { vault, select } = useSelectedVault();

  return (
    <div className="relative isolate overflow-x-clip">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-5 pb-8 pt-12 sm:px-8 lg:px-12">
        {/* Keyed by vault so inputs and transaction status reset when switching. */}
        <VaultDashboard key={vault.id} config={vault} onSelect={select} />
      </div>
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
  // Start the mirror-node history with the chain reads (the stats and activity cards share this query).
  useVaultActivity(vault.address, vault.abi);
  const ready = !vault.isLoading && !vault.notFound;

  // Keep the placeholder until the first values are in (tokens, holdings and a price, or an error to show), so the
  // page appears once, complete, instead of filling in tile by tile. After 8 s it shows whatever has arrived.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 8000);
    return () => clearTimeout(t);
  }, []);
  const firstValues =
    vault.decimals0 !== undefined &&
    vault.decimals1 !== undefined &&
    vault.total0 !== undefined &&
    (vault.spotTick !== undefined || vault.twapUnavailable || vault.priceError !== undefined);
  const settling = vault.isLoading || (!vault.notFound && !vault.readError && !firstValues && !waited);

  // Until the token symbols arrive the title is a placeholder of the same height, so nothing jumps; the pair then
  // rises into place.
  const pair = vault.symbol0 && vault.symbol1 ? `${vault.symbol0} / ${vault.symbol1}` : undefined;
  const topBar = (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div>
        {/* Breadcrumb, headline and subline in the same type as the Docs and How it works pages. */}
        <div className="tp-in font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          Dashboard <span className="text-white/20">/</span> <span className="text-neon">{config.label}</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="m-0 text-balance text-[clamp(38px,5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-fg">
            {pair && !settling ? (
              <span className="tp-line">
                <span style={{ "--d": 60 } as CSSProperties}>
                  {pair}, <GradientText>live.</GradientText>
                </span>
              </span>
            ) : vault.notFound ? (
              config.label
            ) : (
              <span className="tp-shimmer block h-[1.02em] w-[7.5em] max-w-[70vw] rounded-xl" aria-label="Loading" />
            )}
          </h1>
          {ready && !settling && (
            <span className="tp-in" style={{ "--d": 300 } as CSSProperties}>
              <VaultStatusPill vault={vault} />
            </span>
          )}
          {vault.cached && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-muted motion-safe:animate-pulse" aria-hidden />
              Updating
            </span>
          )}
        </div>
        <p
          className="tp-in m-0 mt-4 max-w-2xl text-[17px] leading-relaxed text-muted"
          style={{ "--d": 120 } as CSSProperties}
        >
          One SaucerSwap V2 position in the{" "}
          {vault.fee !== undefined ? (
            `${(vault.fee / 10_000).toFixed(2)}%`
          ) : (
            <Skeleton className="h-3 w-10 align-middle" />
          )}{" "}
          pool, on Hedera testnet.
          {config.demo && (
            <>
              {" "}
              <span className="text-amber">Demo vault:</span> a deliberately narrow range, for rebalance tests.
            </>
          )}
        </p>
      </div>
      <div className="tp-in" style={{ "--d": 160 } as CSSProperties}>
        <VaultSelector selected={config} onSelect={onSelect} />
      </div>
    </div>
  );

  if (settling) {
    return (
      <>
        {topBar}
        <DashboardSkeleton />
      </>
    );
  }

  if (vault.notFound) {
    return (
      <>
        {topBar}
        <div className="rounded-2xl border border-white/10 bg-surface p-6 text-sm">
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

  return (
    <>
      {topBar}
      <DashboardStats vault={vault} />
      {vault.readError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm"
        >
          <span>Could not read the vault: {vault.readError}</span>
          <button type="button" className={btn.small} onClick={() => void vault.refetch()}>
            Retry
          </button>
        </div>
      )}

      <DashboardColumns vault={vault} user={user} />

      <Reveal>
        <KeeperCard vault={vault} />
      </Reveal>
      <Reveal>
        <ActivityFeed vault={vault} />
      </Reveal>
    </>
  );
};

/** A block-level loading bar (Skeleton is inline). */
const Bar = ({ className }: { className: string }) => <div className={`tp-shimmer rounded ${className}`} aria-hidden />;

/** The page's own shape while the first reads are in flight: five stat tiles, the position and holdings cards. */
const DashboardSkeleton = () => (
  <div className="flex flex-col gap-5" aria-busy aria-label="Loading the vault from Hedera testnet">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {[0, 1, 2, 3, 4].map(i => (
        <Tile key={i} className={i === 4 ? "col-span-2 md:col-span-1" : ""}>
          <Bar className="h-2.5 w-20" />
          <Bar className="mt-5 h-7 w-24" />
          <Bar className="mt-3 h-2.5 w-32 max-w-full" />
        </Tile>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card title="Position">
        <div className="relative h-[250px]">
          <div className="absolute inset-x-0 top-[62%]">
            <Bar className="h-3.5 rounded-full" />
          </div>
          <p className="absolute inset-x-0 top-[74%] m-0 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
            Reading the vault from Hedera testnet
          </p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i}>
              <Bar className="h-2.5 w-14" />
              <Bar className="mt-2.5 h-5 w-24" />
            </div>
          ))}
        </div>
      </Card>
      <Card title="Vault holdings">
        <Bar className="h-6 w-40" />
        <Bar className="mt-3 h-6 w-36" />
        <Bar className="mt-6 h-3 w-full" />
        <Bar className="mt-2 h-3 w-4/5" />
      </Card>
    </div>
  </div>
);

export default Dashboard;
