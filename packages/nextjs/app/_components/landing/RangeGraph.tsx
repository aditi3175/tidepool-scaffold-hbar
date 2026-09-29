"use client";

import { useEffect, useId, useRef, useState } from "react";
import { priceDomain } from "~~/components/pulse/FlowChart";
import { formatPriceSig } from "~~/utils/tidepool/format";

const TEAL = "#2EE6C8";
const RED = "#FF5470";
const FG = "#EEF6F5";
const MUTED = "#94A9A7";

/**
 * The position as a price bar: out-of-range zones on both sides, the range between two handles, the vault's liquidity
 * as a glow over it (a vault position spreads its liquidity evenly across the range), and the current price marked.
 */
export const RangeGraph = ({
  lower,
  upper,
  spot,
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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const H = 290;
  const barY = 175;
  const barH = 14;
  const ready = lower !== undefined && upper !== undefined && spot !== undefined && width > 0;
  const earning = inRange !== false;

  let body = null;
  if (ready) {
    const { min, max } = priceDomain(lower, upper, [spot]);
    const x = (p: number) => ((p - min) / (max - min)) * width;
    const x0 = x(lower);
    const x1 = x(upper);
    const xs = Math.max(4, Math.min(width - 4, x(spot)));
    const flagW = 118;
    const flagX = Math.max(0, Math.min(width - flagW, xs - flagW / 2));
    const plateauTop = 82;
    const soft = Math.max(24, (x1 - x0) * 0.12);
    const plateau = `M ${x0 - soft * 2} ${barY - 10} C ${x0 - soft} ${barY - 10}, ${x0 - soft * 0.4} ${plateauTop}, ${x0 + soft} ${plateauTop} L ${x1 - soft} ${plateauTop} C ${x1 + soft * 0.4} ${plateauTop}, ${x1 + soft} ${barY - 10}, ${x1 + soft * 2} ${barY - 10} Z`;

    body = (
      <>
        <defs>
          <linearGradient id={`lz${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor={RED} stopOpacity="0" />
            <stop offset="1" stopColor={RED} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`rz${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor={RED} stopOpacity="0.55" />
            <stop offset="1" stopColor={RED} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`in${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor={TEAL} stopOpacity={earning ? 0.75 : 0.35} />
            <stop offset="0.5" stopColor="#8FFFEA" stopOpacity={earning ? 1 : 0.45} />
            <stop offset="1" stopColor={TEAL} stopOpacity={earning ? 0.75 : 0.35} />
          </linearGradient>
          <linearGradient id={`pl${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={TEAL} stopOpacity={earning ? 0.22 : 0.1} />
            <stop offset="1" stopColor={TEAL} stopOpacity="0" />
          </linearGradient>
          <filter id={`gl${uid}`} x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* The vault's liquidity over the range */}
        <path d={plateau} fill={`url(#pl${uid})`} />
        <path
          d={plateau.replace(/ Z$/, "")}
          fill="none"
          stroke={TEAL}
          strokeOpacity={earning ? 0.45 : 0.2}
          strokeWidth={1.2}
        />

        {/* Out-of-range zones */}
        <rect x={0} y={barY - barH / 2} width={x0} height={barH} rx={barH / 2} fill={`url(#lz${uid})`} />
        <rect x={x1} y={barY - barH / 2} width={width - x1} height={barH} rx={barH / 2} fill={`url(#rz${uid})`} />
        {x0 > 110 && (
          <text x={x0 / 2} y={barY + 32} textAnchor="middle" fontSize={12} fill={RED} fillOpacity={0.9}>
            Out of range
          </text>
        )}
        {width - x1 > 110 && (
          <text x={(x1 + width) / 2} y={barY + 32} textAnchor="middle" fontSize={12} fill={RED} fillOpacity={0.9}>
            Out of range
          </text>
        )}

        {/* The range */}
        <rect
          x={x0}
          y={barY - barH / 2}
          width={x1 - x0}
          height={barH}
          fill={TEAL}
          opacity={earning ? 0.6 : 0.25}
          filter={`url(#gl${uid})`}
        />
        <rect x={x0} y={barY - barH / 2} width={x1 - x0} height={barH} rx={3} fill={`url(#in${uid})`} />
        <text x={(x0 + x1) / 2} y={barY + 32} textAnchor="middle" fontSize={12} fill={earning ? TEAL : MUTED}>
          {earning ? "In range (earning fees)" : "The range (earns while price is inside)"}
        </text>

        {/* Handles and their prices */}
        {[
          { at: x0, label: "Lower", value: lower },
          { at: x1, label: "Upper", value: upper },
        ].map(h => (
          <g key={h.label}>
            <rect x={h.at - 5} y={barY - 17} width={10} height={34} rx={5} fill={FG} />
            <text x={h.at} y={barY + 58} textAnchor="middle" fontSize={12} fill={MUTED}>
              {h.label}
            </text>
            <text
              x={h.at}
              y={barY + 80}
              textAnchor="middle"
              fontSize={19}
              fontWeight={700}
              fill={FG}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatPriceSig(h.value)}
            </text>
          </g>
        ))}

        {/* Current price */}
        <line x1={xs} x2={xs} y1={62} y2={barY} stroke={FG} strokeOpacity={0.8} strokeDasharray="3 4" />
        <circle cx={xs} cy={barY} r={6} fill={earning ? FG : RED} stroke="#050B0D" strokeWidth={2} />
        <rect x={flagX} y={8} width={flagW} height={54} rx={10} fill="#0F1C20" stroke="rgba(46,230,200,0.3)" />
        <text x={flagX + flagW / 2} y={29} textAnchor="middle" fontSize={11} fill={MUTED}>
          Current price
        </text>
        <text
          x={flagX + flagW / 2}
          y={51}
          textAnchor="middle"
          fontSize={18}
          fontWeight={700}
          fill={earning ? FG : RED}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatPriceSig(spot)}
        </text>
      </>
    );
  } else if (width > 0) {
    body = (
      <text x={width / 2} y={H / 2} textAnchor="middle" fontSize={13} fill={MUTED}>
        Reading the vault…
      </text>
    );
  }

  return (
    <div ref={ref} className="w-full" style={{ height: H }}>
      <svg
        width={width}
        height={H}
        className="block overflow-visible"
        role="img"
        aria-label={
          ready
            ? `Range ${formatPriceSig(lower)} to ${formatPriceSig(upper)}, current price ${formatPriceSig(spot)}, ${earning ? "in range" : "out of range"}`
            : "Range, loading"
        }
      >
        {body}
      </svg>
    </div>
  );
};
