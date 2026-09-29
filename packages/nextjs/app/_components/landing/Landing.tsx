"use client";

import { type ComponentType, type ReactNode, type SVGProps, useEffect, useState } from "react";
import Link from "next/link";
import { RangeGraph } from "./RangeGraph";
import { WaveField } from "./WaveField";
import { type LandingData, useLandingData } from "./useLandingData";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTrendingUpIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  FlagIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SignalIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { GradientText, Tile, btn } from "~~/components/pulse";
import { GITHUB_URL, SCAFFOLD_COMMAND } from "~~/utils/tidepool/constants";
import { formatPriceSig, formatToken } from "~~/utils/tidepool/format";
import { hashscan } from "~~/utils/tidepool/hashscan";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

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

const IconBox = ({ icon: I, round = false }: { icon: Icon; round?: boolean }) => (
  <span
    className={`grid h-11 w-11 shrink-0 place-items-center border border-neon/20 bg-neon/[0.07] text-neon ${
      round ? "rounded-full" : "rounded-xl"
    }`}
    aria-hidden
  >
    <I className="h-5 w-5" />
  </span>
);

const SectionTitle = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2 className="m-0 text-2xl font-bold tracking-[-0.02em] text-fg sm:text-[28px]">{title}</h2>
      {sub && <p className="mt-1.5 text-[15px] text-muted">{sub}</p>}
    </div>
    {action}
  </div>
);

const GitHubMark = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
  </svg>
);

/* ------------------------------------------------------------------ 1. Hero */

const CHIPS: { icon: Icon; label: string }[] = [
  { icon: ArrowsRightLeftIcon, label: "SaucerSwap V2" },
  { icon: CubeIcon, label: "HTS" },
  { icon: CircleStackIcon, label: "Mirror Node" },
  { icon: CurrencyDollarIcon, label: "Exchange Rate" },
];

const Hero = ({ d }: { d: LandingData }) => {
  const inRange = d.inRange !== false;
  return (
    <section className="relative isolate overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[-20%] -z-10 h-[620px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(46,230,200,0.14),transparent)]"
      />
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-2 px-4 pb-12 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10 lg:pt-16">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-2 rounded-full border border-neon/25 bg-neon/[0.07] px-3 py-1 text-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_8px_#2EE6C8]" aria-hidden />
              Built on Hedera
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-muted">
              Scaffold-HBAR template
            </span>
          </div>
          <h1 className="m-0 mt-6 text-[clamp(48px,6.5vw,76px)] font-extrabold leading-[0.98] tracking-[-0.045em] text-fg">
            Tidepool
          </h1>
          <p className="m-0 mt-3 text-[clamp(28px,3.4vw,42px)] font-bold leading-tight tracking-[-0.03em] text-fg">
            Liquidity on <GradientText>autopilot.</GradientText>
          </p>
          <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-muted">
            A Hedera-native concentrated liquidity vault that compounds its fees and re-centres its range within a TWAP
            safety boundary.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className={btn.primary}>
              Launch Vault <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </Link>
            <a href="#template" className={btn.ghost}>
              Use this template <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </a>
          </div>
          <ul className="m-0 mt-8 flex list-none flex-wrap gap-x-6 gap-y-3 p-0 text-sm text-muted">
            {CHIPS.map(({ icon: I, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <I className="h-4 w-4 text-neon" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual: the wave, with the card below it on phones and floating over it on large screens */}
        <div className="relative flex flex-col lg:block lg:h-[460px]">
          <WaveField className="relative h-[190px] [mask-image:radial-gradient(ellipse_80%_75%_at_50%_45%,black_50%,transparent_100%)] sm:h-[280px] lg:absolute lg:inset-0 lg:h-auto" />
          <div className="relative -mt-6 rounded-2xl border border-neon/20 bg-[rgba(10,20,23,0.78)] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md lg:absolute lg:bottom-6 lg:right-0 lg:mt-0 lg:w-[360px]">
            <div className="text-sm font-semibold text-fg">Earn · Compound · Stay in range</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Concentrated liquidity with built-in protection against short-term price manipulation.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-2 text-neon">
                <span className="h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_#2EE6C8]" aria-hidden />
                Live on Hedera Testnet
              </span>
              <span className="tabular-nums text-muted">
                {d.pair} {formatPriceSig(d.spot)} ·{" "}
                <span className={inRange ? "text-neon" : "text-amber"}>{inRange ? "in range" : "out of range"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ 2. Live overview */

const Stat = ({
  label,
  value,
  sub,
  icon,
  subTone = "text-faint",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: Icon;
  subTone?: string;
}) => {
  const I = icon;
  return (
    <Tile innerClassName="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13px] text-muted">{label}</div>
        <div className="mt-2 text-[21px] font-bold tabular-nums tracking-[-0.02em] text-fg sm:text-[26px]">{value}</div>
        {sub && <div className={`mt-1 text-xs ${subTone}`}>{sub}</div>}
      </div>
      <I className="mt-1 h-5 w-5 shrink-0 text-neon/80" aria-hidden />
    </Tile>
  );
};

const Overview = ({ d }: { d: LandingData }) => {
  const minutes = d.twapWindow ? Math.round(d.twapWindow / 60) : 10;
  const diff = d.twapVsSpot;
  return (
    <section aria-label="Live vault overview" className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Vault value (TVL)"
          value={formatToken(d.value1)}
          sub={`${d.symbol1}, at spot`}
          icon={ChartBarIcon}
        />
        <Stat
          label="Share price"
          value={d.sharePrice !== undefined ? d.sharePrice.toFixed(2) : "–"}
          sub={`${d.symbol1} per share`}
          icon={CubeIcon}
        />
        <Stat label="Spot price" value={formatPriceSig(d.spot)} sub={d.unit} icon={SignalIcon} />
        <Stat
          label={`TWAP (${minutes} min)`}
          value={formatPriceSig(d.twap)}
          sub={diff === undefined ? "–" : `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}% vs spot`}
          subTone={diff !== undefined && Math.abs(diff) > 0.005 ? "text-neon" : "text-faint"}
          icon={ScaleIcon}
        />
        <Tile className="col-span-2 lg:col-span-1" innerClassName="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] text-muted">Last rebalance</div>
            <div className="mt-2 text-[21px] font-bold tracking-[-0.02em] text-fg sm:text-[26px]">
              {d.ago(d.lastRebalance)}
            </div>
            {d.lastRebalanceTx ? (
              <a
                href={hashscan.tx(d.lastRebalanceTx)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-neon"
              >
                View on HashScan <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden />
              </a>
            ) : (
              <div className="mt-1 text-xs text-faint">&nbsp;</div>
            )}
          </div>
          <ClockIcon className="mt-1 h-5 w-5 shrink-0 text-neon/80" aria-hidden />
        </Tile>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ 3. Range */

const Range = ({ d }: { d: LandingData }) => {
  const inRange = d.inRange !== false;
  return (
    <section aria-labelledby="range-title" className="mx-auto mt-4 max-w-[1200px] px-4 sm:px-6">
      <Tile innerClassName="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <h2 id="range-title" className="m-0 text-base font-semibold text-fg">
            Liquidity range <span className="font-normal text-muted">(SaucerSwap V2)</span>
          </h2>
          <div className="mt-4">
            <RangeGraph lower={d.lower} upper={d.upper} spot={d.spot} twap={d.twap} inRange={d.inRange} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-xl border border-white/[0.07] bg-bg/50 p-4">
            <div className="text-xs text-muted">Current price</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-fg">{formatPriceSig(d.spot)}</div>
            <div className="text-xs text-faint">{d.unit}</div>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-bg/50 p-4">
            <div className="text-xs text-muted">Vault position</div>
            <div className={`mt-1 flex items-center gap-2 text-xl font-bold ${inRange ? "text-neon" : "text-amber"}`}>
              <span
                className={`h-2.5 w-2.5 rounded-full ${inRange ? "bg-neon shadow-[0_0_8px_#2EE6C8]" : "bg-amber"}`}
                aria-hidden
              />
              {d.inRange === undefined ? "Reading…" : inRange ? "In range" : "Out of range"}
            </div>
            <div className="text-xs text-faint">{inRange ? "Earning fees" : "Not earning fees"}</div>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-bg/50 p-4">
            <div className="text-xs text-muted">Range width</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-fg">
              {d.rangeHalfWidth !== undefined ? `±${d.rangeHalfWidth.toFixed(1)}%` : "–"}
            </div>
            <div className="text-xs text-faint">around the range&apos;s middle</div>
          </div>
        </div>
      </Tile>
    </section>
  );
};

/* ------------------------------------------------------------------ 4. Status */

const StatusCard = ({
  icon,
  label,
  value,
  tone,
  text,
  link,
}: {
  icon: Icon;
  label: string;
  value: string;
  tone: "ok" | "warn";
  text: string;
  link: { href: string; label: string; external?: boolean };
}) => (
  <Tile innerClassName="flex gap-4 p-5">
    <IconBox icon={icon} round />
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${tone === "ok" ? "text-neon" : "text-amber"}`}>{value}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
      {link.external ? (
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-fg hover:text-neon"
        >
          {link.label} <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : (
        <Link
          href={link.href}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-fg hover:text-neon"
        >
          {link.label} <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  </Tile>
);

const Status = ({ d }: { d: LandingData }) => {
  const paused = d.ticksApart !== undefined && d.maxTicksApart !== undefined && d.ticksApart > d.maxTicksApart;
  return (
    <section
      aria-label="Vault status"
      className="mx-auto mt-4 grid max-w-[1200px] grid-cols-1 gap-3 px-4 sm:px-6 md:grid-cols-3"
    >
      <StatusCard
        icon={ArrowsRightLeftIcon}
        label="Range"
        value={d.inRange === false ? "Out of range" : "In range"}
        tone={d.inRange === false ? "warn" : "ok"}
        text={`${formatPriceSig(d.lower)} – ${formatPriceSig(d.upper)} ${d.unit}`}
        link={{ href: "/dashboard", label: "View details" }}
      />
      <StatusCard
        icon={ShieldCheckIcon}
        label="TWAP guard"
        value={paused ? "Paused" : "Active"}
        tone={paused ? "warn" : "ok"}
        text={`Spot is ${d.ticksApart ?? "–"} of ${d.maxTicksApart ?? "–"} allowed ticks from the TWAP. Protects against short-term price manipulation.`}
        link={{ href: "/how-it-works", label: "View rules" }}
      />
      <StatusCard
        icon={ArrowPathIcon}
        label="Rebalance"
        value={d.ago(d.lastRebalance)}
        tone="ok"
        text="Anyone can re-centre the range once the TWAP leaves it and the cooldown has passed."
        link={{
          href: d.address ? hashscan.contract(d.address) : "/debug",
          label: "View transactions",
          external: !!d.address,
        }}
      />
    </section>
  );
};

/* ------------------------------------------------------------------ 5. How it works */

const STEPS: { icon: Icon; title: string; text: string }[] = [
  { icon: ArrowTrendingUpIcon, title: "Earn fees", text: "Liquidity earns when the price is in range." },
  { icon: ShieldCheckIcon, title: "TWAP check", text: "Actions pause on short-term price spikes." },
  { icon: ArrowPathIcon, title: "Rebalance", text: "Re-centres the range on the TWAP." },
  { icon: ChartBarIcon, title: "Compound", text: "Reinvests fees to grow the position." },
];

const HowItWorks = () => (
  <section aria-labelledby="how-title" className="mx-auto mt-20 max-w-[1200px] px-4 sm:px-6">
    <div id="how-title">
      <SectionTitle
        title="How Tidepool works"
        sub="A simple flow, enforced by on-chain rules."
        action={
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1 text-sm font-medium text-fg hover:text-neon"
          >
            Step by step <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      />
    </div>
    <ol className="m-0 mt-6 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, i) => (
        <li key={step.title} className="relative">
          <Tile innerClassName="flex items-center gap-4 p-4">
            <IconBox icon={step.icon} />
            <div>
              <div className="font-semibold text-fg">{step.title}</div>
              <div className="mt-0.5 text-sm leading-snug text-muted">{step.text}</div>
            </div>
          </Tile>
          {i < STEPS.length - 1 && (
            <ArrowRightIcon
              className="absolute -right-[11px] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-neon/70 lg:block"
              aria-hidden
            />
          )}
        </li>
      ))}
    </ol>
  </section>
);

/* ------------------------------------------------------------------ 6. Activity */

const EVENT_ICONS: Record<string, Icon> = {
  Rebalance: ArrowsRightLeftIcon,
  Deposit: ArrowDownTrayIcon,
  Withdraw: ArrowUpTrayIcon,
  FeesCollected: BanknotesIcon,
  Compound: ArrowPathIcon,
  Initialized: FlagIcon,
};

const Activity = ({ d }: { d: LandingData }) => {
  const rows = d.events.slice(0, 6);
  return (
    <section aria-labelledby="activity-title" className="mx-auto mt-20 max-w-[1200px] px-4 sm:px-6">
      <div id="activity-title">
        <SectionTitle
          title="Recent activity"
          sub="Every action leaves a receipt."
          action={
            d.address && (
              <a
                href={hashscan.contract(d.address)}
                target="_blank"
                rel="noreferrer"
                className={`${btn.small} gap-1.5`}
              >
                View all on HashScan <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
              </a>
            )
          }
        />
      </div>
      <Tile className="mt-6" innerClassName="p-0">
        {d.eventsLoading ? (
          <p className="p-5 text-sm text-muted">Reading the vault&apos;s events from the mirror node…</p>
        ) : d.eventsError || rows.length === 0 ? (
          <p className="p-5 text-sm text-muted">
            {d.eventsError ? "The mirror node did not answer. Try again in a moment." : "No events yet."}
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-white/[0.06] p-0">
            {rows.map(row => {
              const I = EVENT_ICONS[row.name] ?? DocumentTextIcon;
              return (
                <li
                  key={row.key}
                  className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 sm:px-5 md:grid-cols-[32px_120px_minmax(0,1.2fr)_minmax(0,1.5fr)_80px_120px]"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-neon/[0.08] text-neon" aria-hidden>
                    <I className="h-4 w-4" />
                  </span>
                  <span className="font-semibold text-fg">{row.label}</span>
                  <span className="text-right text-xs text-faint md:hidden">{row.ago}</span>
                  <span className="col-start-2 col-end-4 tabular-nums text-fg md:col-auto md:truncate">
                    {row.amount}
                  </span>
                  <span className="col-start-2 col-end-4 text-sm text-muted md:col-auto md:truncate">{row.detail}</span>
                  <span className="hidden text-sm text-muted md:block">{row.ago}</span>
                  <a
                    href={hashscan.tx(row.tx)}
                    target="_blank"
                    rel="noreferrer"
                    className="col-start-2 col-end-4 inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-neon md:col-auto md:justify-end"
                  >
                    {row.tx.slice(0, 6)}…{row.tx.slice(-4)}
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Tile>
    </section>
  );
};

/* ------------------------------------------------------------------ 7. Hedera */

const Node = ({ icon, title, sub }: { icon: Icon; title: string; sub: string }) => (
  <Tile innerClassName="flex items-center gap-3 p-4">
    <IconBox icon={icon} />
    <div className="min-w-0">
      <div className="font-semibold text-fg">{title}</div>
      <div className="truncate text-sm text-muted">{sub}</div>
    </div>
  </Tile>
);

const Ecosystem = () => (
  <section aria-labelledby="eco-title" className="mx-auto mt-20 max-w-[1200px] px-4 sm:px-6">
    <div id="eco-title">
      <SectionTitle
        title="Built for the Hedera ecosystem"
        sub="Tidepool uses several Hedera services in one working setup."
      />
    </div>
    <div className="relative mt-8">
      {/* Top row: the call path */}
      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_48px_1fr_48px_1fr]">
        <Node icon={WalletIcon} title="Your wallet" sub="EVM wallet over JSON-RPC" />
        <ArrowRightIcon className="mx-auto hidden h-5 w-5 text-neon/70 md:block" aria-hidden />
        <Node icon={DocumentTextIcon} title="Tidepool Vault" sub="Solidity, no owner" />
        <ArrowRightIcon className="mx-auto hidden h-5 w-5 text-neon/70 md:block" aria-hidden />
        <Node icon={ArrowsRightLeftIcon} title="SaucerSwap V2" sub="Concentrated liquidity" />
      </div>
      {/* Connectors from the vault to the services below */}
      <svg className="hidden h-12 w-full md:block" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
        <path
          d="M50 0 V6 M16.5 6 H83.5 M16.5 6 V12 M50 6 V12 M83.5 6 V12"
          stroke="rgba(46,230,200,0.45)"
          strokeWidth="0.25"
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="4 4"
        />
      </svg>
      <div className="mt-3 grid grid-cols-1 gap-3 md:mt-0 md:grid-cols-3">
        <Node icon={CubeIcon} title="HTS" sub="Share token, mint and burn" />
        <Node icon={CircleStackIcon} title="Mirror node" sub="Activity feed for this site" />
        <Node icon={CurrencyDollarIcon} title="Exchange rate 0x168" sub="Position fee, cents to HBAR" />
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 8. Template CTA */

const BENEFITS = ["Ready-to-use frontend and contracts", "Hedera integrations included", "Easy to adapt to any pool"];

const TemplateCta = () => {
  const { copied, copy } = useCopy();
  return (
    <section
      id="template"
      aria-labelledby="cta-title"
      className="mx-auto mt-20 max-w-[1200px] scroll-mt-24 px-4 sm:px-6"
    >
      <div className="relative overflow-hidden rounded-3xl border border-neon/30 bg-[linear-gradient(135deg,rgba(46,230,200,0.14),rgba(10,20,23,0.95)_45%,rgba(34,211,238,0.08))] p-6 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(46,230,200,0.25),transparent)]"
        />
        <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div className="min-w-0">
            <h2
              id="cta-title"
              className="m-0 text-[clamp(28px,3.4vw,40px)] font-bold leading-tight tracking-[-0.03em] text-fg"
            >
              Build your own Hedera vault.
            </h2>
            <p className="mt-2 text-[16px] text-muted">Fork this template and deploy your own strategy in minutes.</p>
            <div className="mt-6 flex max-w-full items-start gap-3 rounded-xl border border-neon/25 bg-bg/70 px-4 py-3">
              <code className="min-w-0 flex-1 break-all font-mono text-[13px] leading-6 text-fg">
                {SCAFFOLD_COMMAND}
              </code>
              <button
                type="button"
                onClick={() => copy(SCAFFOLD_COMMAND)}
                className="shrink-0 cursor-pointer rounded-md p-1 text-muted hover:text-neon"
                aria-label={copied ? "Copied" : "Copy command"}
                title={copied ? "Copied" : "Copy"}
              >
                {copied ? (
                  <CheckCircleIcon className="h-5 w-5 text-neon" />
                ) : (
                  <ClipboardDocumentIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={btn.primary}>
                <GitHubMark className="h-4 w-4" /> View template on GitHub{" "}
                <ArrowRightIcon className="h-4 w-4" aria-hidden />
              </a>
              <Link href="/docs" className={btn.ghost}>
                Read docs <ArrowRightIcon className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {BENEFITS.map(item => (
              <li key={item} className="flex items-center gap-3 text-[15px] text-fg">
                <CheckCircleIcon className="h-6 w-6 shrink-0 text-neon" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

/** The landing page: hero, live overview, range, status, how it works, activity, Hedera services, template. */
export const Landing = () => {
  const d = useLandingData();
  return (
    <div>
      <Hero d={d} />
      <Overview d={d} />
      <Range d={d} />
      <Status d={d} />
      <HowItWorks />
      <Activity d={d} />
      <Ecosystem />
      <TemplateCta />
    </div>
  );
};
