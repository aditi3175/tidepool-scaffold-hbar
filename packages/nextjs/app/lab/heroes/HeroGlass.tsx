"use client";

import { GRAIN, SCAFFOLD, domain, useCopied, useWidth } from "./shared";
import type { HeroData } from "./useHeroData";
import { formatPriceSig, formatToken } from "~~/utils/tidepool/format";

const MINT = "#34E0B0";

/** The live range as a liquidity histogram: even bars inside the range, a glowing spot line with a dot. */
const GlassChart = ({ d }: { d: HeroData }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = 190;
  const ready = d.ready && d.lower !== undefined && d.upper !== undefined && d.spot !== undefined;

  let body = null;
  if (ready && width > 0) {
    const { min, max } = domain(d.lower!, d.upper!, [d.spot!, d.twap ?? d.spot!]);
    const x = (p: number) => ((p - min) / (max - min)) * width;
    const x0 = x(d.lower!);
    const x1 = x(d.upper!);
    const xs = x(d.spot!);
    const bars: number[] = [];
    for (let bx = x0 + 2; bx < x1 - 2; bx += 6) bars.push(bx);
    const top = 34;
    const base = height - 26;
    body = (
      <>
        <defs>
          <linearGradient id="glass-bar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={MINT} stopOpacity="0.85" />
            <stop offset="1" stopColor={MINT} stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="glass-spot" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
          </linearGradient>
          <filter id="glass-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        {/* Glow under the range. */}
        <rect
          x={x0}
          y={top + 20}
          width={x1 - x0}
          height={base - top - 20}
          fill={MINT}
          opacity={0.22}
          filter="url(#glass-glow)"
        />
        {bars.map(bx => (
          <rect
            key={bx}
            x={bx}
            y={top}
            width={3}
            height={base - top}
            rx={1.5}
            fill="url(#glass-bar)"
            opacity={bx < xs ? 0.95 : 0.7}
          />
        ))}
        <line x1={0} x2={width} y1={base + 0.5} y2={base + 0.5} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 4" />
        {/* Spot. */}
        <line x1={xs} x2={xs} y1={top - 14} y2={base} stroke="url(#glass-spot)" strokeWidth={1.5} />
        <circle
          cx={xs}
          cy={top - 14}
          r={9}
          fill="#fff"
          opacity={0.18}
          className="motion-safe:animate-ping [transform-box:fill-box] [transform-origin:center]"
        />
        <circle cx={xs} cy={top - 14} r={4} fill="#fff" />
        <text
          x={x0}
          y={height - 6}
          fontSize={12}
          fill="rgba(255,255,255,0.45)"
          textAnchor="middle"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatPriceSig(d.lower)}
        </text>
        <text
          x={x1}
          y={height - 6}
          fontSize={12}
          fill="rgba(255,255,255,0.45)"
          textAnchor="middle"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatPriceSig(d.upper)}
        </text>
      </>
    );
  } else if (width > 0) {
    body = (
      <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={13} fill="rgba(255,255,255,0.45)">
        Reading the vault…
      </text>
    );
  }
  return (
    <div ref={ref} style={{ height }}>
      <svg
        width={width}
        height={height}
        className="block overflow-visible"
        role="img"
        aria-label="Live range of the main vault"
      >
        {body}
      </svg>
    </div>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-[0.08em] text-white/40">{label}</div>
    <div className="mt-1.5 text-lg font-semibold tabular-nums text-white">{value}</div>
    {sub && <div className="mt-0.5 text-xs text-white/40">{sub}</div>}
  </div>
);

export const HeroGlass = ({ d }: { d: HeroData }) => {
  const { copied, copy } = useCopied();
  const inRange = d.inRange !== false;
  return (
    <section
      className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#060910] text-white"
      style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui" }}
    >
      {/* Light: two soft sources, a faint grid, and grain. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[720px] w-[720px] rounded-full bg-[radial-gradient(closest-side,rgba(52,224,176,0.22),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-72 -left-40 -z-10 h-[760px] w-[760px] rounded-full bg-[radial-gradient(closest-side,rgba(76,125,255,0.16),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_60%_40%,black,transparent_70%)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[linear-gradient(135deg,#34E0B0,#4C7DFF)] shadow-[0_0_24px_rgba(52,224,176,0.45)]">
            <span className="h-2.5 w-3.5 rounded-b-full border-2 border-t-0 border-[#060910]" />
          </span>
          Tidepool
        </span>
        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm text-white/70 backdrop-blur-md md:flex">
          {["Vault", "How it works", "Docs", "Contracts"].map((item, i) => (
            <span key={item} className={`rounded-full px-4 py-1.5 ${i === 0 ? "bg-white/10 text-white" : ""}`}>
              {item}
            </span>
          ))}
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#060910]">Connect wallet</span>
      </nav>

      <div className="mx-auto grid w-full max-w-[1240px] flex-1 grid-cols-1 items-center gap-16 px-6 pb-20 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
        {/* Copy */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-2 pr-3.5 text-[13px] text-white/75 backdrop-blur-md">
            <span className={`relative flex h-2 w-2`}>
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping ${inRange ? "bg-[#34E0B0]" : "bg-amber-400"}`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${inRange ? "bg-[#34E0B0]" : "bg-amber-400"}`}
              />
            </span>
            Live on Hedera testnet · {inRange ? "earning in range" : "out of range"}
          </span>
          <h1 className="m-0 mt-7 text-[clamp(40px,4.3vw,60px)] font-semibold leading-[1.02] tracking-[-0.035em]">
            Concentrated liquidity,
            <br />
            <span className="bg-[linear-gradient(95deg,#FFFFFF_0%,#B9F7E4_45%,#34E0B0_100%)] bg-clip-text text-transparent">
              managed on chain.
            </span>
          </h1>
          <p className="mt-6 max-w-[480px] text-lg leading-relaxed text-white/60">
            A SaucerSwap V2 vault that compounds its own fees and re-centres on the TWAP. Fork it as a Scaffold-HBAR
            template, or try the live one.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[linear-gradient(135deg,#5FF0C6,#34E0B0)] px-6 py-3 text-[15px] font-semibold text-[#04130D] shadow-[0_10px_40px_-8px_rgba(52,224,176,0.7)]">
              Open the vault
            </span>
            <span className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-[15px] font-medium text-white backdrop-blur-md">
              Read the docs
            </span>
          </div>
          <button
            type="button"
            onClick={() => copy(SCAFFOLD)}
            className="group mt-8 flex max-w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left backdrop-blur-md hover:border-white/20"
          >
            <span className="text-[#34E0B0]">$</span>
            <code className="min-w-0 truncate font-mono text-[13px] text-white/80">{SCAFFOLD}</code>
            <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/70 group-hover:text-white">
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>

        {/* The card */}
        <div className="relative [perspective:1800px]">
          <div className="relative rounded-[28px] bg-[linear-gradient(145deg,rgba(255,255,255,0.28),rgba(255,255,255,0.05)_38%,rgba(255,255,255,0.03)_60%,rgba(52,224,176,0.45))] p-px shadow-[0_50px_140px_-30px_rgba(0,0,0,0.9),0_0_90px_-30px_rgba(52,224,176,0.5)] motion-safe:transition-transform motion-safe:duration-700 lg:[transform:rotateY(-9deg)_rotateX(5deg)] lg:hover:[transform:rotateY(-3deg)_rotateX(2deg)]">
            <div className="rounded-[27px] bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(9,13,22,0.94))] p-7 backdrop-blur-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-white/50">
                    {d.pair} · {d.feeTier}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
                      {d.spot !== undefined ? formatPriceSig(d.spot) : "—"}
                    </span>
                    <span className="text-sm text-white/45">{d.unit}</span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    inRange ? "bg-[#34E0B0]/15 text-[#5FF0C6]" : "bg-amber-400/15 text-amber-300"
                  }`}
                >
                  {inRange ? "In range" : "Out of range"}
                </span>
              </div>
              <div className="mt-6">
                <GlassChart d={d} />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <Stat
                  label="Vault value"
                  value={d.value1 !== undefined ? `${formatToken(d.value1)}` : "—"}
                  sub={d.symbol1}
                />
                <Stat
                  label="Fees collected"
                  value={d.fee1 !== undefined ? formatToken(d.fee1) : "—"}
                  sub={`${d.symbol1} · last 50 events`}
                />
                <Stat label="Last rebalance" value={d.ago(d.lastRebalance)} sub="re-centred on TWAP" />
              </div>
            </div>
          </div>

          {/* Floating chips */}
          <div className="absolute -left-12 top-[44%] hidden rounded-2xl border border-white/10 bg-[#0D1422]/80 px-4 py-3 shadow-2xl backdrop-blur-xl motion-safe:animate-[float_6s_ease-in-out_infinite] lg:block">
            <div className="text-[11px] uppercase tracking-[0.08em] text-white/40">TWAP guard</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">
              {d.ticksApart ?? "—"} / {d.maxTicksApart ?? 50} ticks
            </div>
          </div>
          <div className="absolute -bottom-16 right-6 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#0D1422]/80 px-4 py-3 shadow-2xl backdrop-blur-xl motion-safe:animate-[float_7s_ease-in-out_infinite_1s] lg:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#34E0B0]/15 text-[#5FF0C6]">↻</span>
            <div>
              <div className="text-sm font-semibold">Compounded</div>
              <div className="text-xs text-white/45">{d.ago(d.lastCompound)} · fees back into the position</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
