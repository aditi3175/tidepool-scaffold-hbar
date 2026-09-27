"use client";

import { RangeChart } from "~~/app/_components/tidepool/RangeChart";
import { VaultStatusPill } from "~~/app/_components/tidepool/VaultHero";
import { Num } from "~~/app/_components/tidepool/motion";
import { ExternalLink, Skeleton } from "~~/app/_components/tidepool/ui";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatAmount, formatDuration, formatPrice, tickToPrice } from "~~/utils/tidepool/math";

const usePrice = (vault: VaultState) => {
  const { decimals0, decimals1 } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined;
  return (tick: number | undefined) =>
    tick === undefined || !ready ? "–" : formatPrice(tickToPrice(tick, decimals0!, decimals1!));
};

/**
 * 01 PRICE: where the market is (spot), the reference the vault trusts (TWAP), and the distance between them against
 * the vault's limit. Large figures, no box.
 */
export const PriceStage = ({ vault }: { vault: VaultState }) => {
  const price = usePrice(vault);
  const deviation =
    vault.spotTick !== undefined && vault.twapTick !== undefined
      ? Math.abs(vault.spotTick - vault.twapTick)
      : undefined;
  const share =
    deviation !== undefined && vault.maxTwapDeviation ? Math.min(1, deviation / vault.maxTwapDeviation) : undefined;
  const over = deviation !== undefined && vault.maxTwapDeviation !== undefined && deviation > vault.maxTwapDeviation;

  return (
    <div className="flex flex-col gap-8">
      {vault.twapUnavailable && (
        <p className="rounded-xl border border-error/20 bg-error/[0.05] px-4 py-3 text-sm text-error">
          The pool&apos;s observation history is shorter than the vault&apos;s TWAP window, so the vault will not
          deposit, compound or rebalance until it grows. Withdrawals still work.
        </p>
      )}
      {vault.priceError && !vault.twapUnavailable && (
        <p className="rounded-xl border border-error/20 bg-error/[0.05] px-4 py-3 text-sm text-error">
          Could not read the pool price: {vault.priceError}
        </p>
      )}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/[0.07]">
        <div className="sm:pr-8">
          <div className="tp-eyebrow">Spot · now</div>
          <Num
            id="pos-spot"
            text={price(vault.spotTick)}
            className="mt-3 block text-4xl leading-none text-base-content"
          />
          <div className="tp-num mt-3 text-xs text-base-content/45">tick {vault.spotTick ?? "–"}</div>
        </div>
        <div className="sm:px-8">
          <div className="tp-eyebrow">TWAP · reference</div>
          <Num id="pos-twap" text={price(vault.twapTick)} className="mt-3 block text-4xl leading-none text-secondary" />
          <div className="tp-num mt-3 text-xs text-base-content/45">
            tick {vault.twapTick ?? "–"}
            {vault.twapWindow !== undefined && ` · ${formatDuration(vault.twapWindow)} window`}
          </div>
        </div>
        <div className="sm:pl-8">
          <div className="tp-eyebrow">Apart</div>
          <div className="mt-3 flex items-baseline gap-2">
            {deviation === undefined ? (
              <span className="tp-num text-4xl leading-none">–</span>
            ) : (
              <Num id="pos-deviation" text={String(deviation)} className="text-4xl leading-none text-base-content" />
            )}
            <span className="text-sm text-base-content/45">ticks</span>
          </div>
          {share !== undefined && (
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${over ? "bg-error" : "bg-[linear-gradient(90deg,#6e7bff,#3ee0c5)]"}`}
                style={{ width: `${Math.max(2, share * 100)}%` }}
              />
            </div>
          )}
          {vault.maxTwapDeviation !== undefined && (
            <div className="mt-2 text-[11px] leading-snug text-base-content/45">
              The vault acts only within {vault.maxTwapDeviation} ticks.
            </div>
          )}
        </div>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-base-content/50">
        Tidepool never acts on the spot price alone. It uses the time-weighted average (TWAP), and it pauses deposits,
        compounds and rebalances while spot is more than the limit away from it. Withdrawals always work.
      </p>
    </div>
  );
};

/**
 * The range visual: the position's bounds with the spot and TWAP markers, green in range and amber out of range.
 * The dashboard's centrepiece, shown in the hero. Loading and no-position states keep the same footprint.
 */
export const RangeVisual = ({ vault }: { vault: VaultState }) => {
  const { decimals0, decimals1, symbol0, symbol1, twapTick, tickLower, tickUpper, spotTick } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined;

  if (!ready || vault.hasPosition === undefined)
    return <Skeleton className="h-[22rem] w-full rounded-2xl sm:h-[28rem]" />;

  if (vault.hasPosition === false) {
    return (
      <div className="flex h-[22rem] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 px-6 text-center sm:h-[28rem]">
        <VaultStatusPill vault={vault} size="lg" />
        <p className="mx-auto mt-4 max-w-md text-sm text-base-content/55">
          The vault has no liquidity position yet. The first Compound opens one, centred on the TWAP.
        </p>
      </div>
    );
  }

  if (tickLower === undefined || tickUpper === undefined || spotTick === undefined || twapTick === undefined) {
    return <Skeleton className="h-[22rem] w-full rounded-2xl sm:h-[28rem]" />;
  }

  return (
    <RangeChart
      tickLower={tickLower}
      tickUpper={tickUpper}
      spotTick={spotTick}
      twapTick={twapTick}
      decimals0={decimals0!}
      decimals1={decimals1!}
      quoteLabel={`${symbol1 ?? "token1"} per ${symbol0 ?? "token0"}`}
      tall
    />
  );
};

/** 02 RANGE: where the TWAP sits inside the range drawn in the hero, and the position's details. */
export const RangeStage = ({ vault }: { vault: VaultState }) => {
  const price = usePrice(vault);
  const { decimals0, decimals1, twapTick, tickLower, tickUpper } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined;
  const statusKnown =
    vault.hasPosition &&
    vault.inRange !== undefined &&
    twapTick !== undefined &&
    tickLower !== undefined &&
    tickUpper !== undefined;

  if (!ready || vault.hasPosition === undefined) return <Skeleton className="h-40 w-full rounded-2xl" />;

  if (vault.hasPosition === false) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-base-content/55">
        No position yet. The first Compound opens one, centred on the TWAP.
      </p>
    );
  }

  // Distance ruler (TWAP relative to the bounds) — tick arithmetic on values already read.
  const span = statusKnown ? tickUpper! - tickLower! : 0;
  const along = statusKnown && span > 0 ? Math.min(1, Math.max(0, (twapTick! - tickLower!) / span)) : undefined;

  return (
    <div className="flex flex-col gap-6">
      {statusKnown && (
        <div role="status">
          <p className="text-sm leading-relaxed text-base-content/70">
            {vault.inRange ? (
              <>
                The TWAP (tick <span className="tp-num">{twapTick}</span>) is inside the range: the position&apos;s
                liquidity sits around the market price and earns swap fees on trades inside it.
              </>
            ) : twapTick! < tickLower! ? (
              <>
                The TWAP (tick <span className="tp-num">{twapTick}</span>) is{" "}
                <span className="tp-num">{tickLower! - twapTick!}</span> ticks below the range. A rebalance can
                re-centre it once the keeper conditions are met.
              </>
            ) : (
              <>
                The TWAP (tick <span className="tp-num">{twapTick}</span>) is at or above the upper bound (by{" "}
                <span className="tp-num">{twapTick! - tickUpper!}</span> ticks). A rebalance can re-centre it once the
                keeper conditions are met.
              </>
            )}
          </p>
        </div>
      )}

      {/* Distance ruler: where the TWAP sits between the bounds */}
      {statusKnown && (
        <div>
          <div className="relative h-2 rounded-full bg-white/[0.05]">
            <div
              className={`absolute inset-y-0 left-0 rounded-l-full transition-[width,background-color] duration-700 ${
                vault.inRange ? "bg-success/25" : "bg-warning/25"
              }`}
              style={{ width: `${(along ?? 0) * 100}%` }}
            />
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#07080b] bg-secondary transition-[left] duration-700"
              style={{ left: `${(along ?? 0) * 100}%` }}
              aria-hidden
            />
          </div>
          <div className="tp-num mt-2 flex justify-between text-[11px] text-base-content/50">
            <span>
              ← {Math.max(0, twapTick! - tickLower!)} ticks to lower ({price(tickLower)})
            </span>
            <span>
              {Math.max(0, tickUpper! - twapTick!)} ticks to upper ({price(tickUpper)}) →
            </span>
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-white/[0.07] pt-6 sm:grid-cols-4">
        <div>
          <dt className="tp-eyebrow">Range</dt>
          <dd className="m-0 mt-1.5 text-sm">
            <Num id="pos-lower" text={price(tickLower)} /> – <Num id="pos-upper" text={price(tickUpper)} />
            <span className="tp-num mt-1 block text-[11px] text-base-content/45">
              ticks [{tickLower}, {tickUpper})
            </span>
          </dd>
        </div>
        <div>
          <dt className="tp-eyebrow">LP NFT</dt>
          <dd className="m-0 mt-1.5 text-sm">
            {vault.positionSerial !== undefined && vault.positionNft ? (
              <ExternalLink className="tp-num" href={hashscan.nft(vault.positionNft, vault.positionSerial)}>
                #{vault.positionSerial.toString()}
              </ExternalLink>
            ) : (
              <span className="tp-num">#{vault.positionSerial?.toString() ?? "–"}</span>
            )}
            <span className="mt-1 block text-[11px] text-base-content/45">Held by the vault</span>
          </dd>
        </div>
        <div>
          <dt className="tp-eyebrow">Liquidity</dt>
          <dd className="m-0 mt-1.5 text-sm">
            <Num id="pos-liquidity" text={formatAmount(vault.liquidity, 0)} />
            <span className="mt-1 block text-[11px] text-base-content/45">Size of the position</span>
          </dd>
        </div>
        <div>
          <dt className="tp-eyebrow">Range settings</dt>
          <dd className="m-0 mt-1.5 text-sm">
            <span className="tp-num">± {vault.halfWidth ?? "–"} ticks</span>
            <span className="mt-1 block text-[11px] text-base-content/45">
              {[
                vault.rebalanceCooldown !== undefined && `cooldown ${formatDuration(vault.rebalanceCooldown)}`,
                vault.swapSlippageBps !== undefined && `slippage ${vault.swapSlippageBps / 100}%`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </dd>
        </div>
      </dl>
      {vault.pool && (
        <p className="text-[11px] text-base-content/40">
          One SaucerSwap V2 position, held by the vault.{" "}
          <ExternalLink href={hashscan.contract(vault.pool)}>Pool on HashScan</ExternalLink>
        </p>
      )}
    </div>
  );
};
