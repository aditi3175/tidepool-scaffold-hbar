"use client";

import { Skeleton, TokenAmount } from "~~/app/_components/tidepool/ui";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { ACTIVITY_LIMIT, useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { formatAmount } from "~~/utils/tidepool/math";

const big = (value: unknown) => (typeof value === "bigint" ? value : 0n);

/**
 * 03 FEES: what the position has earned, from the vault's own FeesCollected events (same mirror-node query as the
 * timeline, so no extra request), plus the position's fees owed as reported by the position manager.
 */
export const FeesStage = ({ vault }: { vault: VaultState }) => {
  const { data: events, isLoading } = useVaultActivity(vault.address, vault.abi);
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  // Oldest first, so the bars read left to right in time.
  const fees = (events ?? []).filter(event => event.name === "FeesCollected").reverse();
  const total0 = fees.reduce((sum, event) => sum + big(event.args.fee0), 0n);
  const total1 = fees.reduce((sum, event) => sum + big(event.args.fee1), 0n);
  const max0 = fees.reduce((m, event) => (big(event.args.fee0) > m ? big(event.args.fee0) : m), 0n);
  const max1 = fees.reduce((m, event) => (big(event.args.fee1) > m ? big(event.args.fee1) : m), 0n);
  const height = (value: bigint, max: bigint) => (max === 0n ? 0 : Math.max(4, Number((value * 100n) / max)));

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="tp-eyebrow">Collected into the vault</div>
        {isLoading ? (
          <Skeleton className="mt-4 h-20 w-64" />
        ) : (
          <div className="mt-3 flex flex-col gap-1 text-[2.2rem] leading-tight tracking-tight">
            <TokenAmount id="fees-total0" amount={formatAmount(total0, decimals0)} symbol={symbol0} />
            <TokenAmount id="fees-total1" amount={formatAmount(total1, decimals1)} symbol={symbol1} />
          </div>
        )}
        <p className="mt-2 text-[11px] leading-snug text-base-content/45">
          Sum of the {fees.length} FeesCollected events in the vault&apos;s last {ACTIVITY_LIMIT} mirror-node logs.
        </p>

        <div className="mt-6 border-t border-white/[0.07] pt-5">
          <div className="tp-eyebrow">Fees owed</div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-lg">
            <TokenAmount id="pos-owed0" amount={formatAmount(vault.tokensOwed0, decimals0)} symbol={symbol0} />
            <TokenAmount id="pos-owed1" amount={formatAmount(vault.tokensOwed1, decimals1)} symbol={symbol1} />
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-base-content/45">
            Fees owed — updates on next collection. Not the live claimable amount.
          </p>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="flex items-baseline justify-between">
          <div className="tp-eyebrow">Each collection</div>
          <div className="flex gap-4 text-[11px] text-base-content/50">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#8fa3ff]" aria-hidden /> {symbol0}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-secondary" aria-hidden /> {symbol1}
            </span>
          </div>
        </div>
        {fees.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-white/12 px-5 py-10 text-center text-sm text-base-content/50">
            {isLoading ? "Loading…" : "No fee collections in the recent activity yet."}
          </p>
        ) : (
          <div
            className="mt-4 flex h-44 items-end gap-2 border-b border-white/[0.1] pb-px"
            role="img"
            aria-label={`${fees.length} fee collections`}
          >
            {fees.map(event => {
              const f0 = big(event.args.fee0);
              const f1 = big(event.args.fee1);
              return (
                <div
                  key={`${event.transactionHash}-${event.logIndex}`}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-1"
                  title={`${new Date(event.timestamp * 1000).toLocaleString()}: ${formatAmount(f0, decimals0)} ${symbol0} + ${formatAmount(f1, decimals1)} ${symbol1}`}
                >
                  <span
                    className="w-full max-w-[14px] rounded-t-sm bg-[#8fa3ff]/70 transition-[height,background-color] duration-700 group-hover:bg-[#8fa3ff]"
                    style={{ height: `${height(f0, max0)}%` }}
                  />
                  <span
                    className="w-full max-w-[14px] rounded-t-sm bg-secondary/70 transition-[height,background-color] duration-700 group-hover:bg-secondary"
                    style={{ height: `${height(f1, max1)}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-base-content/50">
          Swap fees accrue to the position on trades inside its range. The vault collects them into its idle balance on
          every deposit, withdrawal, compound and rebalance — and Compound adds them back to the position.
        </p>
        <p className="mt-1 text-[11px] text-base-content/40">
          Bars are scaled per token (each to its own largest collection); hover a bar for the amounts.
        </p>
      </div>
    </div>
  );
};
