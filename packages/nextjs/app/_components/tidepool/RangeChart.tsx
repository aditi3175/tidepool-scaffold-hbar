"use client";

import { type PointerEvent, useEffect, useState } from "react";
import { Num, onSuccessEvent, useRangeHighlight } from "~~/app/_components/tidepool/motion";
import { formatPrice, tickToPrice } from "~~/utils/tidepool/math";

type Props = {
  tickLower: number;
  tickUpper: number;
  spotTick: number;
  twapTick: number;
  decimals0: number;
  decimals1: number;
  quoteLabel: string;
  /** Large centrepiece size with a hover crosshair (price and tick under the cursor). */
  tall?: boolean;
};

const GRID_LINES = 8;

/** Positions (percent of the axis) that the chart's elements glide between. */
type Layout = { lo: number; hi: number; spot: number; twap: number; visible: boolean };

/**
 * The last layout drawn. When the dashboard remounts on a vault switch, the new chart starts from here and glides to
 * the new vault's layout, so the range visibly moves and resizes instead of snapping.
 */
let lastLayout: Layout | null = null;

/**
 * The position's tick range with the pool's spot and TWAP ticks, on a linear tick axis. Elements are positioned by
 * percentage and move with CSS transitions (no per-frame JavaScript). The axis maths is unchanged.
 */
export const RangeChart = ({
  tickLower,
  tickUpper,
  spotTick,
  twapTick,
  decimals0,
  decimals1,
  quoteLabel,
  tall = false,
}: Props) => {
  const width = tickUpper - tickLower;
  const min = Math.min(tickLower - width / 2, spotTick, twapTick);
  const max = Math.max(tickUpper + width / 2, spotTick, twapTick);
  const x = (tick: number) => ((tick - min) / (max - min)) * 100; // percent of the axis
  const price = (tick: number) => formatPrice(tickToPrice(tick, decimals0, decimals1));
  const inRange = twapTick >= tickLower && twapTick < tickUpper;
  const clamp = (pct: number) => Math.min(94, Math.max(6, pct));
  const highlight = useRangeHighlight();
  const onAxis = (pct: number) => Math.min(100, Math.max(0, pct));

  const target: Layout = { lo: x(tickLower), hi: x(tickUpper), spot: x(spotTick), twap: x(twapTick), visible: true };

  // First paint: the previous chart's layout (vault switch) or a collapsed band at the range centre (first load).
  const [layout, setLayout] = useState<Layout>(() => {
    if (lastLayout) return lastLayout;
    const mid = (target.lo + target.hi) / 2;
    return { lo: mid, hi: mid, spot: target.spot, twap: target.twap, visible: false };
  });
  useEffect(() => {
    // Next frame: move to the real layout; CSS transitions do the animation.
    const raf = requestAnimationFrame(() => setLayout(target));
    lastLayout = target;
    return () => cancelAnimationFrame(raf);
    // `target` is derived from these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.lo, target.hi, target.spot, target.twap]);

  // Hover crosshair: the tick and price under the cursor, read back from the same linear axis.
  const [cursor, setCursor] = useState<number | null>(null);
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!tall || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)));
  };
  const cursorTick = cursor === null ? null : Math.round(min + (cursor / 100) * (max - min));

  // A confirmed transaction: the band glows once.
  const [glow, setGlow] = useState(0);
  useEffect(() => onSuccessEvent(() => setGlow(g => g + 1)), []);

  const bandTone = inRange
    ? "border-success/70 bg-[linear-gradient(180deg,rgb(74_222_155/0.2),rgb(74_222_155/0.03))]"
    : "border-warning/70 bg-[linear-gradient(180deg,rgb(243_182_76/0.2),rgb(243_182_76/0.03))]";

  return (
    <figure className="m-0" role="img" aria-label={`Position range, spot and TWAP (${quoteLabel})`}>
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#05060a] ${
          tall ? "h-[22rem] cursor-crosshair sm:h-[28rem] lg:h-[min(60vh,34rem)]" : "h-60 sm:h-72"
        }`}
        onPointerMove={onMove}
        onPointerLeave={() => setCursor(null)}
      >
        {/* Static grid */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {Array.from({ length: GRID_LINES - 1 }).map((_, i) => (
            <line
              key={i}
              x1={((i + 1) * 100) / GRID_LINES}
              x2={((i + 1) * 100) / GRID_LINES}
              y1={0}
              y2={100}
              stroke="rgb(255 255 255 / 0.035)"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line x1={0} x2={100} y1={88} y2={88} stroke="rgb(255 255 255 / 0.12)" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* The position range: a channel that opens, moves and resizes */}
        <div
          className={`tp-glide absolute bottom-[12%] top-[14%] border-x border-b-2 motion-reduce:transition-none ${bandTone}`}
          style={{
            left: `${layout.lo}%`,
            width: `${Math.max(0, layout.hi - layout.lo)}%`,
            opacity: layout.visible ? 1 : 0,
          }}
          aria-hidden
        >
          {glow > 0 && (
            <span
              key={glow}
              className="tp-glow-once absolute inset-0 bg-[linear-gradient(180deg,rgb(62_224_197/0.35),transparent)]"
            />
          )}
        </div>

        {/* Hovered Rebalance event: the ranges it recorded (from the event itself) */}
        {highlight && highlight.oldLower !== undefined && highlight.oldUpper !== undefined && (
          <div
            className="tp-fade-in absolute bottom-[12%] top-[10%] border border-dashed border-white/45 bg-white/[0.035]"
            style={{
              left: `${onAxis(x(highlight.oldLower))}%`,
              width: `${Math.max(0, onAxis(x(highlight.oldUpper)) - onAxis(x(highlight.oldLower)))}%`,
            }}
            aria-hidden
          />
        )}
        {highlight && (
          <div
            className="tp-fade-in absolute bottom-[12%] top-[10%] border border-[#8fa3ff]/90 bg-[#6e7bff]/[0.08]"
            style={{
              left: `${onAxis(x(highlight.newLower))}%`,
              width: `${Math.max(0, onAxis(x(highlight.newUpper)) - onAxis(x(highlight.newLower)))}%`,
            }}
            aria-hidden
          />
        )}

        {/* TWAP: the reference the vault acts on — a distinct, static dashed aqua line */}
        <div
          className="tp-glide absolute bottom-[12%] top-[12%] w-0 border-l-[1.5px] border-dashed border-secondary/80"
          style={{ left: `${layout.twap}%`, opacity: layout.visible ? 1 : 0 }}
          aria-hidden
        />
        {/* Spot: the live market price — a bright line with a very soft breathing glow */}
        <div
          className="tp-glide absolute bottom-[12%] top-[6%] -translate-x-1/2"
          style={{ left: `${layout.spot}%`, opacity: layout.visible ? 1 : 0 }}
          aria-hidden
        >
          <span className="tp-breathe absolute inset-y-0 left-1/2 w-[9px] -translate-x-1/2 bg-[#b9b2ff]/25 blur-[3px]" />
          <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-[#d7d2ff]" />
        </div>

        {/* Crosshair readout */}
        {cursor !== null && cursorTick !== null && (
          <>
            <div
              className="pointer-events-none absolute bottom-[12%] top-0 w-px bg-white/25"
              style={{ left: `${cursor}%` }}
              aria-hidden
            />
            <div
              className="tp-num pointer-events-none absolute bottom-[14%] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/15 bg-black/80 px-2 py-1 text-[11px] text-base-content/85"
              style={{ left: `${clamp(cursor)}%` }}
            >
              {price(cursorTick)} · tick {cursorTick}
            </div>
          </>
        )}
        {/* Band label, when the band is wide enough to hold it */}
        {target.hi - target.lo > 18 && !highlight && (
          <div
            className={`tp-glide absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-medium ${
              inRange ? "text-success/75" : "text-warning/75"
            }`}
            style={{ left: `${(layout.lo + layout.hi) / 2}%`, top: "26%", opacity: layout.visible ? 1 : 0 }}
          >
            Liquidity range
          </div>
        )}
        {highlight && (
          <div className="tp-fade-in absolute left-3 top-3 flex flex-wrap gap-2 text-[11px]">
            {highlight.oldLower !== undefined && (
              <span className="rounded-md border border-dashed border-white/40 bg-black/60 px-2 py-0.5 text-base-content/70">
                Previous range
              </span>
            )}
            <span className="rounded-md border border-[#8fa3ff]/70 bg-black/60 px-2 py-0.5 text-[#c9d2ff]">
              {highlight.oldLower !== undefined ? "New range" : "Opened range"}
            </span>
          </div>
        )}
        {/* Spot label (top) */}
        <div
          className="tp-glide absolute top-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#b9b2ff]/40 bg-[#110f1d]/90 px-2 py-0.5 text-[11px] text-[#d7d2ff]"
          style={{ left: `${clamp(layout.spot)}%` }}
        >
          Spot <Num id="chart-spot" text={price(spotTick)} />
        </div>
        {/* TWAP label (lower) */}
        <div
          className="tp-glide absolute -translate-x-1/2 whitespace-nowrap rounded-md border border-secondary/35 bg-[#07161a]/90 px-2 py-0.5 text-[11px] text-secondary"
          style={{ left: `${clamp(layout.twap)}%`, top: "60%" }}
        >
          TWAP <Num id="chart-twap" text={price(twapTick)} />
        </div>
        {/* Range bound labels (axis) */}
        <div
          className="tp-glide absolute bottom-2 -translate-x-1/2 whitespace-nowrap text-[11px] text-base-content/60"
          style={{ left: `${clamp(layout.lo)}%` }}
        >
          <Num id="chart-lower" text={price(tickLower)} />
        </div>
        <div
          className="tp-glide absolute bottom-2 -translate-x-1/2 whitespace-nowrap text-[11px] text-base-content/60"
          style={{ left: `${clamp(layout.hi)}%` }}
        >
          <Num id="chart-upper" text={price(tickUpper)} />
        </div>
      </div>
      <figcaption className="mt-4 grid grid-cols-1 gap-3 text-[11px] leading-snug text-base-content/45 sm:grid-cols-3">
        <span className="flex items-start gap-2.5">
          <span className="mt-0.5 h-3.5 w-0.5 shrink-0 rounded bg-[#d7d2ff] shadow-[0_0_8px_#b9b2ff]" aria-hidden />
          <span>
            <span className="block font-medium text-base-content/80">Current price (spot)</span>
            Where the market is now, from the pool.
          </span>
        </span>
        <span className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 h-3 w-4 shrink-0 rounded-sm border transition-colors duration-500 ${inRange ? "border-success/60 bg-success/20" : "border-warning/60 bg-warning/20"}`}
            aria-hidden
          />
          <span>
            <span className="block font-medium text-base-content/80">Position range</span>
            Where the vault provides liquidity; green in range, amber out of range.
          </span>
        </span>
        <span className="flex items-start gap-2.5">
          <span className="mt-0.5 h-3.5 w-0 shrink-0 border-l-2 border-dashed border-secondary" aria-hidden />
          <span>
            <span className="block font-medium text-base-content/80">TWAP</span>
            The time-weighted reference Tidepool acts on.
          </span>
        </span>
        <span className="tp-num text-base-content/35 sm:col-span-3">Prices in {quoteLabel}</span>
      </figcaption>
    </figure>
  );
};
