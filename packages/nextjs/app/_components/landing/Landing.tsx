"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { RangeGraph } from "./RangeGraph";
import { WaveField } from "./WaveField";
import { type LandingData, useLandingData } from "./useLandingData";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { GradientText, btn } from "~~/components/pulse";
import { GITHUB_URL, SCAFFOLD_COMMAND } from "~~/utils/tidepool/constants";
import { formatPriceSig, formatToken } from "~~/utils/tidepool/format";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatDuration } from "~~/utils/tidepool/math";

/** One content width for the page: wide, with generous side padding. */
const WRAP = "mx-auto w-full max-w-[1480px] px-5 sm:px-8 lg:px-12";

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

const Mono = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${className}`}>{children}</span>
);

/** A section opens with its claim on the left and one paragraph on the right. */
const SectionHead = ({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) => (
  <div className="grid grid-cols-1 items-end gap-6 border-b border-white/[0.07] pb-10 lg:grid-cols-2 lg:gap-16">
    <h2 id={id} className="m-0 text-[clamp(34px,4.4vw,58px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-fg">
      {title}
    </h2>
    <p className="m-0 max-w-[560px] text-[17px] leading-relaxed text-muted lg:pb-1.5">{children}</p>
  </div>
);

const Command = () => {
  const { copied, copy } = useCopy();
  return (
    <div>
      <div className="rounded-xl border border-neon/25 bg-bg/80 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
          <Mono className="text-neon">Scaffold it</Mono>
          <button
            type="button"
            onClick={() => copy(SCAFFOLD_COMMAND)}
            className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-neon"
          >
            {copied ? <CheckCircleIcon className="h-4 w-4 text-neon" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <code className="block overflow-x-auto px-4 py-3.5 font-mono text-[11px] leading-6 text-fg sm:text-[13px]">
          <span className="select-none text-faint">$ </span>
          <span className="whitespace-nowrap">{SCAFFOLD_COMMAND.split(" --template")[0]}</span>{" "}
          <span className="whitespace-nowrap">--template{SCAFFOLD_COMMAND.split(" --template")[1]}</span>
        </code>
      </div>
      <p className="mt-2 text-xs text-faint">
        Keep the <code className="font-mono text-muted">--</code>: npm passes{" "}
        <code className="font-mono">--template</code> to the CLI only after it.
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ Hero */

const Hero = ({ d }: { d: LandingData }) => {
  const inRange = d.inRange !== false;
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-15%] top-[-25%] -z-10 h-[760px] w-[1100px] rounded-full bg-[radial-gradient(closest-side,rgba(46,230,200,0.13),transparent)]"
      />
      {/* The wave fills the right side to the edge of the screen on large screens. */}
      <WaveField className="absolute inset-y-0 right-0 -z-10 hidden w-[64%] [mask-image:linear-gradient(90deg,transparent,black_28%)] lg:block" />

      <div
        className={`${WRAP} relative grid min-h-[min(calc(100svh-4rem),820px)] grid-cols-1 items-center lg:grid-cols-12`}
      >
        <div className="py-14 lg:col-span-6 lg:py-20">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-2 rounded-full border border-neon/25 bg-neon/[0.07] px-3 py-1 text-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_8px_#2EE6C8]" aria-hidden />
              Built on Hedera
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-muted">Scaffold-HBAR template</span>
          </div>
          <h1 className="m-0 mt-7 text-[clamp(56px,7.6vw,104px)] font-extrabold leading-[0.95] tracking-[-0.05em] text-fg">
            Tidepool
          </h1>
          <p className="m-0 mt-3 text-[clamp(28px,3.4vw,46px)] font-bold leading-tight tracking-[-0.035em] text-fg">
            Liquidity on <GradientText>autopilot.</GradientText>
          </p>
          <p className="mt-6 max-w-[540px] text-[18px] leading-relaxed text-muted">
            One SaucerSwap V2 position, owned by a contract with no owner. It compounds its own fees and re-centres its
            range on the pool&apos;s average price.{" "}
            <span className="text-fg">Anyone can press the button; nobody can steer it.</span>
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/dashboard" className={btn.primary}>
              Launch vault <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </Link>
            <a href="#template" className={btn.ghost}>
              Use this template <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </a>
          </div>
          <div className="mt-10 max-w-[580px]">
            <Command />
          </div>
        </div>

        {/* On large screens the live card floats over the wave; on phones the wave sits above it. */}
        <div className="relative pb-12 lg:col-span-5 lg:col-start-8 lg:self-end lg:pb-20">
          <WaveField className="relative -mx-5 h-[220px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_45%,black_50%,transparent)] lg:hidden" />
          <div className="relative -mt-8 rounded-2xl border border-neon/20 bg-[rgba(10,20,23,0.75)] p-5 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md lg:ml-auto lg:mt-0 lg:max-w-[380px]">
            <div className="flex items-center justify-between">
              <Mono className="text-muted">Main vault · live</Mono>
              <span className="inline-flex items-center gap-2 text-xs text-neon">
                <span className="h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_#2EE6C8]" aria-hidden />
                Hedera Testnet
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[34px] font-bold leading-none tabular-nums tracking-[-0.03em] text-fg">
                {formatPriceSig(d.spot)}
              </span>
              <span className="text-sm text-muted">{d.unit}</span>
            </div>
            <div className="mt-3 text-sm text-muted">
              Range {formatPriceSig(d.lower)} – {formatPriceSig(d.upper)} ·{" "}
              <span className={inRange ? "text-neon" : "text-amber"}>
                {d.inRange === undefined ? "reading" : inRange ? "in range, earning fees" : "out of range"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ The problem */

const COMPARE: { label: string; manual: string; tidepool: string }[] = [
  { label: "Who moves the range", manual: "You, whenever you notice", tidepool: "Anyone, once the TWAP has left it" },
  {
    label: "Who can steer it",
    manual: "Whoever holds the keys or runs the bot",
    tidepool: "Nobody: spot must sit within 50 ticks of the 10-minute TWAP",
  },
  { label: "Swap fees", manual: "Wait until you claim them", tidepool: "Compounded back into the position" },
  { label: "Admin keys", manual: "Yours, or an operator's", tidepool: "None: no owner, no upgrades" },
  { label: "Your stake", manual: "A position NFT you manage", tidepool: "A native HTS share token" },
];

const Problem = () => (
  <section aria-labelledby="problem-title" className={`${WRAP} pt-28`}>
    <SectionHead id="problem-title" title="A range stops earning the moment price leaves it.">
      Concentrated liquidity earns more per token, but only between two prices. Someone has to watch the market, move
      the range and reinvest the fees. <span className="text-fg">Tidepool turns that job into rules on chain.</span>
    </SectionHead>
    <div className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08]">
      <div className="grid grid-cols-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="hidden border-b border-white/[0.08] p-6 md:block" />
        <div className="border-b border-white/[0.08] p-6">
          <div className="text-xl font-bold text-muted">Doing it yourself</div>
          <Mono className="mt-1 block text-faint">Any concentrated position</Mono>
        </div>
        <div className="border-b border-l border-neon/20 border-b-white/[0.08] bg-neon/[0.05] p-6">
          <div className="text-xl font-bold text-neon">Tidepool</div>
          <Mono className="mt-1 block text-faint">On Hedera</Mono>
        </div>
        {COMPARE.map((row, i) => (
          <div key={row.label} className="contents">
            <div
              className={`col-span-2 px-6 pt-5 md:col-span-1 md:py-5 ${i < COMPARE.length - 1 ? "md:border-b md:border-white/[0.06]" : ""}`}
            >
              <Mono className="text-faint">{row.label}</Mono>
            </div>
            <div
              className={`px-6 pb-5 pt-2 text-[15px] text-muted md:py-5 ${i < COMPARE.length - 1 ? "border-b border-white/[0.06]" : ""}`}
            >
              {row.manual}
            </div>
            <div
              className={`border-l border-neon/20 bg-neon/[0.05] px-6 pb-5 pt-2 text-[15px] font-medium text-fg md:py-5 ${
                i < COMPARE.length - 1 ? "border-b border-b-white/[0.06]" : ""
              }`}
            >
              {row.tidepool}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ Live */

const Verdict = ({ action, ok, why }: { action: string; ok: boolean; why: string }) => (
  <li className="flex items-start justify-between gap-4 py-4">
    <div>
      <div className="font-semibold text-fg">{action}</div>
      <div className="mt-0.5 text-sm text-muted">{why}</div>
    </div>
    <span
      className={`mt-0.5 shrink-0 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] ${
        ok ? "bg-neon/10 text-neon" : "bg-white/[0.05] text-muted"
      }`}
    >
      {ok ? "Allowed" : "Waiting"}
    </span>
  </li>
);

const Live = ({ d }: { d: LandingData }) => {
  const apart = d.ticksApart;
  const limit = d.maxTicksApart;
  const paused = apart !== undefined && limit !== undefined && apart > limit;
  const inRange = d.inRange !== false;
  const readyAt =
    d.lastRebalanceOnChain !== undefined && d.cooldown !== undefined ? d.lastRebalanceOnChain + d.cooldown : undefined;
  const cooldownLeft = readyAt !== undefined ? readyAt - d.now : undefined;
  const guard = `Spot is ${apart ?? "–"} ticks from the TWAP (limit ${limit ?? "–"})`;
  const minutes = d.twapWindow ? Math.round(d.twapWindow / 60) : 10;

  const metrics: { label: string; value: string; sub: string }[] = [
    { label: "Vault value", value: formatToken(d.value1), sub: `${d.symbol1}, at spot` },
    {
      label: "Share price",
      value: d.sharePrice !== undefined ? d.sharePrice.toFixed(2) : "–",
      sub: `${d.symbol1} per share`,
    },
    { label: `TWAP (${minutes} min)`, value: formatPriceSig(d.twap), sub: d.unit },
    {
      label: "Range width",
      value: d.rangeHalfWidth !== undefined ? `±${d.rangeHalfWidth.toFixed(1)}%` : "–",
      sub: "±600 ticks",
    },
    { label: "Last rebalance", value: d.ago(d.lastRebalance), sub: "re-centred on the TWAP" },
  ];

  return (
    <section aria-labelledby="live-title" className={`${WRAP} pt-28`}>
      <SectionHead
        id="live-title"
        title={
          <>
            The vault, <GradientText>right now.</GradientText>
          </>
        }
      >
        Read live from the main vault on Hedera testnet. The same rules the contract checks decide what it would accept
        this minute. <span className="text-fg">Nothing here needs a wallet.</span>
      </SectionHead>

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-2xl border border-white/[0.08] bg-surface/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-base font-semibold text-fg">
              {d.pair} <span className="font-normal text-muted">· SaucerSwap V2, 0.30%</span>
            </div>
            <span
              className={`rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] ${
                inRange ? "bg-neon/10 text-neon" : "bg-amber/10 text-amber"
              }`}
            >
              {d.inRange === undefined ? "Reading" : inRange ? "In range · earning" : "Out of range · not earning"}
            </span>
          </div>
          <div className="mt-6">
            <RangeGraph lower={d.lower} upper={d.upper} spot={d.spot} twap={d.twap} inRange={d.inRange} height={300} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-surface/60 p-6">
          <Mono className="text-faint">What the vault would accept now</Mono>
          <ul className="m-0 mt-2 list-none divide-y divide-white/[0.06] p-0">
            <Verdict action="Deposit" ok={!paused} why={paused ? guard : "Only the TWAP guard applies"} />
            <Verdict
              action="Compound"
              ok={!paused && inRange && d.hasPosition !== false}
              why={
                paused
                  ? guard
                  : !inRange
                    ? "Waits until the TWAP is back inside the range"
                    : "Adds fees and idle tokens"
              }
            />
            <Verdict
              action="Rebalance"
              ok={!paused && d.inRange === false && (cooldownLeft ?? 1) <= 0}
              why={
                paused
                  ? guard
                  : inRange
                    ? "Waits until the TWAP leaves the range"
                    : cooldownLeft !== undefined && cooldownLeft > 0
                      ? `Cooldown: ${formatDuration(cooldownLeft)} left`
                      : "Open to anyone now"
              }
            />
            <Verdict action="Withdraw" ok why="Never blocked" />
          </ul>
          <Link
            href="/dashboard"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-fg hover:text-neon"
          >
            Open the dashboard <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      <dl className="m-0 mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.08] sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map(m => (
          <div key={m.label} className="border-b border-r border-white/[0.06] p-5 last:border-r-0">
            <dt>
              <Mono className="text-faint">{m.label}</Mono>
            </dt>
            <dd className="m-0 mt-2 text-2xl font-bold tabular-nums tracking-[-0.02em] text-fg">{m.value}</dd>
            <dd className="m-0 mt-0.5 text-xs text-faint">{m.sub}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

/* ------------------------------------------------------------------ Proof */

const EVIDENCE = [
  {
    tag: "Main vault · compound",
    title: "Fees, back to work.",
    text: "Collected 0.0047 WHBAR + 0.213 SAUCE of swap fees and added them to position #392.",
    stats: "563,157 gas · 0.61 HBAR",
    tx: "0x76c3114520d0693e07ae4f3b53128d89d9a0ef672e9aec153b8291fbc7e1a9ca",
  },
  {
    tag: "Narrow vault · rebalance",
    title: "It moved when the average did.",
    text: "A 106-tick price drop pushed the TWAP out of [−7860, −7740). One call re-centred the range to [−7980, −7860).",
    stats: "982,492 gas · 1.07 HBAR",
    tx: "0xf55864c1fc7bdd54ae9597ecae2f8f70e534c0af4c0c7fb14da31065ceda0654",
  },
  {
    tag: "Main vault · this site",
    title: "A second wallet, in and out.",
    text: "Another account deposited 0.9999 WHBAR + 38.2454 SAUCE for 1.0097 shares, then withdrew, all from the dashboard.",
    stats: "deposit, then withdraw",
    tx: "0xbcfc48e9cee0edcb1610f430ce150e85152c9677f5a77811375cbc4bf18fd82f",
  },
];

const GAS = [
  { action: "Initialize", gas: "5.24M", note: "associations, share token, standing approvals" },
  { action: "First compound", gas: "0.89M", note: "opens the position" },
  { action: "Compound", gas: "0.56M", note: "was 4.80M before standing approvals" },
  { action: "Rebalance", gas: "0.98M", note: "was 5.26M before standing approvals" },
  { action: "Withdraw", gas: "0.34M", note: "never blocked by the guard" },
];

const Proof = () => (
  <section aria-labelledby="proof-title" className={`${WRAP} pt-28`}>
    <SectionHead id="proof-title" title="Every rule, tested on testnet.">
      Two vaults, the same code. One earned and compounded; one was pushed out of range and re-centred itself.{" "}
      <span className="text-fg">Every result below is a transaction you can open.</span>
    </SectionHead>
    <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
      {EVIDENCE.map(e => (
        <article key={e.tx} className="flex flex-col rounded-2xl border border-white/[0.08] bg-surface/60">
          <div className="flex-1 p-6">
            <Mono className="text-neon">{e.tag}</Mono>
            <h3 className="m-0 mt-4 text-[22px] font-bold leading-snug tracking-[-0.02em] text-fg">{e.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{e.text}</p>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
            <Mono className="text-faint">{e.stats}</Mono>
            <a
              href={hashscan.tx(e.tx)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-neon"
            >
              Transaction <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </article>
      ))}
    </div>
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-3">
        <Mono className="text-faint">Gas used on testnet</Mono>
        <Link
          href="/docs/testnet-evidence"
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-neon"
        >
          All transactions <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {GAS.map(g => (
          <div key={g.action} className="border-r border-t border-white/[0.06] p-5 first:border-l-0 lg:border-t-0">
            <div className="text-sm text-muted">{g.action}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums tracking-[-0.02em] text-fg">{g.gas}</div>
            <div className="mt-0.5 text-xs text-faint">{g.note}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ Hedera */

const HEDERA = [
  {
    tag: "HTS",
    title: "Shares are a native token",
    text: "Created, minted and burned by the vault. Amounts are int64; accounts associate through HIP-719.",
  },
  {
    tag: "Exchange rate · 0x168",
    title: "The mint fee, priced on chain",
    text: "SaucerSwap charges its position fee in US cents. The precompile converts it to tinybars in the same call.",
  },
  {
    tag: "Allowances",
    title: "Capped at max supply",
    text: "HTS rejects an allowance above a token's max supply. The vault caps its standing approvals and can restore them.",
  },
  {
    tag: "Simulation",
    title: "Mints that can't be simulated",
    text: "eth_call returns INVALID_NFT_ID for SaucerSwap mints, so the site checks every precondition, then sends with fixed gas.",
  },
  {
    tag: "Units",
    title: "Weibar in, tinybar inside",
    text: "JSON-RPC values use 18 decimals and contracts see 8. The dashboard converts both ways.",
  },
  {
    tag: "WHBAR",
    title: "Wrapped through the helper",
    text: "Never approve the WHBAR contract itself. Wrapping goes through SaucerSwap's WhbarHelper, as SaucerSwap requires.",
  },
];

const Hedera = () => (
  <section aria-labelledby="hedera-title" className={`${WRAP} pt-28`}>
    <SectionHead id="hedera-title" title="Hedera's rules, already handled.">
      The details that break a first DeFi contract on Hedera are solved in the template, tested, and written down in the
      docs. <span className="text-fg">You start from working code, not from the error messages.</span>
    </SectionHead>
    <div className="mt-10 grid grid-cols-1 overflow-hidden rounded-2xl border border-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
      {HEDERA.map(item => (
        <div key={item.title} className="border-b border-r border-white/[0.06] p-6">
          <Mono className="text-neon">{item.tag}</Mono>
          <h3 className="m-0 mt-3 text-lg font-bold text-fg">{item.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.text}</p>
        </div>
      ))}
    </div>
  </section>
);

/* ------------------------------------------------------------------ Template */

const INCLUDED = [
  "Vault contract with no owner and no upgrades",
  "Deploy scripts that preflight initialize()",
  "Operator scripts: compound, rebalance, withdraw",
  "Unit tests on mocks, no network needed",
  "This site: dashboard, docs, contract debugger",
  "AGENTS.md, so a coding agent can extend it",
];

const Template = () => (
  <section id="template" aria-labelledby="template-title" className={`${WRAP} scroll-mt-24 pt-28`}>
    <div className="relative overflow-hidden rounded-3xl border border-neon/30 bg-[linear-gradient(135deg,rgba(46,230,200,0.14),rgba(10,20,23,0.96)_45%,rgba(34,211,238,0.08))] p-6 sm:p-10 lg:p-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(46,230,200,0.25),transparent)]"
      />
      <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <h2
            id="template-title"
            className="m-0 text-[clamp(32px,4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-fg"
          >
            Build your own Hedera vault.
          </h2>
          <p className="mt-3 max-w-[520px] text-[17px] text-muted">
            Fork the template, point it at your pool, and deploy. The contracts, scripts, tests and this site come with
            it.
          </p>
          <div className="mt-7">
            <Command />
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={btn.primary}>
              View on GitHub <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
            </a>
            <Link href="/docs/quickstart" className={btn.ghost}>
              Quickstart <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
        <div>
          <Mono className="text-faint">What you get</Mono>
          <ul className="m-0 mt-4 flex list-none flex-col gap-3.5 p-0">
            {INCLUDED.map(item => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-fg">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-neon" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

/** The landing page: the claim, the problem, the vault live, the proof, the Hedera details, and the template. */
export const Landing = () => {
  const d = useLandingData();
  return (
    <div>
      <Hero d={d} />
      <Problem />
      <Live d={d} />
      <Proof />
      <Hedera />
      <Template />
    </div>
  );
};
