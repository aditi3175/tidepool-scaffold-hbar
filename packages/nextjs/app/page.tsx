"use client";

import { ActivityFeed } from "./_components/tidepool/ActivityFeed";
import { DepositCard } from "./_components/tidepool/DepositCard";
import { KeeperCard } from "./_components/tidepool/KeeperCard";
import { RangeChart } from "./_components/tidepool/RangeChart";
import { WithdrawCard } from "./_components/tidepool/WithdrawCard";
import type { NextPage } from "next";
import { formatUnits } from "viem";
import { useVault } from "~~/hooks/tidepool/useVault";
import { HASHSCAN_URL } from "~~/utils/tidepool/constants";

const Home: NextPage = () => {
  const vault = useVault();
  const { symbol0, symbol1, decimals0, decimals1, total0, total1 } = vault;
  const ready = vault.address && symbol0 && symbol1 && decimals0 !== undefined && decimals1 !== undefined;

  if (vault.isLoading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!vault.address) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center">
        <h1 className="text-2xl font-bold">Tidepool</h1>
        <p className="mt-4">
          No TidepoolVault deployment found for the selected network. Deploy one with{" "}
          <code>npm run hardhat:deploy --network hederaTestnet</code> or switch the wallet to Hedera Testnet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">
          Tidepool · {symbol0 ?? "…"}/{symbol1 ?? "…"}
        </h1>
        <p className="opacity-70">
          A SaucerSwap V2 position that compounds its fees and re-centres itself.{" "}
          <a className="link" href={`${HASHSCAN_URL}/contract/${vault.address}`} target="_blank" rel="noreferrer">
            Vault on HashScan
          </a>
        </p>
      </header>

      {ready && (
        <section className="card bg-base-100 shadow">
          <div className="card-body gap-4">
            <div className="flex flex-wrap gap-2">
              {vault.twapError ? (
                <span className="badge badge-error">TWAP unavailable</span>
              ) : vault.positionSerial === 0n ? (
                <span className="badge">No position yet</span>
              ) : (
                <span className={`badge ${vault.inRange ? "badge-success" : "badge-warning"}`}>
                  {vault.inRange ? "In range, earning fees" : "Out of range, rebalance available"}
                </span>
              )}
              {vault.positionSerial ? (
                <span className="badge badge-ghost">LP NFT #{vault.positionSerial.toString()}</span>
              ) : null}
            </div>
            {vault.positionSerial &&
            vault.tickLower !== undefined &&
            vault.tickUpper !== undefined &&
            vault.spotTick !== undefined &&
            vault.twapTick !== undefined ? (
              <RangeChart
                tickLower={vault.tickLower}
                tickUpper={vault.tickUpper}
                spotTick={vault.spotTick}
                twapTick={vault.twapTick}
                decimals0={decimals0}
                decimals1={decimals1}
                quoteLabel={`${symbol1} per ${symbol0}`}
              />
            ) : null}
            <div className="stats stats-vertical md:stats-horizontal">
              <div className="stat">
                <div className="stat-title">{symbol0} held</div>
                <div className="stat-value text-2xl">{total0 === undefined ? "-" : formatUnits(total0, decimals0)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">{symbol1} held</div>
                <div className="stat-value text-2xl">{total1 === undefined ? "-" : formatUnits(total1, decimals1)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Shares outstanding</div>
                <div className="stat-value text-2xl">
                  {vault.totalShares === undefined ? "-" : formatUnits(vault.totalShares, 8)}
                </div>
              </div>
            </div>
            <p className="text-xs opacity-60">
              Testnet pool prices are set by testnet traders and do not track real market prices.
            </p>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <DepositCard vault={vault} />
        <WithdrawCard vault={vault} />
        <KeeperCard vault={vault} />
      </div>

      <ActivityFeed vault={vault.address} abi={vault.abi} />
    </div>
  );
};

export default Home;
