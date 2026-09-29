"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { RangeGraph } from "~~/app/_components/landing/RangeGraph";
import { Arc, GradientText } from "~~/components/pulse";
import { Reveal } from "~~/components/pulse/Reveal";
import { GITHUB_URL } from "~~/utils/tidepool/constants";
import { formatPriceSig } from "~~/utils/tidepool/format";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { tickToPrice } from "~~/utils/tidepool/math";

const WRAP = "mx-auto w-full max-w-[1480px] px-5 sm:px-8 lg:px-12";
const VAULT_SOL = `${GITHUB_URL}/blob/main/packages/hardhat/contracts/tidepool/TidepoolVault.sol`;

// The main vault's settings on testnet: WHBAR (8 decimals) / SAUCE (6), a ±600-tick range, a 50-tick guard.
const price = (tick: number) => tickToPrice(tick, 8, 6);
const LOWER = -8340;
const UPPER = -7140;
const LIMIT = 50;

/* ------------------------------------------------------------------ Shared pieces */

const Mono = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${className}`}>{children}</span>
);

/** Numbered claim, one line under it, and a link to the code that enforces it. */
const Move = ({
  n,
  title,
  line,
  source,
  children,
  takeaway,
}: {
  n: string;
  title: ReactNode;
  line: string;
  source: { label: string; href: string };
  children: ReactNode;
  takeaway: ReactNode;
}) => (
  <section className={`${WRAP} pt-24`}>
    <Reveal>
      <div className="h-px bg-white/[0.07]" aria-hidden />
      <div className="mt-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Mono className="text-neon">{n}</Mono>
          <h2 className="m-0 mt-3 text-balance text-[clamp(32px,4vw,52px)] font-extrabold leading-[1.04] tracking-[-0.04em] text-fg">
            {title}
          </h2>
          <p className="mt-3 text-[18px] text-muted">{line}</p>
        </div>
        <a
          href={source.href}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-neon/40 hover:text-neon"
        >
          {source.label}
          <ArrowTopRightOnSquareIcon
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden
          />
        </a>
      </div>
    </Reveal>
    <Reveal step={1} className="mt-8">
      {children}
    </Reveal>
    <Reveal step={2}>
      <p className="mt-6 border-l-2 border-neon/60 pl-4 text-[16px] text-fg">{takeaway}</p>
    </Reveal>
  </section>
);

/** The diagram frame: a quiet dotted panel. */
const Frame = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/40 ${className}`}>
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:22px_22px]"
    />
    <div className="relative">{children}</div>
  </div>
);

/** A row of case buttons under a diagram. */
function Cases<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] px-5 py-4 sm:px-6">
      <Mono className="mr-2 text-faint">{label}</Mono>
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors duration-200 ${
            value === o.id
              ? "border-neon/60 bg-neon/10 text-fg"
              : "border-white/10 text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ 01 */

type Swap = "below" | "inside" | "above";
const SWAPS: Record<Swap, { tick: number; label: string }> = {
  below: { tick: -8480, label: "Below the range" },
  inside: { tick: -7700, label: "Inside the range" },
  above: { tick: -6980, label: "Above the range" },
};

const EarnsInside = () => {
  const [at, setAt] = useState<Swap>("inside");
  const tick = SWAPS[at].tick;
  const inside = tick >= LOWER && tick < UPPER;
  return (
    <Frame>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="p-5 sm:p-8">
          <RangeGraph lower={price(LOWER)} upper={price(UPPER)} spot={price(tick)} inRange={inside} />
        </div>
        <div className="flex flex-col justify-center border-t border-white/[0.07] p-6 lg:border-l lg:border-t-0">
          <Mono className="text-faint">A swap at {formatPriceSig(price(tick))}</Mono>
          <div
            key={at}
            className={`tp-in mt-3 text-[26px] font-bold leading-tight tracking-[-0.02em] ${inside ? "text-neon" : "text-amber"}`}
          >
            {inside ? "Pays the vault a fee." : "Earns nothing."}
          </div>
          <p key={`${at}-p`} className="tp-in mt-3 text-[15px] leading-relaxed text-muted">
            {inside
              ? "The trade uses the vault's liquidity, so 0.30% of it goes to the position."
              : at === "above"
                ? "The position has sold all its WHBAR on the way up. It holds only SAUCE and sits idle."
                : "The position has sold all its SAUCE on the way down. It holds only WHBAR and sits idle."}
          </p>
        </div>
      </div>
      <Cases
        label="Where the swap lands"
        value={at}
        onChange={setAt}
        options={(Object.keys(SWAPS) as Swap[]).map(id => ({ id, label: SWAPS[id].label }))}
      />
    </Frame>
  );
};

/* ------------------------------------------------------------------ 02 */

type Market = "quiet" | "push";
const MARKETS: Record<Market, { spot: number; twap: number; label: string }> = {
  quiet: { spot: -7702, twap: -7700, label: "A quiet market" },
  push: { spot: -7612, twap: -7700, label: "One large trade" },
};

const Node = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl border border-white/10 bg-bg px-5 py-4">
    <Mono className="text-faint">{label}</Mono>
    <div className={`mt-1.5 text-[26px] font-bold tabular-nums tracking-[-0.02em] text-fg`}>{value}</div>
    {sub && <div className="mt-0.5 font-mono text-xs text-faint">{sub}</div>}
  </div>
);

const Guard = () => {
  const [m, setM] = useState<Market>("quiet");
  const { spot, twap } = MARKETS[m];
  const apart = Math.abs(spot - twap);
  const refused = apart > LIMIT;
  return (
    <Frame>
      <div className="grid grid-cols-1 items-center gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_56px_minmax(0,0.9fr)_56px_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-3">
          <Node label="Spot, right now" value={formatPriceSig(price(spot))} sub={`tick ${spot}`} />
          <Node label="10-minute TWAP" value={formatPriceSig(price(twap))} sub={`tick ${twap}`} />
        </div>
        <ArrowRightIcon className="mx-auto hidden h-6 w-6 text-neon/70 lg:block" aria-hidden />
        <div className="flex flex-col items-center rounded-xl border border-white/10 bg-bg px-5 py-5 text-center">
          <Mono className="text-faint">Ticks apart</Mono>
          <div className="mt-2">
            <Arc value={apart} limit={LIMIT} size={120} />
          </div>
          <div className={`mt-1 text-[28px] font-bold tabular-nums ${refused ? "text-amber" : "text-fg"}`}>
            {apart}
            <span className="text-base font-normal text-faint"> / {LIMIT}</span>
          </div>
        </div>
        <ArrowRightIcon className="mx-auto hidden h-6 w-6 text-neon/70 lg:block" aria-hidden />
        <div
          key={m}
          className={`tp-in rounded-xl border px-5 py-5 ${refused ? "border-amber/40 bg-amber/[0.05]" : "border-neon/40 bg-neon/[0.05]"}`}
        >
          <div className={`text-xl font-bold ${refused ? "text-amber" : "text-neon"}`}>
            {refused ? "It refuses." : "It proceeds."}
          </div>
          <div className="mt-1 font-mono text-xs text-muted">
            {refused ? `PriceDeviation(${spot}, ${twap})` : "deposit · compound · rebalance"}
          </div>
          <ul className="m-0 mt-4 list-none space-y-1.5 p-0 text-sm">
            {["Deposit", "Compound", "Rebalance"].map(a => (
              <li key={a} className="flex justify-between">
                <span className="text-fg">{a}</span>
                <span className={refused ? "text-amber" : "text-neon"}>{refused ? "refused" : "allowed"}</span>
              </li>
            ))}
            <li className="flex justify-between">
              <span className="text-fg">Withdraw</span>
              <span className="text-neon">always allowed</span>
            </li>
          </ul>
        </div>
      </div>
      <Cases
        label="The two cases"
        value={m}
        onChange={setM}
        options={(Object.keys(MARKETS) as Market[]).map(id => ({ id, label: MARKETS[id].label }))}
      />
    </Frame>
  );
};

/* ------------------------------------------------------------------ 03 */

const GATES = [
  { check: "Cooldown passed?", detail: "1 hour since the last rebalance (10 min on the narrow vault)" },
  { check: "Spot near the TWAP?", detail: "Within 50 ticks, the same guard as above" },
  { check: "TWAP outside the range?", detail: "Otherwise it reverts with StillInRange" },
];

// The narrow vault's real rebalance on testnet.
const OLD = { lower: -7860, upper: -7740 };
const NEW = { lower: -7980, upper: -7860 };
const TWAP_AT = -7899;
const REBALANCE_TX = "0xf55864c1fc7bdd54ae9597ecae2f8f70e534c0af4c0c7fb14da31065ceda0654";

const RangeShift = () => {
  const min = -8020;
  const max = -7700;
  const x = (t: number) => `${((t - min) / (max - min)) * 100}%`;
  const w = (a: number, b: number) => `${((b - a) / (max - min)) * 100}%`;
  return (
    <div className="relative h-24">
      <div className="absolute inset-x-0 top-12 h-px bg-white/15" />
      <div
        className="absolute top-8 h-8 rounded border border-dashed border-white/30"
        style={{ left: x(OLD.lower), width: w(OLD.lower, OLD.upper) }}
      />
      <div
        className="absolute top-8 h-8 rounded bg-[linear-gradient(90deg,rgba(46,230,200,0.45),rgba(46,230,200,0.25))]"
        style={{ left: x(NEW.lower), width: w(NEW.lower, NEW.upper) }}
      />
      <div className="absolute top-5 h-[62px] w-px bg-fg" style={{ left: x(TWAP_AT) }} />
      <div className="absolute top-0 -translate-x-1/2 font-mono text-[11px] text-fg" style={{ left: x(TWAP_AT) }}>
        TWAP {TWAP_AT}
      </div>
      <div
        className="absolute bottom-0 -translate-x-1/2 font-mono text-[11px] text-neon"
        style={{ left: x((NEW.lower + NEW.upper) / 2) }}
      >
        new [{NEW.lower}, {NEW.upper})
      </div>
      <div
        className="absolute bottom-0 -translate-x-1/2 font-mono text-[11px] text-faint"
        style={{ left: x((OLD.lower + OLD.upper) / 2) }}
      >
        old [{OLD.lower}, {OLD.upper})
      </div>
    </div>
  );
};

const Recentre = () => (
  <Frame>
    <ol className="m-0 grid list-none grid-cols-1 gap-3 p-5 sm:p-8 lg:grid-cols-4">
      {GATES.map((g, i) => (
        <Reveal as="li" key={g.check} step={i + 2} className="rounded-xl border border-white/10 bg-bg p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-neon/50 font-mono text-xs text-neon">
              {i + 1}
            </span>
            <span className="font-semibold text-fg">{g.check}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{g.detail}</p>
        </Reveal>
      ))}
      <Reveal as="li" step={5} className="rounded-xl border border-neon/50 bg-neon/[0.06] p-5">
        <div className="font-mono text-sm font-semibold text-neon">rebalance()</div>
        <p className="mt-3 text-sm leading-relaxed text-fg">
          Withdraws everything, swaps to the new ratio and opens a position of the same width, centred on the TWAP.
        </p>
      </Reveal>
    </ol>
    <div className="border-t border-white/[0.07] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Mono className="text-faint">It happened on testnet · narrow vault</Mono>
        <a
          href={hashscan.tx(REBALANCE_TX)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-neon"
        >
          Transaction <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[560px]">
          <RangeShift />
        </div>
      </div>
    </div>
  </Frame>
);

/* ------------------------------------------------------------------ 04 */

const PIPE = [
  { step: "Swaps pay fees", value: "0.0047 WHBAR + 0.213 SAUCE", note: "earned inside the range" },
  { step: "collect()", value: "FeesCollected", note: "fees move to the vault" },
  { step: "Swap to ratio", value: "SaucerSwap router", note: "idle tokens match the range" },
  { step: "increaseLiquidity()", value: "+24.5B liquidity", note: "added to position #392" },
];

const Compound = () => (
  <Frame>
    <ol className="m-0 grid list-none grid-cols-1 gap-3 p-5 sm:p-8 md:grid-cols-2 lg:grid-cols-4">
      {PIPE.map((p, i) => (
        <Reveal as="li" key={p.step} step={i + 2} className="relative rounded-xl border border-white/10 bg-bg p-5">
          <Mono className="text-faint">0{i + 1}</Mono>
          <div className="mt-2 font-mono text-sm font-semibold text-neon">{p.step}</div>
          <div className="mt-3 text-lg font-bold tabular-nums text-fg">{p.value}</div>
          <div className="mt-1 text-sm text-muted">{p.note}</div>
          {i < PIPE.length - 1 && (
            <ArrowRightIcon
              className="absolute -right-[18px] top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-neon/70 lg:block"
              aria-hidden
            />
          )}
        </Reveal>
      ))}
    </ol>
    <div className="grid grid-cols-1 gap-px border-t border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
      {[
        { k: "Your shares", v: "Unchanged" },
        { k: "Liquidity behind each share", v: "Larger" },
        { k: "Gas for this compound", v: "563,157" },
      ].map(c => (
        <div key={c.k} className="bg-surface/60 p-5 sm:px-8">
          <Mono className="text-faint">{c.k}</Mono>
          <div className="mt-1.5 text-lg font-bold text-fg">{c.v}</div>
        </div>
      ))}
    </div>
  </Frame>
);

/* ------------------------------------------------------------------ Page */

export const HowItWorks = () => (
  <div className="pb-8">
    <section className={`${WRAP} pt-20 sm:pt-28`}>
      <h1 className="m-0 text-balance text-[clamp(44px,6vw,88px)] font-extrabold leading-[0.98] tracking-[-0.045em] text-fg">
        <span className="tp-line">
          <span style={{ "--d": 100 } as CSSProperties}>How it works,</span>
        </span>
        <span className="tp-line">
          <span style={{ "--d": 250 } as CSSProperties}>
            <GradientText>in four moves.</GradientText>
          </span>
        </span>
      </h1>
      <p className="tp-in mt-6 max-w-2xl text-[18px] text-muted" style={{ "--d": 450 } as CSSProperties}>
        It earns inside a range. One trade can&apos;t steer it. Anyone can re-centre it. Its fees go back to work.
      </p>
    </section>

    <Move
      n="01"
      title="It earns only inside its range."
      line="A swap pays the vault only when the price is between its two edges."
      source={{ label: "Using the vault", href: "/docs/using-the-vault" }}
      takeaway="Out of range, the position holds a single token and earns nothing until the range moves."
    >
      <EarnsInside />
    </Move>

    <Move
      n="02"
      title="One trade can't steer it."
      line="Spot must sit within 50 ticks of the 10-minute average, or nothing moves."
      source={{ label: "TidepoolVault.sol", href: VAULT_SOL }}
      takeaway="Withdraw never checks the guard. Your way out is never blocked."
    >
      <Guard />
    </Move>

    <Move
      n="03"
      title="Anyone can re-centre it."
      line="Three checks on chain. If all pass, any account can call rebalance."
      source={{ label: "TidepoolVault.sol", href: VAULT_SOL }}
      takeaway="The caller pays the gas and SaucerSwap's fee. Nobody's shares change."
    >
      <Recentre />
    </Move>

    <Move
      n="04"
      title="Its fees go back to work."
      line="Compound collects the fees and adds them to the same position."
      source={{ label: "TidepoolVault.sol", href: VAULT_SOL }}
      takeaway="New deposits wait as idle tokens and join the position on the next compound, too."
    >
      <Compound />
    </Move>

    <section className={`${WRAP} pt-24`}>
      <Reveal>
        <div className="h-px bg-white/[0.07]" aria-hidden />
        <div className="mt-10 flex flex-wrap gap-x-10 gap-y-3">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-1.5 text-[17px] font-semibold text-fg hover:text-neon"
          >
            See the live vault
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/docs"
            className="group inline-flex items-center gap-1.5 text-[17px] font-semibold text-fg hover:text-neon"
          >
            Read the docs
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </Reveal>
    </section>
  </div>
);
