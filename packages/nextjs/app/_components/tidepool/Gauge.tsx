"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The tide gauge: Tidepool's signature element. A horizontal ruler of ticks with price labels; the position's range
 * is a filled band between two marks, the spot price is the water line (solid), and the TWAP is a dashed line.
 * Teal band when the TWAP is inside the range, amber when it has left it (the contract's own in-range rule).
 * Labels are placed by measured width so they never overlap: spot and TWAP merge into one label when close, and ruler
 * labels give way to the range bounds. A spot or TWAP beyond the ruler is shown as an edge marker ("45.87 →"), not a line.
 */

export type GaugeProps = {
  /** Range bounds, in ticks ([lower, upper) as in the contract). */
  lower: number;
  upper: number;
  /** Spot and TWAP ticks. Either may be missing while loading. */
  spot?: number;
  twap?: number;
  /** Formats a tick as a price for labels. */
  price: (tick: number) => string;
  /** A previous range, drawn as a dashed outline (used to illustrate a rebalance). */
  ghost?: { lower: number; upper: number };
  /** A fixed axis (ticks). Default: the range with half its width on each side. */
  domain?: { min: number; max: number };
  size?: "lg" | "md";
  /** Accessible description prefix, e.g. "WHBAR/SAUCE vault". */
  label?: string;
};

// Approximate width of a 12px Geist Mono character plus label padding, for collision checks.
const CHAR_PX = 7.3;
const PAD_PX = 12;
const GAP_PX = 6;

type Placed = { text: string; x: number; width: number; tone: string; key: string };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A 1-2-5 step close to `raw`. */
function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Keeps a label of `width` px centred on `x` inside [0, total]. Returns its left edge. */
const leftEdge = (x: number, width: number, total: number) => Math.min(Math.max(x - width / 2, 0), total - width);

export const Gauge = ({ lower, upper, spot, twap, price, ghost, domain, size = "lg", label }: GaugeProps) => {
  const [ref, width] = useWidth<HTMLDivElement>();

  const span = upper - lower;
  const min = domain?.min ?? lower - span / 2;
  const max = domain?.max ?? upper + span / 2;
  /** Where a tick sits relative to the visible ruler. */
  const side = (tick: number) => (tick < min ? "left" : tick > max ? "right" : "in");
  const pct = (tick: number) => ((Math.min(Math.max(tick, min), max) - min) / (max - min)) * 100;
  const px = (tick: number) => (pct(tick) / 100) * width;

  const reference = twap ?? spot;
  const inRange = reference === undefined ? undefined : reference >= lower && reference < upper;
  const band =
    inRange === false
      ? "border-amber bg-amber/15"
      : inRange === true
        ? "border-teal bg-teal/15"
        : "border-line bg-raised";
  const boundTone = inRange === false ? "text-amber" : "text-teal";

  // Ruler ticks: about one minor tick every 12px, a labelled major tick every fifth.
  const minorCount = Math.max(10, Math.floor((width || 600) / 12));
  const step = niceStep((max - min) / minorCount);
  const firstTick = Math.ceil(min / step) * step;
  const ticks: { tick: number; major: boolean }[] = [];
  for (let t = firstTick, i = 0; t <= max && i < 400; t += step, i++) {
    ticks.push({ tick: t, major: Math.round(t / step) % 5 === 0 });
  }

  // --- Marker labels (top row): spot and TWAP, merged when they would touch.
  const markers: Placed[] = [];
  if (width > 0) {
    // Beyond the ruler: an arrow towards the edge, anchored at that edge.
    const arrow = (text: string, where: string) =>
      where === "left" ? `← ${text}` : where === "right" ? `${text} →` : text;
    const make = (text: string, tick: number, tone: string, key: string): Placed => {
      const where = side(tick);
      const shown = arrow(text, where);
      return {
        text: shown,
        x: where === "left" ? 0 : where === "right" ? width : px(tick),
        width: shown.length * CHAR_PX + PAD_PX,
        tone,
        key,
      };
    };
    const s = spot !== undefined ? make(`Spot ${price(spot)}`, spot, "text-fg", "spot") : undefined;
    const t = twap !== undefined ? make(`TWAP ${price(twap)}`, twap, "text-twap", "twap") : undefined;
    if (s && t) {
      const sLeft = leftEdge(s.x, s.width, width);
      const tLeft = leftEdge(t.x, t.width, width);
      const overlap = sLeft < tLeft + t.width + GAP_PX && tLeft < sLeft + s.width + GAP_PX;
      if (overlap) {
        const same = price(spot!) === price(twap!);
        const base = same ? `Spot = TWAP ${price(spot!)}` : `Spot ${price(spot!)} · TWAP ${price(twap!)}`;
        // Merged: towards whichever edge a marker is beyond, otherwise centred between the two.
        const edge = side(spot!) !== "in" ? side(spot!) : side(twap!);
        const text = arrow(base, edge);
        const x = edge === "left" ? 0 : edge === "right" ? width : (s.x + t.x) / 2;
        markers.push({ text, x, width: text.length * CHAR_PX + PAD_PX, tone: "text-fg", key: "both" });
      } else {
        markers.push(s, t);
      }
    } else if (s) markers.push(s);
    else if (t) markers.push(t);
  }

  // --- Ruler labels (bottom row): range bounds first, then major ticks that do not collide with anything placed.
  const ruler: Placed[] = [];
  if (width > 0) {
    const fits = (candidate: Placed) => {
      const left = leftEdge(candidate.x, candidate.width, width);
      return ruler.every(other => {
        const otherLeft = leftEdge(other.x, other.width, width);
        return left + candidate.width + GAP_PX <= otherLeft || otherLeft + other.width + GAP_PX <= left;
      });
    };
    const lowText = price(lower);
    const highText = price(upper);
    const low: Placed = {
      text: lowText,
      x: px(lower),
      width: lowText.length * CHAR_PX + PAD_PX,
      tone: boundTone,
      key: "lo",
    };
    const high: Placed = {
      text: highText,
      x: px(upper),
      width: highText.length * CHAR_PX + PAD_PX,
      tone: boundTone,
      key: "hi",
    };
    ruler.push(low);
    if (fits(high)) ruler.push(high);
    else {
      // Bounds too close for two labels: one "low – high" label centred on the band.
      ruler.pop();
      const text = `${lowText} – ${highText}`;
      ruler.push({
        text,
        x: (low.x + high.x) / 2,
        width: text.length * CHAR_PX + PAD_PX,
        tone: boundTone,
        key: "range",
      });
    }
    for (const { tick, major } of ticks) {
      if (!major) continue;
      const text = price(tick);
      const candidate: Placed = {
        text,
        x: px(tick),
        width: text.length * CHAR_PX + PAD_PX,
        tone: "text-muted",
        key: `t${tick}`,
      };
      if (fits(candidate)) ruler.push(candidate);
    }
  }

  const water = size === "lg" ? "h-28" : "h-20";
  const glide = "motion-safe:transition-[left,width,background-color,border-color] motion-safe:duration-200";
  const description = `${label ? `${label}: ` : ""}range ${price(lower)} to ${price(upper)}${
    spot !== undefined ? `, spot ${price(spot)}` : ""
  }${twap !== undefined ? `, TWAP ${price(twap)}` : ""}${
    inRange === undefined ? "" : inRange ? ", in range" : ", out of range"
  }`;

  return (
    <figure className="m-0 select-none" role="img" aria-label={description}>
      <div ref={ref} className="relative w-full">
        {/* Marker labels */}
        <div className="relative h-7">
          {markers.map(m => (
            <span
              key={m.key}
              className={`tp-num absolute top-0 whitespace-nowrap rounded border border-line bg-raised px-1.5 py-0.5 text-xs ${m.tone} ${glide}`}
              style={{ left: leftEdge(m.x, m.width, width) }}
            >
              {m.text}
            </span>
          ))}
        </div>

        {/* Water: band, previous range, TWAP and spot lines */}
        <div className={`relative ${water} border-b border-line`}>
          {ghost && (
            <div
              className="absolute inset-y-0 border border-dashed border-muted/60"
              style={{ left: `${pct(ghost.lower)}%`, width: `${pct(ghost.upper) - pct(ghost.lower)}%` }}
              aria-hidden
            />
          )}
          <div
            className={`absolute inset-y-0 border-x ${band} ${glide}`}
            style={{ left: `${pct(lower)}%`, width: `${pct(upper) - pct(lower)}%` }}
            aria-hidden
          />
          {twap !== undefined && side(twap) === "in" && (
            <div
              className={`absolute -top-1 bottom-0 w-0 border-l-2 border-dashed border-twap ${glide}`}
              style={{ left: `calc(${pct(twap)}% - 1px)` }}
              aria-hidden
            />
          )}
          {spot !== undefined && side(spot) === "in" && (
            <div
              className={`absolute -top-1 bottom-0 w-0.5 bg-fg ${glide}`}
              style={{ left: `calc(${pct(spot)}% - 1px)` }}
              aria-hidden
            />
          )}
        </div>

        {/* Ruler */}
        <svg className="block h-3 w-full" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
          {ticks.map(({ tick, major }) => (
            <line
              key={tick}
              x1={pct(tick)}
              x2={pct(tick)}
              y1={0}
              y2={major ? 12 : 6}
              stroke={major ? "#8a9bab" : "#1c2b38"}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {[lower, upper].map(t => (
            <line
              key={`b${t}`}
              x1={pct(t)}
              x2={pct(t)}
              y1={0}
              y2={12}
              stroke={inRange === false ? "#f5a524" : "#2dd4bf"}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className="relative mt-1 h-4">
          {ruler.map(r => (
            <span
              key={r.key}
              className={`tp-num absolute top-0 whitespace-nowrap px-1.5 text-xs leading-4 ${r.tone} ${glide}`}
              style={{ left: leftEdge(r.x, r.width, width) }}
            >
              {r.text}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
};
