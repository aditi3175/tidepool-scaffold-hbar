"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { formatPriceSig } from "~~/utils/tidepool/format";

export type RangeChartProps = {
  lower?: number;
  upper?: number;
  spot?: number;
  twap?: number;
  /** The range before the last rebalance, drawn as a dotted outline. */
  previous?: { lower: number; upper: number };
  /** Defaults to "TWAP inside [lower, upper)", the contract's own rule. */
  inRange?: boolean;
  /** Spot and TWAP too far apart: the vault refuses deposits, compounds and rebalances. */
  paused?: boolean;
  /** "SAUCE per WHBAR". */
  unit?: string;
  loading?: boolean;
  height?: number;
  format?: (price: number) => string;
  className?: string;
};

const FLAG_H = 22;
const TOP = FLAG_H + 10;
const BOTTOM = 8;
const CHAR_W = 7.1; // 12px tabular figures, measured for Plex/Instrument; flags only need an estimate
const flagWidth = (text: string) => Math.ceil(text.length * CHAR_W) + 16;

/**
 * The range chart: the position's range as a band, spot as a solid line, the TWAP as a dashed line, and Min / Current /
 * Max underneath. No axis numbers: the three figures carry the values.
 */
export const RangeChart = ({
  lower,
  upper,
  spot,
  twap,
  previous,
  inRange,
  paused = false,
  unit,
  loading = false,
  height = 168,
  format = formatPriceSig,
  className = "",
}: RangeChartProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const gradientId = `range-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const ready =
    !loading && lower !== undefined && upper !== undefined && spot !== undefined && twap !== undefined && upper > lower;
  const earning = inRange ?? (ready ? twap! >= lower! && twap! < upper! : true);
  // The band shows the range's state; "paused" only marks the spot-TWAP gap and the Current figure.
  const tone = earning ? "accent" : "warn";
  const toneVar = tone === "accent" ? "var(--color-ui-accent)" : "var(--color-ui-warn)";

  let plot: ReactNode = null;
  if (width > 0 && ready) {
    const values = [lower!, upper!, spot!, twap!, ...(previous ? [previous.lower, previous.upper] : [])];
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.16, (upper! - lower!) * 0.35);
    const min = lo - pad;
    const max = hi + pad;
    const x = (p: number) => ((p - min) / (max - min)) * width;
    const y0 = TOP;
    const y1 = height - BOTTOM;

    const xs = x(spot!);
    const xt = x(twap!);
    const together = Math.abs(xs - xt) < 3 || format(spot!) === format(twap!);

    // Flags: one merged flag, or two that open away from each other so they never overlap.
    const flags: { text: string; x: number; align: "left" | "right" | "center"; strong: boolean }[] = together
      ? [{ text: `${format(spot!)} · spot = TWAP`, x: xs, align: "center", strong: true }]
      : [
          { text: `Spot ${format(spot!)}`, x: xs, align: xs < xt ? "right" : "left", strong: true },
          { text: `TWAP ${format(twap!)}`, x: xt, align: xt < xs ? "right" : "left", strong: false },
        ];

    plot = (
      <>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={toneVar} stopOpacity={0.16} />
            <stop offset="1" stopColor={toneVar} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <line x1={0} x2={width} y1={y1 + 0.5} y2={y1 + 0.5} stroke="var(--color-ui-line-strong)" strokeWidth={1} />

        {previous && (
          <rect
            x={x(previous.lower)}
            y={y0}
            width={Math.max(1, x(previous.upper) - x(previous.lower))}
            height={y1 - y0}
            fill="none"
            stroke="var(--color-ui-faint)"
            strokeDasharray="2 3"
            strokeWidth={1}
          />
        )}

        {/* The range. */}
        <rect x={x(lower!)} y={y0} width={x(upper!) - x(lower!)} height={y1 - y0} fill={`url(#${gradientId})`} />
        <line x1={x(lower!)} x2={x(lower!)} y1={y0} y2={y1} stroke={toneVar} strokeOpacity={0.75} strokeWidth={1} />
        <line x1={x(upper!)} x2={x(upper!)} y1={y0} y2={y1} stroke={toneVar} strokeOpacity={0.75} strokeWidth={1} />

        {/* Spot and TWAP apart: mark the gap the guard measures. */}
        {paused && !together && (
          <rect
            x={Math.min(xs, xt)}
            y={y1 - 3}
            width={Math.abs(xs - xt)}
            height={3}
            fill="var(--color-ui-warn)"
            fillOpacity={0.8}
          />
        )}

        <line
          x1={xt}
          x2={xt}
          y1={y0}
          y2={y1}
          stroke="var(--color-ui-twap)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={together ? 0 : 1}
        />
        <line x1={xs} x2={xs} y1={y0 - 4} y2={y1} stroke="var(--color-ui-fg)" strokeWidth={2} />

        {flags.map(flag => {
          const w = flagWidth(flag.text);
          const raw = flag.align === "center" ? flag.x - w / 2 : flag.align === "right" ? flag.x - w : flag.x;
          const fx = Math.max(0, Math.min(width - w, raw));
          return (
            <g key={flag.text}>
              <rect
                x={fx}
                y={0}
                width={w}
                height={FLAG_H}
                rx={6}
                fill={flag.strong ? "var(--color-ui-raised)" : "var(--color-ui-panel)"}
                stroke="var(--color-ui-line-strong)"
              />
              <text
                x={fx + w / 2}
                y={FLAG_H / 2 + 4}
                textAnchor="middle"
                fontSize={12}
                fill={flag.strong ? "var(--color-ui-fg)" : "var(--color-ui-twap)"}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {flag.text}
              </text>
            </g>
          );
        })}
      </>
    );
  } else if (width > 0) {
    // Loading: the same frame, a soft band and a label. Never an empty box.
    plot = (
      <>
        <line
          x1={0}
          x2={width}
          y1={height - BOTTOM + 0.5}
          y2={height - BOTTOM + 0.5}
          stroke="var(--color-ui-line-strong)"
        />
        <rect
          x={width * 0.32}
          y={TOP}
          width={width * 0.36}
          height={height - TOP - BOTTOM}
          fill="var(--color-ui-fg)"
          fillOpacity={0.03}
          stroke="var(--color-ui-line-strong)"
          strokeDasharray="3 3"
          className="motion-safe:animate-pulse"
        />
        <text
          x={width / 2}
          y={(TOP + height - BOTTOM) / 2 + 4}
          textAnchor="middle"
          fontSize={13}
          fill="var(--color-ui-muted)"
        >
          Reading the vault…
        </text>
      </>
    );
  }

  const label = ready
    ? `Range ${format(lower!)} to ${format(upper!)}${unit ? ` ${unit}` : ""}; spot ${format(spot!)}, TWAP ${format(twap!)}; ${
        paused ? "paused: spot and TWAP too far apart" : earning ? "in range" : "out of range"
      }`
    : "Range chart, loading";

  return (
    <figure className={`m-0 ${className}`}>
      <div ref={wrapRef} className="w-full" style={{ height }}>
        <svg width={width} height={height} role="img" aria-label={label} className="block overflow-visible">
          {plot}
        </svg>
      </div>
      <figcaption className="mt-4 grid grid-cols-3 gap-4">
        <Figure label="Min price" value={ready ? format(lower!) : undefined} />
        <Figure
          label="Current"
          value={ready ? format(spot!) : undefined}
          tone={ready ? (paused ? "warn" : tone) : undefined}
          note={ready && !earning ? "Out of range" : ready && paused ? "Paused" : undefined}
          center
        />
        <Figure label="Max price" value={ready ? format(upper!) : undefined} right />
      </figcaption>
      {unit && <p className="mt-2 text-center text-xs text-ui-faint">Prices in {unit}</p>}
    </figure>
  );
};

const Figure = ({
  label,
  value,
  tone,
  note,
  center,
  right,
}: {
  label: string;
  value?: string;
  tone?: "accent" | "warn";
  note?: string;
  center?: boolean;
  right?: boolean;
}) => (
  <div className={center ? "text-center" : right ? "text-right" : ""}>
    <div className="text-xs text-ui-muted">{label}</div>
    {value === undefined ? (
      <div
        className={`mt-1.5 h-6 w-16 rounded bg-ui-raised motion-safe:animate-pulse ${center ? "mx-auto" : right ? "ml-auto" : ""}`}
      />
    ) : (
      <div
        className={`mt-1 text-xl font-medium tabular-nums ${
          tone === "accent" ? "text-ui-accent" : tone === "warn" ? "text-ui-warn" : "text-ui-fg"
        }`}
      >
        {value}
      </div>
    )}
    {note && <div className="mt-0.5 text-xs text-ui-warn">{note}</div>}
  </div>
);
