"use client";

import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RangeGraph } from "./RangeGraph";
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

/** The scaffold command as a one-line terminal, with the two commands that follow it. */
const Command = () => {
  const { copied, copy } = useCopy();
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(5,11,13,0.78)] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/80" aria-hidden />
        <span className="ml-3 text-xs text-muted">Start your own vault</span>
        <button
          type="button"
          onClick={() => copy(SCAFFOLD_COMMAND)}
          className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-neon/40 hover:text-neon"
        >
          {copied ? (
            <CheckCircleIcon className="h-3.5 w-3.5 text-neon" />
          ) : (
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-7 xl:text-[12.5px]">
        <div className="whitespace-nowrap text-fg">
          <span className="select-none text-neon">$ </span>
          {SCAFFOLD_COMMAND}
        </div>
        <div className="whitespace-nowrap text-muted">
          <span className="select-none text-faint">$ </span>cd your-vault
        </div>
        <div className="whitespace-nowrap text-muted">
          <span className="select-none text-faint">$ </span>npm run next:dev
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ Hero */

const Hero = () => (
  <section className="relative isolate overflow-hidden">
    {/* Night sea, full width; darkened where the text sits and blended into the page at the bottom. */}
    <Image src="/hero-sea.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-bottom" />
    <div
      aria-hidden
      className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,11,13,0.82)_0%,rgba(5,11,13,0.45)_55%,rgba(5,11,13,0.2)_100%)]"
    />
    <div
      aria-hidden
      className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,11,13,0.55)_0%,rgba(5,11,13,0)_30%,rgba(5,11,13,0)_70%,#050b0d_100%)]"
    />

    <div
      className={`${WRAP} grid min-h-[min(calc(100svh-4rem),860px)] grid-cols-1 items-center gap-12 py-16 lg:grid-cols-2 lg:py-24`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="inline-flex items-center gap-2 rounded-full border border-neon/25 bg-neon/[0.08] px-3 py-1 text-fg backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_8px_#2EE6C8]" aria-hidden />
            Built on Hedera
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-muted backdrop-blur-sm">
            Scaffold-HBAR template
          </span>
        </div>
        <h1 className="m-0 mt-7 text-[clamp(56px,7.6vw,110px)] font-extrabold leading-[0.95] tracking-[-0.05em] text-fg">
          Tidepool
        </h1>
        <p className="m-0 mt-3 text-[clamp(28px,3.4vw,48px)] font-bold leading-tight tracking-[-0.035em] text-fg">
          Liquidity on <GradientText>autopilot.</GradientText>
        </p>
        <p className="mt-6 max-w-[540px] text-[18px] leading-relaxed text-fg/75">
          One SaucerSwap V2 position, owned by a contract with no owner. It compounds its own fees and re-centres its
          range on the pool&apos;s average price.{" "}
          <span className="text-fg">Anyone can press the button; nobody can steer it.</span>
        </p>
      </div>
      <div className="min-w-0 lg:self-end lg:pb-4">
        <Command />
      </div>
    </div>
  </section>
);

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
            <RangeGraph lower={d.lower} upper={d.upper} spot={d.spot} twap={d.twap} inRange={d.inRange} />
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
    metric: "8.6×",
    unit: "less gas",
    title: "Compounding got cheap.",
    text: "Standing approvals cut a compound from 4.80M to 0.56M gas. This one collected 0.0047 WHBAR + 0.213 SAUCE of fees and put them back to work.",
    tag: "Main vault · compound",
    tx: "0x76c3114520d0693e07ae4f3b53128d89d9a0ef672e9aec153b8291fbc7e1a9ca",
  },
  {
    metric: "1",
    unit: "call",
    title: "It moved when the average did.",
    text: "A 106-tick price drop pushed the narrow vault's TWAP out of its range. One call from anyone re-centred it, at 0.98M gas.",
    tag: "Narrow vault · rebalance",
    tx: "0xf55864c1fc7bdd54ae9597ecae2f8f70e534c0af4c0c7fb14da31065ceda0654",
  },
  {
    metric: "2",
    unit: "wallets",
    title: "Real users, through this site.",
    text: "A second account deposited 0.9999 WHBAR + 38.2454 SAUCE for 1.0097 shares, then withdrew, using the dashboard you can open now.",
    tag: "Main vault · deposit",
    tx: "0xbcfc48e9cee0edcb1610f430ce150e85152c9677f5a77811375cbc4bf18fd82f",
  },
];

const Proof = () => (
  <section aria-labelledby="proof-title" className={`${WRAP} pt-28`}>
    <SectionHead id="proof-title" title="Every rule, tested on testnet.">
      A template is only worth forking if it works. Two vaults ran the same code on Hedera testnet.{" "}
      <span className="text-fg">Each result below links to the transaction.</span>
    </SectionHead>
    <ol className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
      {EVIDENCE.map((e, i) => (
        <li
          key={e.tx}
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/60 transition-colors hover:border-neon/30"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(46,230,200,0.16),transparent)] opacity-60 transition-opacity group-hover:opacity-100"
          />
          <div className="relative flex-1 p-7">
            <div className="flex items-center justify-between">
              <Mono className="text-faint">0{i + 1}</Mono>
              <Mono className="text-neon">{e.tag}</Mono>
            </div>
            <div className="mt-8 flex items-baseline gap-2">
              <span className="bg-[linear-gradient(90deg,#2EE6C8,#22D3EE)] bg-clip-text text-[64px] font-extrabold leading-none tracking-[-0.04em] text-transparent">
                {e.metric}
              </span>
              <span className="text-lg font-semibold text-muted">{e.unit}</span>
            </div>
            <h3 className="m-0 mt-6 text-[21px] font-bold tracking-[-0.02em] text-fg">{e.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{e.text}</p>
          </div>
          <a
            href={hashscan.tx(e.tx)}
            target="_blank"
            rel="noreferrer"
            className="relative flex items-center justify-between border-t border-white/[0.06] px-7 py-4 text-sm font-medium text-muted transition-colors hover:text-neon"
          >
            View the transaction on HashScan
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
          </a>
        </li>
      ))}
    </ol>
    <Link
      href="/docs/testnet-evidence"
      className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-fg hover:text-neon"
    >
      Every transaction and gas figure <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
    </Link>
  </section>
);

/* ------------------------------------------------------------------ Hedera */

const HEDERA = [
  {
    glyph: "HTS",
    title: "Shares are a native token",
    text: "The vault creates, mints and burns its own HTS share token. Holders associate it through HIP-719.",
    wide: true,
  },
  {
    glyph: "0x168",
    title: "The fee, priced on chain",
    text: "SaucerSwap's position fee is quoted in US cents; the exchange-rate precompile turns it into tinybars.",
  },
  {
    glyph: "int64",
    title: "Amounts that fit HTS",
    text: "HTS amounts are int64, and allowances above a token's max supply are rejected. The vault caps both.",
  },
  {
    glyph: "18 → 8",
    title: "Weibar in, tinybar inside",
    text: "JSON-RPC values carry 18 decimals and contracts see 8. The dashboard converts both ways.",
  },
  {
    glyph: "WHBAR",
    title: "Wrapped through the helper",
    text: "Never approve the WHBAR contract itself. Wrapping goes through SaucerSwap's WhbarHelper, as SaucerSwap requires.",
  },
  {
    glyph: "INVALID_NFT_ID",
    title: "Mints that can't be simulated",
    text: "eth_call rejects SaucerSwap mints that succeed on chain, so the site checks every precondition, then sends with fixed gas.",
    full: true,
  },
];

const Hedera = () => (
  <section aria-labelledby="hedera-title" className={`${WRAP} pt-28`}>
    <SectionHead id="hedera-title" title="Hedera's rules, already handled.">
      These are the details that break a first DeFi contract on Hedera. The template solves each one and the docs
      explain it. <span className="text-fg">You start from working code, not from error messages.</span>
    </SectionHead>
    <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
      {HEDERA.map(item => (
        <article
          key={item.title}
          className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(160deg,rgba(15,28,32,0.9),rgba(8,15,17,0.9))] p-7 transition-colors hover:border-neon/30 ${
            item.full ? "md:col-span-3" : item.wide ? "md:col-span-2" : ""
          }`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(46,230,200,0.6),transparent)] opacity-0 transition-opacity group-hover:opacity-100"
          />
          <div className="overflow-hidden text-ellipsis whitespace-nowrap bg-[linear-gradient(90deg,#2EE6C8,#22D3EE)] bg-clip-text font-mono text-[clamp(30px,3.4vw,46px)] font-bold leading-none tracking-[-0.02em] text-transparent">
            {item.glyph}
          </div>
          <h3 className="m-0 mt-8 text-lg font-bold text-fg">{item.title}</h3>
          <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-muted">{item.text}</p>
        </article>
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
      <Hero />
      <Problem />
      <Live d={d} />
      <Proof />
      <Hedera />
      <Template />
    </div>
  );
};
