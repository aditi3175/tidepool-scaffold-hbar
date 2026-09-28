"use client";

import { SCAFFOLD, domain, useCopied, useWidth } from "./shared";
import type { HeroData } from "./useHeroData";
import { formatPriceSig, formatToken } from "~~/utils/tidepool/format";

const PAPER = "#F2EFE8";
const INK = "#121210";
const SEA = "#0B7A62";
const RULE = "#D6D1C4";

/** A full-bleed ruler: fine ticks across the width, the range as a solid band, spot as a marker. */
const Ruler = ({ d }: { d: HeroData }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = 132;
  const ready = d.ready && d.lower !== undefined && d.upper !== undefined && d.spot !== undefined;
  let body = null;
  if (width > 0) {
    const ticks: { x: number; major: boolean }[] = [];
    for (let i = 0, tx = 0; tx <= width; i++, tx += 9) ticks.push({ x: tx, major: i % 10 === 0 });
    const base = 86;
    if (ready) {
      const { min, max } = domain(d.lower!, d.upper!, [d.spot!, d.twap ?? d.spot!], 0.9);
      const x = (p: number) => ((p - min) / (max - min)) * width;
      const x0 = x(d.lower!);
      const x1 = x(d.upper!);
      const xs = x(d.spot!);
      body = (
        <>
          <rect x={x0} y={base - 2} width={x1 - x0} height={14} fill={SEA} />
          {ticks.map(t => {
            const inside = t.x >= x0 && t.x <= x1;
            return (
              <line
                key={t.x}
                x1={t.x + 0.5}
                x2={t.x + 0.5}
                y1={base - (t.major ? 30 : 14)}
                y2={base - 2}
                stroke={inside ? SEA : INK}
                strokeOpacity={inside ? 1 : t.major ? 0.55 : 0.28}
              />
            );
          })}
          <line x1={xs} x2={xs} y1={18} y2={base + 12} stroke={INK} strokeWidth={2} />
          <path d={`M ${xs - 7} 10 L ${xs + 7} 10 L ${xs} 19 Z`} fill={INK} />
          <text x={xs + 10} y={16} fontSize={13} fill={INK} style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatPriceSig(d.spot)} spot
          </text>
          <text
            x={x0}
            y={base + 34}
            fontSize={12}
            fill={INK}
            fillOpacity={0.6}
            textAnchor="middle"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatPriceSig(d.lower)} low
          </text>
          <text
            x={x1}
            y={base + 34}
            fontSize={12}
            fill={INK}
            fillOpacity={0.6}
            textAnchor="middle"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatPriceSig(d.upper)} high
          </text>
        </>
      );
    } else {
      body = ticks.map(t => (
        <line
          key={t.x}
          x1={t.x + 0.5}
          x2={t.x + 0.5}
          y1={base - (t.major ? 30 : 14)}
          y2={base - 2}
          stroke={INK}
          strokeOpacity={0.25}
        />
      ));
    }
  }
  return (
    <div ref={ref} style={{ height }} className="w-full">
      <svg
        width={width}
        height={height}
        className="block"
        role="img"
        aria-label="The vault's live range on a price ruler"
      >
        {body}
      </svg>
    </div>
  );
};

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-b py-3" style={{ borderColor: RULE }}>
    <span className="text-sm" style={{ color: "#6B675D" }}>
      {label}
    </span>
    <span className="text-[15px] font-medium tabular-nums">{value}</span>
  </div>
);

export const HeroEditorial = ({ d }: { d: HeroData }) => {
  const { copied, copy } = useCopied();
  const inRange = d.inRange !== false;
  return (
    <section
      className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden"
      style={{ background: PAPER, color: INK, fontFamily: "var(--font-archivo), ui-sans-serif, system-ui" }}
    >
      <nav
        className="mx-auto flex w-full max-w-[1320px] items-center justify-between border-b px-6 py-5"
        style={{ borderColor: RULE }}
      >
        <span className="text-[20px] font-extrabold tracking-[-0.02em]" style={{ fontStretch: "75%" }}>
          TIDEPOOL
        </span>
        <div className="hidden gap-8 text-sm md:flex">
          <span>Vault</span>
          <span>How it works</span>
          <span>Docs</span>
          <span>Contracts</span>
        </div>
        <span className="flex items-center gap-2 text-sm font-semibold">
          Launch the vault <span aria-hidden>→</span>
        </span>
      </nav>

      <div className="mx-auto w-full max-w-[1320px] flex-1 px-6">
        <div
          className="flex items-center justify-between pt-8 font-mono text-xs uppercase tracking-[0.12em]"
          style={{ color: "#6B675D" }}
        >
          <span>(01) A Scaffold-HBAR template</span>
          <span className="hidden items-center gap-2 sm:flex">
            <span className="h-2 w-2 rounded-full" style={{ background: inRange ? SEA : "#C2410C" }} />
            Live · Hedera testnet
          </span>
        </div>

        <h1
          className="m-0 mt-6 font-extrabold uppercase leading-[0.84] tracking-[-0.025em]"
          style={{ fontSize: "clamp(56px, 9vw, 148px)", fontStretch: "68%" }}
        >
          Liquidity that
          <br />
          <span style={{ color: SEA }}>re-centres itself.</span>
        </h1>

        <div className="mt-9 grid grid-cols-1 gap-10 border-t pt-7 md:grid-cols-12" style={{ borderColor: INK }}>
          <div className="md:col-span-4">
            <p className="text-[17px] leading-relaxed">
              One SaucerSwap V2 position, owned by a contract. It compounds its own fees, refuses to act on a price that
              moved in one trade, and moves its range when the average price leaves it.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <span className="px-6 py-3.5 text-[15px] font-semibold" style={{ background: INK, color: PAPER }}>
                Open the vault
              </span>
              <span className="border-b-2 pb-0.5 text-[15px] font-semibold" style={{ borderColor: INK }}>
                Read the docs
              </span>
            </div>
            <button
              type="button"
              onClick={() => copy(SCAFFOLD)}
              className="mt-7 block max-w-full cursor-pointer truncate text-left font-mono text-[12px] underline decoration-dotted underline-offset-4"
              style={{ color: "#6B675D" }}
            >
              {copied ? "Copied to clipboard" : `$ ${SCAFFOLD}`}
            </button>
          </div>

          <div className="md:col-span-4 md:border-l md:pl-8" style={{ borderColor: RULE }}>
            <div className="font-mono text-xs uppercase tracking-[0.12em]" style={{ color: "#6B675D" }}>
              Spot price
            </div>
            <div
              className="mt-2 font-extrabold leading-none tabular-nums tracking-[-0.03em]"
              style={{ fontSize: "clamp(64px, 6.4vw, 100px)", fontStretch: "75%" }}
            >
              {d.spot !== undefined ? formatPriceSig(d.spot) : "—"}
            </div>
            <div className="mt-2 text-sm" style={{ color: "#6B675D" }}>
              {d.unit} · {inRange ? "inside the range" : "outside the range"}
            </div>
          </div>

          <div className="md:col-span-4 md:border-l md:pl-8" style={{ borderColor: RULE }}>
            <Fact label="Range" value={`${formatPriceSig(d.lower)} – ${formatPriceSig(d.upper)}`} />
            <Fact label="Vault value" value={d.value1 !== undefined ? `${formatToken(d.value1)} ${d.symbol1}` : "—"} />
            <Fact
              label="Fees collected (last 50 events)"
              value={d.fee1 !== undefined ? `${formatToken(d.fee1)} ${d.symbol1}` : "—"}
            />
            <Fact label="Last rebalance" value={d.ago(d.lastRebalance)} />
          </div>
        </div>
      </div>

      <div className="mt-8 border-t" style={{ borderColor: RULE }}>
        <Ruler d={d} />
      </div>
    </section>
  );
};
