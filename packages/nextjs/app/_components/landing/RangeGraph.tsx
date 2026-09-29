"use client";

import { useEffect, useRef, useState } from "react";
import { priceDomain } from "~~/components/pulse/FlowChart";
import { formatPriceSig } from "~~/utils/tidepool/format";

/** Round axis steps: 1, 2 or 5 times a power of ten. */
const niceStep = (span: number, target = 6) => {
  const raw = span / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = raw / pow;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
};

// Fixed pseudo-random texture for the band (the same on server and client).
const DOTS = Array.from({ length: 46 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return { fx: a - Math.floor(a), fy: b - Math.floor(b), r: 1 + ((i * 7) % 5) * 0.35, d: (i % 9) * 0.35 };
});

/**
 * The range as a price axis: the band between lower and upper, spot as a glowing line, zone labels and a legend.
 * The dots are texture, not trades.
 */
export const RangeGraph = ({
  lower,
  upper,
  spot,
  twap,
  inRange,
}: {
  lower?: number;
  upper?: number;
  spot?: number;
  twap?: number;
  inRange?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const H = 210;
  const top = 34;
  const base = 164;
  const ready = lower !== undefined && upper !== undefined && spot !== undefined && width > 0;
  const earning = inRange !== false;

  let body = null;
  if (ready) {
    const { min, max } = priceDomain(lower, upper, [spot, twap ?? spot]);
    const x = (p: number) => ((p - min) / (max - min)) * width;
    const x0 = x(lower);
    const x1 = x(upper);
    const xs = x(spot);
    const step = niceStep(max - min);
    const ticks: number[] = [];
    for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);
    const tone = earning ? "#2EE6C8" : "#FFB020";
    const labelY = top - 14;

    body = (
      <>
        <defs>
          <linearGradient id="rg-band" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={tone} stopOpacity="0.28" />
            <stop offset="1" stopColor={tone} stopOpacity="0.03" />
          </linearGradient>
          <filter id="rg-glow" x="-200%" y="-50%" width="500%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Zone labels */}
        {x0 > 90 && (
          <text x={x0 / 2} y={labelY} textAnchor="middle" fontSize={11} fill="rgba(148,169,167,0.8)">
            Out of range
          </text>
        )}
        <text x={(x0 + x1) / 2} y={labelY} textAnchor="middle" fontSize={11} fill={tone}>
          {earning ? "In range (earning fees)" : "Range (not earning)"}
        </text>
        {width - x1 > 90 && (
          <text x={(x1 + width) / 2} y={labelY} textAnchor="middle" fontSize={11} fill="rgba(148,169,167,0.8)">
            Out of range
          </text>
        )}

        {/* Band */}
        <rect x={x0} y={top} width={x1 - x0} height={base - top} fill="url(#rg-band)" />
        <line x1={x0} x2={x0} y1={top} y2={base} stroke={tone} strokeOpacity={0.8} />
        <line x1={x1} x2={x1} y1={top} y2={base} stroke={tone} strokeOpacity={0.8} />
        {DOTS.map((dot, i) => {
          const inside = i < 34;
          const dx = inside
            ? x0 + dot.fx * (x1 - x0)
            : dot.fx < 0.5
              ? dot.fx * 2 * x0
              : x1 + (dot.fx - 0.5) * 2 * (width - x1);
          return (
            <circle
              key={i}
              cx={dx}
              cy={top + 12 + dot.fy * (base - top - 24)}
              r={dot.r}
              fill={inside ? tone : "#5F7674"}
              opacity={inside ? 0.85 : 0.5}
              className="motion-safe:animate-pulse"
              style={{ animationDelay: `${dot.d}s`, animationDuration: "3s" }}
            />
          );
        })}

        {/* Spot */}
        <line
          x1={xs}
          x2={xs}
          y1={top - 4}
          y2={base}
          stroke={tone}
          strokeWidth={4}
          opacity={0.35}
          filter="url(#rg-glow)"
        />
        <line x1={xs} x2={xs} y1={top - 4} y2={base} stroke="#EEF6F5" strokeWidth={1.5} />
        <circle cx={xs} cy={(top + base) / 2} r={5} fill={tone} />
        <circle
          cx={xs}
          cy={(top + base) / 2}
          r={10}
          fill={tone}
          opacity={0.25}
          className="motion-safe:animate-ping"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />

        {/* Axis */}
        <line x1={0} x2={width} y1={base + 0.5} y2={base + 0.5} stroke="rgba(148,169,167,0.25)" />
        {ticks.map(t => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={base} y2={base + 5} stroke="rgba(148,169,167,0.4)" />
            <text
              x={x(t)}
              y={base + 20}
              textAnchor="middle"
              fontSize={11}
              fill="rgba(148,169,167,0.8)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {t.toFixed(Math.max(0, -Math.floor(Math.log10(step))))}
            </text>
          </g>
        ))}
      </>
    );
  } else if (width > 0) {
    body = (
      <text x={width / 2} y={H / 2} textAnchor="middle" fontSize={13} fill="rgba(148,169,167,0.9)">
        Reading the vault…
      </text>
    );
  }

  return (
    <div>
      <div ref={ref} className="w-full" style={{ height: H }}>
        <svg
          width={width}
          height={H}
          className="block overflow-visible"
          role="img"
          aria-label={
            ready
              ? `Range ${formatPriceSig(lower)} to ${formatPriceSig(upper)}, current ${formatPriceSig(spot)}, ${earning ? "in range" : "out of range"}`
              : "Range, loading"
          }
        >
          {body}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-8 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-faint" aria-hidden /> Lower:{" "}
          <span className="tabular-nums text-fg">{formatPriceSig(lower)}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neon" aria-hidden /> Current:{" "}
          <span className="tabular-nums text-fg">{formatPriceSig(spot)}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-faint" aria-hidden /> Upper:{" "}
          <span className="tabular-nums text-fg">{formatPriceSig(upper)}</span>
        </span>
      </div>
    </div>
  );
};
