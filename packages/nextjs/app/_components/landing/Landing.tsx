"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { type LandingData, type LandingEvent, useLandingData } from "./useLandingData";
import { Arc, Eyebrow, GradientText, Label, LiveDot, Tile, btn } from "~~/components/pulse";
import { FlowChart } from "~~/components/pulse/FlowChart";
import { GITHUB_URL, SCAFFOLD_COMMAND } from "~~/utils/tidepool/constants";
import { formatAgo, formatPriceSig, formatToken } from "~~/utils/tidepool/format";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatDuration } from "~~/utils/tidepool/math";

const TONE: Record<string, string> = {
  Rebalance: "text-cyan",
  FeesCollected: "text-neon",
  Compound: "text-neon",
  Deposit: "text-fg",
  Withdraw: "text-amber",
};

const useCopy = () => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);
  return {
    copied,
    copy: async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    },
  };
};

/* ------------------------------------------------------------------ */

const Ticker = ({ d }: { d: LandingData }) => {
  const items: LandingEvent[] = d.events.length
    ? d.events.slice(0, 12)
    : [
        {
          key: "loading",
          name: "",
          label: "",
          text: "Reading vault events from the Hedera mirror node…",
          ago: "",
          tx: "",
        },
      ];
  return (
    <div
      className="overflow-hidden border-b border-white/[0.06] bg-white/[0.015] py-2.5 font-mono text-[12px] text-muted"
      aria-label="Recent vault events"
    >
      <div className="flex w-max gap-10 whitespace-nowrap motion-safe:animate-[marquee_60s_linear_infinite] motion-reduce:flex-wrap">
        {[...items, ...items].map((item, i) => (
          <span key={`${item.key}-${i}`} className="flex items-center gap-2" aria-hidden={i >= items.length}>
            {item.label && <span className={`uppercase ${TONE[item.name] ?? "text-fg"}`}>{item.label}</span>}
            <span className="text-fg/80">{item.text}</span>
            {item.ago && <span className="text-faint">{item.ago}</span>}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Hero = ({ d }: { d: LandingData }) => {
  const { copied, copy } = useCopy();
  const inRange = d.inRange !== false;
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[560px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(0,245,160,0.13),transparent)]"
      />
      <div className="mx-auto grid min-h-[calc(100svh-4rem-41px)] max-w-[1280px] grid-cols-1 items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-white/10 px-2.5 py-1 font-mono text-xs uppercase text-muted">
            <LiveDot ok={inRange} />
            Hedera testnet · {d.inRange === undefined ? "reading" : inRange ? "in range" : "out of range"}
          </div>
          <h1 className="m-0 mt-6 text-[clamp(44px,5.4vw,80px)] font-bold leading-[0.98] tracking-[-0.04em] text-fg">
            Liquidity on
            <br />
            <GradientText>autopilot.</GradientText>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
            A SaucerSwap V2 vault that compounds its fees and re-centres on the TWAP. Anyone can run the keeper; the
            TWAP guard makes that safe. Ships as a Scaffold-HBAR template.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className={btn.primary}>
              Launch vault
            </Link>
            <button type="button" onClick={() => copy(SCAFFOLD_COMMAND)} className={btn.ghost}>
              {copied ? "Command copied" : "Fork the template"}
            </button>
          </div>
          <Link href="/how-it-works" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            How the vault decides <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Live tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile className="col-span-2 row-span-2" innerClassName="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <Label>{d.pair} · range</Label>
              <span className="font-mono text-[11px] text-faint">flow illustrative</span>
            </div>
            <FlowChart
              className="mt-3 min-h-[200px] flex-1"
              lower={d.lower}
              upper={d.upper}
              spot={d.spot}
              twap={d.twap}
              inRange={inRange}
              label={
                d.ready
                  ? `Main vault range ${formatPriceSig(d.lower)} to ${formatPriceSig(d.upper)} ${d.unit}, spot ${formatPriceSig(d.spot)}`
                  : "Main vault range, loading"
              }
            />
            <div className="mt-3 flex justify-between font-mono text-xs text-muted">
              <span>LOW {formatPriceSig(d.lower)}</span>
              <span>HIGH {formatPriceSig(d.upper)}</span>
            </div>
          </Tile>
          <Tile>
            <Label>Spot</Label>
            <div className="mt-3 font-mono text-3xl font-bold tabular-nums text-fg">{formatPriceSig(d.spot)}</div>
            <div className="mt-1 text-xs text-faint">{d.unit}</div>
          </Tile>
          <Tile>
            <Label>TWAP guard</Label>
            <div className="mt-2 flex items-end justify-between">
              <Arc value={d.ticksApart} limit={d.maxTicksApart} />
              <div className="font-mono text-sm tabular-nums text-fg">
                {d.ticksApart ?? "–"}
                <span className="text-faint">/{d.maxTicksApart ?? "–"}</span>
              </div>
            </div>
          </Tile>
          <Tile>
            <Label>Vault value</Label>
            <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-fg">
              {formatToken(d.value1, { compact: true })}
            </div>
            <div className="mt-1 text-xs text-faint">{d.symbol1}, at spot</div>
          </Tile>
          <Tile>
            <Label>Fees · last 50 events</Label>
            <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-neon">
              {d.fee1 === undefined || d.eventsLoading ? "–" : `+${formatToken(d.fee1)}`}
            </div>
            <div className="mt-1 text-xs text-faint">
              {d.symbol1}
              {d.fee0 ? ` + ${formatToken(d.fee0)} ${d.symbol0}` : ""}
            </div>
          </Tile>
          <Tile className="col-span-2 sm:col-span-1">
            <Label>Last rebalance</Label>
            <div className="mt-3 font-mono text-2xl font-bold text-fg">{formatAgo(d.lastRebalance)}</div>
            <div className="mt-1 text-xs text-faint">re-centred on the TWAP</div>
          </Tile>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */

/** Where spot sits between low and high, as a short track. */
const RangeTrack = ({ d }: { d: LandingData }) => {
  const f =
    d.lower !== undefined && d.upper !== undefined && d.spot !== undefined
      ? (d.spot - d.lower) / (d.upper - d.lower)
      : undefined;
  const inside = f !== undefined && f >= 0 && f <= 1;
  return (
    <div>
      <div className="relative h-2 rounded-full bg-white/[0.06]">
        <div
          className={`absolute inset-y-0 left-0 right-0 rounded-full ${inside ? "bg-[linear-gradient(90deg,rgba(0,245,160,0.35),rgba(0,209,255,0.35))]" : "bg-amber/25"}`}
        />
        {f !== undefined && (
          <span
            className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]"
            style={{ left: `${Math.min(100, Math.max(0, f * 100))}%` }}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-faint">
        <span>{formatPriceSig(d.lower)}</span>
        <span>{formatPriceSig(d.upper)}</span>
      </div>
    </div>
  );
};

const Rule = ({
  n,
  title,
  text,
  status,
  children,
}: {
  n: string;
  title: string;
  text: string;
  status: ReactNode;
  children: ReactNode;
}) => (
  <Tile as="article" innerClassName="flex flex-col p-6">
    <div className="flex items-center justify-between">
      <span className="font-mono text-sm text-faint">{n}</span>
      {status}
    </div>
    <h3 className="m-0 mt-6 text-xl font-bold tracking-[-0.02em] text-fg">{title}</h3>
    <p className="mb-6 mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
    <div className="mt-auto border-t border-white/[0.06] pt-5">{children}</div>
  </Tile>
);

const Status = ({ ok, children }: { ok: boolean; children: ReactNode }) => (
  <span
    className={`rounded-md px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] ${ok ? "bg-neon/10 text-neon" : "bg-amber/10 text-amber"}`}
  >
    {children}
  </span>
);

const Rules = ({ d }: { d: LandingData }) => {
  const over = d.ticksApart !== undefined && d.maxTicksApart !== undefined && d.ticksApart > d.maxTicksApart;
  const minutes = d.twapWindow ? Math.round(d.twapWindow / 60) : 10;
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-24 sm:px-6" aria-labelledby="rules-title">
      <Eyebrow>Live status</Eyebrow>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <h2
          id="rules-title"
          className="m-0 max-w-2xl text-[clamp(32px,3.6vw,48px)] font-bold leading-[1.05] tracking-[-0.03em] text-fg"
        >
          The vault, <GradientText>right now.</GradientText>
        </h2>
        <p className="flex items-center gap-2 text-[15px] text-muted">
          <LiveDot /> Read from the main vault on Hedera testnet
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Rule
          n="01"
          title="Range"
          text="Swaps inside the range pay the vault a fee."
          status={<Status ok={d.inRange !== false}>{d.inRange === false ? "Out of range" : "In range"}</Status>}
        >
          <Label className="mb-3">Spot within the range</Label>
          <RangeTrack d={d} />
        </Rule>
        <Rule
          n="02"
          title="TWAP guard"
          text={`Spot must stay within ${d.maxTicksApart ?? 50} ticks of the ${minutes}-minute TWAP.`}
          status={<Status ok={!over}>{over ? "Paused" : "Clear"}</Status>}
        >
          <Label className="mb-2">Ticks apart / limit</Label>
          <div className="flex items-end justify-between">
            <Arc value={d.ticksApart} limit={d.maxTicksApart} size={96} />
            <div className="font-mono text-2xl font-bold tabular-nums text-fg">
              {d.ticksApart ?? "–"}
              <span className="text-base text-faint"> / {d.maxTicksApart ?? "–"}</span>
            </div>
          </div>
        </Rule>
        <Rule
          n="03"
          title="Rebalance"
          text="Anyone can re-centre once the TWAP leaves the range and the cooldown passes."
          status={<Status ok>Open to anyone</Status>}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Last rebalance</Label>
              <div className="mt-2 font-mono text-2xl font-bold text-fg">{formatAgo(d.lastRebalance)}</div>
            </div>
            <div>
              <Label>Cooldown</Label>
              <div className="mt-2 font-mono text-2xl font-bold text-fg">
                {d.cooldown !== undefined ? formatDuration(d.cooldown) : "–"}
              </div>
            </div>
          </div>
        </Rule>
      </div>
      <Link
        href="/how-it-works"
        className="mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-fg hover:text-neon"
      >
        How the vault decides, step by step <span aria-hidden>→</span>
      </Link>
    </section>
  );
};

/* ------------------------------------------------------------------ */

const Record = ({ d }: { d: LandingData }) => {
  const rows = d.events.slice(0, 8);
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-24 sm:px-6" aria-labelledby="record-title">
      <Eyebrow>On-chain record</Eyebrow>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <h2
          id="record-title"
          className="m-0 max-w-2xl text-[clamp(32px,3.6vw,48px)] font-bold leading-[1.05] tracking-[-0.03em] text-fg"
        >
          Every action leaves <GradientText>a receipt.</GradientText>
        </h2>
        <p className="flex items-center gap-2 text-[15px] text-muted">
          <LiveDot /> Live from the Hedera mirror node
        </p>
      </div>
      <Tile className="mt-12" innerClassName="p-0">
        {d.eventsLoading ? (
          <p className="p-6 text-sm text-muted">Reading the vault&apos;s events…</p>
        ) : d.eventsError || rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {d.eventsError ? "The mirror node did not answer. Try again in a moment." : "No events yet."}
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-white/[0.06] p-0">
            {rows.map(row => (
              <li
                key={row.key}
                className="flex flex-col gap-1 px-5 py-4 sm:grid sm:grid-cols-[112px_minmax(0,1fr)_96px_140px] sm:items-center sm:gap-4 sm:px-6"
              >
                <span className={`font-mono text-xs uppercase tracking-[0.08em] ${TONE[row.name] ?? "text-fg"}`}>
                  {row.label}
                </span>
                <span className="min-w-0 text-[15px] text-fg sm:truncate">{row.text}</span>
                <span className="font-mono text-xs text-faint">{row.ago}</span>
                <a
                  href={hashscan.tx(row.tx)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-muted hover:text-neon sm:text-right"
                >
                  {row.tx.slice(0, 6)}…{row.tx.slice(-4)} ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </section>
  );
};

/* ------------------------------------------------------------------ */

const TREE: [string, string][] = [
  ["packages/hardhat/contracts/tidepool/", ""],
  ["  TidepoolVault.sol", "the vault: no owner, no upgrades"],
  ["  libraries/RangeMath.sol", "TWAP, range and swap-ratio maths"],
  ["packages/hardhat/deploy/", "deploy + initialize, with a preflight"],
  ["packages/hardhat/scripts/", "operator scripts"],
  ["packages/hardhat/test/", "unit tests on mocks, no network"],
  ["packages/nextjs/", "this site: dashboard, docs, contracts"],
];

const STACK = [
  ["HTS", "Share token created, minted and burned by the vault"],
  ["SaucerSwap V2", "Pool, position manager and swap router"],
  ["Exchange rate 0x168", "Converts the mint fee from US cents to HBAR"],
  ["Mirror node", "Event history for the dashboard and this page"],
];

const Template = () => {
  const { copied, copy } = useCopy();
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-24 sm:px-6" aria-labelledby="template-title">
      <Eyebrow>The template</Eyebrow>
      <div className="mt-4 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <h2
            id="template-title"
            className="m-0 text-[clamp(32px,3.6vw,48px)] font-bold leading-[1.05] tracking-[-0.03em] text-fg"
          >
            Fork it in <GradientText>one command.</GradientText>
          </h2>
          <Tile className="mt-10" innerClassName="p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="ml-3 font-mono text-[11px] text-faint">terminal</span>
            </div>
            <div className="flex items-start gap-3 px-5 pt-5">
              <span className="font-mono text-sm text-neon">$</span>
              <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-sm leading-6 text-fg">
                {SCAFFOLD_COMMAND.replace(" --template", "\n  --template")}
              </code>
              <button
                type="button"
                onClick={() => copy(SCAFFOLD_COMMAND)}
                className="shrink-0 cursor-pointer rounded-md border border-white/10 px-2.5 py-1 font-mono text-xs text-muted hover:border-white/25 hover:text-fg"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <ul className="m-0 mt-5 list-none border-t border-white/[0.06] p-5 font-mono text-[13px] leading-7">
              {TREE.map(([path, note]) => (
                <li key={path} className="flex flex-wrap justify-between gap-x-6">
                  <span className={path.startsWith("  ") ? "whitespace-pre text-fg" : "text-muted"}>{path}</span>
                  {note && <span className="text-faint"># {note}</span>}
                </li>
              ))}
            </ul>
          </Tile>
        </div>
        <div className="lg:pt-[72px]">
          <Label>Built on Hedera</Label>
          <ul className="m-0 mt-4 list-none divide-y divide-white/[0.06] p-0">
            {STACK.map(([name, text]) => (
              <li key={name} className="py-4">
                <div className="font-bold text-fg">{name}</div>
                <div className="mt-1 text-[15px] text-muted">{text}</div>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/docs/quickstart" className={btn.ghost}>
              Quickstart
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={btn.ghost}>
              GitHub ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

/** The landing page: ticker, hero with live tiles, the three rules, the on-chain record and the template. */
export const Landing = () => {
  const d = useLandingData();
  return (
    <div>
      <Ticker d={d} />
      <Hero d={d} />
      <Rules d={d} />
      <Record d={d} />
      <Template />
    </div>
  );
};
