"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { ActivityFeed } from "~~/app/_components/tidepool/ActivityFeed";
import { FeesStage } from "~~/app/_components/tidepool/FeesStage";
import { KeepStages } from "~~/app/_components/tidepool/KeeperPanel";
import { LoopStage } from "~~/app/_components/tidepool/Loop";
import { PriceStage, RangeStage } from "~~/app/_components/tidepool/PriceRange";
import { UserActions } from "~~/app/_components/tidepool/UserActions";
import { VaultHero, VaultStatusPill } from "~~/app/_components/tidepool/VaultHero";
import { VaultSelector } from "~~/app/_components/tidepool/VaultSelector";
import { HighlightProvider, createHighlightStore, useEmitRefreshOnChange } from "~~/app/_components/tidepool/motion";
import { Skeleton } from "~~/app/_components/tidepool/ui";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { useSelectedVault } from "~~/hooks/tidepool/useSelectedVault";
import { useUserPosition } from "~~/hooks/tidepool/useUserPosition";
import { useVault } from "~~/hooks/tidepool/useVault";
import type { TidepoolVaultConfig } from "~~/utils/tidepool/vaults";

const Home: NextPage = () => {
  const { vault, select } = useSelectedVault();

  return (
    <div className="tp-scope relative overflow-x-clip">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-6 pt-8 sm:gap-8 sm:pt-12">
        <div className="tp-in flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <p className="m-0 max-w-md text-sm leading-relaxed text-base-content/55">
            <span className="tp-eyebrow mb-2 block text-primary/90">Tidepool · Automated concentrated liquidity</span>
            One SaucerSwap V2 position per vault, owned by the contract. Fees compound back into the position; the range
            re-centres on the pool&apos;s TWAP when the price leaves it.
          </p>
          <div className="sm:pt-1">
            <VaultSelector selected={vault} onSelect={select} />
          </div>
        </div>

        {/* Keyed by vault so inputs and transaction status reset when switching. */}
        <VaultDashboard key={vault.id} config={vault} />
      </div>
    </div>
  );
};

/** Mobile only: a shortcut to the Act section, hidden while the section itself is on screen. */
const ActShortcut = () => {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const target = document.getElementById("act");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return (
    <a
      href="#act"
      className={`btn btn-primary tp-cta fixed inset-x-4 bottom-4 z-30 h-12 rounded-xl text-[15px] font-medium shadow-[0_12px_32px_-12px_rgb(0_0_0/0.9)] transition-[opacity,transform] duration-300 lg:hidden ${
        hidden ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100"
      }`}
    >
      Deposit / Withdraw
    </a>
  );
};

const VaultDashboard = ({ config }: { config: TidepoolVaultConfig }) => {
  const { targetNetwork } = useTargetNetwork();
  const vault = useVault(config);
  const user = useUserPosition(vault);
  const [highlightStore] = useState(createHighlightStore);

  // One-shot "data refreshed" signal for the header hairline and status dots, from the existing read timestamp.
  useEmitRefreshOnChange(vault.updatedAt);

  if (vault.isLoading) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <div className="flex flex-col gap-4 pb-2 pt-10 sm:pt-16">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-20 w-full max-w-xl" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="mt-4 h-10 w-full max-w-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-[1.25rem]" />
        <Skeleton className="h-80 w-full rounded-[1.25rem]" />
      </div>
    );
  }

  if (vault.notFound) {
    return (
      <div className="tp-panel p-6 text-sm">
        <h2 className="m-0 text-lg font-medium">
          {config.label} not found on {targetNetwork.name}
        </h2>
        <p className="mt-2 text-base-content/55">
          {config.demo
            ? "No TidepoolVaultNarrow deployment was found for this network. Deploy one with `npm run hardhat:deploy:narrow`, which regenerates contracts/deployedContracts.ts."
            : "No TidepoolVault deployment was found for this network. Deploy one with `npm run hardhat:deploy:testnet`, which regenerates contracts/deployedContracts.ts."}
        </p>
      </div>
    );
  }

  return (
    <HighlightProvider value={highlightStore}>
      <VaultHero vault={vault} config={config} user={user} />

      {vault.readError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-error/25 bg-error/[0.06] px-4 py-3 text-sm"
        >
          <span>Could not read the vault: {vault.readError}</span>
          <button
            type="button"
            className="btn btn-xs border-white/10 bg-white/[0.06] shadow-none"
            onClick={() => void vault.refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/*
        The loop. Desktop: loop stages on the left (8/12), the Act column sticky on the right, spanning both rows.
        Mobile (DOM order): 01 Price → 02 Range → Act → 03 Fees → 04 Compound → 05 Rebalance.
      */}
      <div className="mt-10 grid grid-cols-1 gap-x-12 sm:mt-16 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8 lg:row-start-1">
          <LoopStage
            index="01"
            name="Price"
            title="Where the market is."
            lead="The pool's live price, and the time-weighted reference Tidepool actually acts on."
          >
            <PriceStage vault={vault} />
          </LoopStage>
          <LoopStage
            index="02"
            name="Range"
            title="Where the liquidity works."
            lead="The vault's single SaucerSwap V2 position provides liquidity only inside this range. Hover the chart to read any price."
            aside={<VaultStatusPill vault={vault} size="lg" />}
          >
            <RangeStage vault={vault} />
          </LoopStage>
        </div>

        <aside id="act" className="mb-16 min-w-0 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:mb-0">
          <div className="flex flex-col gap-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-2">
            <div className="tp-eyebrow flex items-center gap-3 lg:hidden">
              <span className="tp-num text-primary/90">↳</span> Act on the vault
            </div>
            <UserActions vault={vault} user={user} />
          </div>
        </aside>

        <div className="min-w-0 lg:col-span-8 lg:row-start-2">
          <LoopStage
            index="03"
            name="Fees"
            title="What the range earns."
            lead="Every swap inside the range pays the position a fee."
          >
            <FeesStage vault={vault} />
          </LoopStage>
          <KeepStages vault={vault} />
        </div>
      </div>

      <div className="mt-20 sm:mt-28">
        <ActivityFeed vault={vault} />
      </div>

      <ActShortcut />
    </HighlightProvider>
  );
};

export default Home;
