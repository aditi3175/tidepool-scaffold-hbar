"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { SCAFFOLD, domain, useCopied } from "./shared";
import type { HeroData } from "./useHeroData";
import { formatPriceSig, formatToken } from "~~/utils/tidepool/format";

const NEON = "#00F5A0";
const MONO = "var(--font-jetbrains), ui-monospace, monospace";

/**
 * The range with swaps flowing across it (illustrative). Dots crossing the band light up and leave a spark; outside
 * it they stay grey. Pauses off screen, draws one still frame with reduced motion.
 */
const FlowChart = ({ d }: { d: HeroData }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const data = useRef(d);
  useEffect(() => {
    data.current = d;
  });

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = el.clientWidth;
      h = el.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    type Dot = { x: number; y: number; v: number; r: number };
    const dots: Dot[] = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: 0.18 + Math.random() * 0.64,
      v: (0.04 + Math.random() * 0.08) * (Math.random() < 0.5 ? 1 : -1),
      r: 1 + Math.random() * 1.6,
    }));
    const sparks: { x: number; y: number; age: number }[] = [];

    const draw = (dt: number) => {
      const s = data.current;
      ctx.clearRect(0, 0, w, h);
      if (!s.ready || s.lower === undefined || s.upper === undefined || s.spot === undefined) return;
      const { min, max } = domain(s.lower, s.upper, [s.spot, s.twap ?? s.spot]);
      const X = (p: number) => ((p - min) / (max - min)) * w;
      const x0 = X(s.lower);
      const x1 = X(s.upper);
      const xs = X(s.spot);

      // Grid.
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx + 0.5, 0);
        ctx.lineTo(gx + 0.5, h);
        ctx.stroke();
      }
      // Band.
      const band = ctx.createLinearGradient(0, 0, 0, h);
      band.addColorStop(0, "rgba(0,245,160,0.22)");
      band.addColorStop(1, "rgba(0,209,255,0.04)");
      ctx.fillStyle = band;
      ctx.fillRect(x0, 0, x1 - x0, h);
      ctx.fillStyle = NEON;
      ctx.shadowColor = NEON;
      ctx.shadowBlur = 16;
      ctx.fillRect(x0 - 1, 0, 2, h);
      ctx.fillRect(x1 - 1, 0, 2, h);
      ctx.shadowBlur = 0;

      // Flow.
      for (const dot of dots) {
        dot.x += dot.v * dt;
        if (dot.x > 1.02) dot.x = -0.02;
        if (dot.x < -0.02) dot.x = 1.02;
        const px = dot.x * w;
        const inside = px >= x0 && px <= x1;
        if (inside && Math.random() < dt * 0.25) sparks.push({ x: px, y: dot.y * h, age: 0 });
        ctx.fillStyle = inside ? "rgba(0,245,160,0.95)" : "rgba(255,255,255,0.22)";
        ctx.beginPath();
        ctx.arc(px, dot.y * h, dot.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.age += dt;
        if (sp.age > 0.9) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(0,245,160,${0.7 * (1 - sp.age / 0.9)})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2 + sp.age * 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Spot.
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xs, 0);
      ctx.lineTo(xs, h);
      ctx.stroke();
    };

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(dt);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    });
    io.observe(el);
    const still = setInterval(() => reduced && draw(0), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(still);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className="relative h-full min-h-[200px] w-full">
      <canvas
        ref={canvas}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="The vault's range with illustrative swaps flowing across it"
      />
    </div>
  );
};

const Tile = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl bg-[linear-gradient(160deg,rgba(0,245,160,0.35),rgba(255,255,255,0.06)_30%,rgba(255,255,255,0.04)_70%,rgba(0,209,255,0.3))] p-px ${className}`}
  >
    <div className="h-full rounded-[15px] bg-[#070B10] p-5">{children}</div>
  </div>
);

const Label = ({ children }: { children: ReactNode }) => (
  <div className="text-[11px] uppercase tracking-[0.14em] text-[#7D8A99]" style={{ fontFamily: MONO }}>
    {children}
  </div>
);

/** The TWAP guard as an arc: ticks apart over the limit. */
const Arc = ({ value, limit }: { value?: number; limit?: number }) => {
  const f = value === undefined || !limit ? 0 : Math.min(1, value / limit);
  const r = 34;
  const c = Math.PI * r;
  return (
    <svg width="84" height="48" viewBox="0 0 84 48" aria-hidden>
      <path
        d="M 8 44 A 34 34 0 0 1 76 44"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 8 44 A 34 34 0 0 1 76 44"
        fill="none"
        stroke={f > 0.99 ? "#FFB020" : NEON}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${Math.max(0.001, f) * c} ${c}`}
        style={{ filter: `drop-shadow(0 0 6px ${NEON})` }}
      />
    </svg>
  );
};

export const HeroPulse = ({ d }: { d: HeroData }) => {
  const { copied, copy } = useCopied();
  const inRange = d.inRange !== false;
  const ticker = d.recent.length
    ? d.recent
    : [{ key: "l", text: "Reading vault events from the mirror node…", name: "", ago: "", tx: "0x" }];

  return (
    <section
      className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#04060A] text-white"
      style={{ fontFamily: "var(--font-space), ui-sans-serif, system-ui" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(0,245,160,0.14),transparent)]"
      />

      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="h-3 w-3 rotate-45 bg-[linear-gradient(135deg,#00F5A0,#00D1FF)] shadow-[0_0_16px_#00F5A0]" />
          tidepool
        </span>
        <div className="hidden gap-7 text-sm text-[#9AA7B6] md:flex">
          <span className="text-white">Vault</span>
          <span>Docs</span>
          <span>Contracts</span>
          <span>GitHub</span>
        </div>
        <span className="rounded-lg border border-[#00F5A0]/40 bg-[#00F5A0]/10 px-4 py-2 text-sm font-semibold text-[#00F5A0]">
          Connect
        </span>
      </nav>

      {/* Ticker of real vault events */}
      <div
        className="border-y border-white/[0.06] bg-white/[0.015] py-2.5 text-[12px] text-[#9AA7B6]"
        style={{ fontFamily: MONO }}
      >
        <div className="flex w-max gap-10 whitespace-nowrap motion-safe:animate-[marquee_40s_linear_infinite]">
          {[...ticker, ...ticker].map((item, i) => (
            <span key={`${item.key}-${i}`} className="flex items-center gap-2">
              <span
                className={
                  item.name === "Rebalance"
                    ? "text-[#00D1FF]"
                    : item.name === "FeesCollected"
                      ? "text-[#00F5A0]"
                      : "text-white/70"
                }
              >
                ▲
              </span>
              {item.text}
              {item.ago && <span className="text-white/35">{item.ago}</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-2.5 py-1 text-xs text-[#9AA7B6]"
            style={{ fontFamily: MONO }}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${inRange ? "bg-[#00F5A0] shadow-[0_0_8px_#00F5A0]" : "bg-[#FFB020]"}`}
            />
            HEDERA TESTNET · {inRange ? "IN RANGE" : "OUT OF RANGE"}
          </div>
          <h1 className="m-0 mt-6 text-[clamp(44px,5.4vw,80px)] font-bold leading-[0.98] tracking-[-0.04em]">
            Liquidity on
            <br />
            <span className="bg-[linear-gradient(90deg,#00F5A0,#00D1FF)] bg-clip-text text-transparent">
              autopilot.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[#9AA7B6]">
            A SaucerSwap V2 vault that compounds fees and re-centres on the TWAP. Anyone can run the keeper; the TWAP
            guard makes that safe.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-lg bg-[linear-gradient(90deg,#00F5A0,#00D1FF)] px-6 py-3 text-[15px] font-bold text-[#021510] shadow-[0_0_32px_-4px_rgba(0,245,160,0.6)]">
              Launch vault
            </span>
            <button
              type="button"
              onClick={() => copy(SCAFFOLD)}
              className="cursor-pointer rounded-lg border border-white/15 px-6 py-3 text-[15px] font-semibold hover:border-white/30"
            >
              {copied ? "Command copied" : "Fork the template"}
            </button>
          </div>
        </div>

        {/* Bento */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile className="col-span-2 row-span-2">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <Label>{d.pair} · range</Label>
                <span className="text-[11px] text-white/35" style={{ fontFamily: MONO }}>
                  illustrative flow
                </span>
              </div>
              <div className="mt-3 flex-1">
                <FlowChart d={d} />
              </div>
              <div className="mt-3 flex justify-between text-xs text-[#9AA7B6]" style={{ fontFamily: MONO }}>
                <span>LOW {formatPriceSig(d.lower)}</span>
                <span>HIGH {formatPriceSig(d.upper)}</span>
              </div>
            </div>
          </Tile>
          <Tile>
            <Label>Spot</Label>
            <div className="mt-3 text-3xl font-bold tabular-nums" style={{ fontFamily: MONO }}>
              {formatPriceSig(d.spot)}
            </div>
            <div className="mt-1 text-xs text-[#7D8A99]">{d.unit}</div>
          </Tile>
          <Tile>
            <Label>TWAP guard</Label>
            <div className="mt-2 flex items-end justify-between">
              <Arc value={d.ticksApart} limit={d.maxTicksApart} />
              <div className="text-right text-sm tabular-nums" style={{ fontFamily: MONO }}>
                {d.ticksApart ?? "—"}
                <span className="text-[#7D8A99]">/{d.maxTicksApart ?? 50}</span>
              </div>
            </div>
          </Tile>
          <Tile>
            <Label>Vault value</Label>
            <div className="mt-3 text-2xl font-bold tabular-nums" style={{ fontFamily: MONO }}>
              {d.value1 !== undefined ? formatToken(d.value1, { compact: true }) : "—"}
            </div>
            <div className="mt-1 text-xs text-[#7D8A99]">{d.symbol1}</div>
          </Tile>
          <Tile>
            <Label>Fees · last 50</Label>
            <div className="mt-3 text-2xl font-bold tabular-nums text-[#00F5A0]" style={{ fontFamily: MONO }}>
              +{d.fee1 !== undefined ? formatToken(d.fee1) : "—"}
            </div>
            <div className="mt-1 text-xs text-[#7D8A99]">{d.symbol1}</div>
          </Tile>
          <Tile>
            <Label>Last rebalance</Label>
            <div className="mt-3 text-2xl font-bold" style={{ fontFamily: MONO }}>
              {d.ago(d.lastRebalance)}
            </div>
            <div className="mt-1 text-xs text-[#7D8A99]">re-centred on TWAP</div>
          </Tile>
        </div>
      </div>
    </section>
  );
};
