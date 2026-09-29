"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RangeGraph } from "./RangeGraph";
import { ServicesMap } from "./ServicesMap";
import { type LandingData, useLandingData } from "./useLandingData";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { GradientText, btn } from "~~/components/pulse";
import { Reveal } from "~~/components/pulse/Reveal";
import { GITHUB_URL, SCAFFOLD_COMMAND } from "~~/utils/tidepool/constants";
import { formatDuration } from "~~/utils/tidepool/math";

/** One content width for the page: wide, with generous side padding. */
const WRAP = "mx-auto w-full max-w-[1480px] px-5 sm:px-8 lg:px-12";

/** Delay (ms) for the hero's entrance animations. */
const delay = (ms: number) => ({ "--d": ms }) as CSSProperties;

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

/** A text link with an arrow that nudges on hover. */
const ArrowLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="group inline-flex items-center gap-1 text-sm font-semibold text-fg hover:text-neon">
    {children}
    <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
  </Link>
);

/** A section opens with its claim on the left and one paragraph on the right; the rule under it draws in. */
const SectionHead = ({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) => (
  <Reveal>
    <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-2 lg:gap-16">
      <h2
        id={id}
        className="m-0 text-balance text-[clamp(34px,4.4vw,58px)] font-extrabold leading-[1.04] tracking-[-0.04em] text-fg"
      >
        {title}
      </h2>
      <p className="m-0 max-w-[560px] text-[17px] leading-relaxed text-muted lg:pb-1.5">{children}</p>
    </div>
    <div className="tp-rule mt-10 h-px bg-white/[0.07]" aria-hidden />
  </Reveal>
);

/** The scaffold command as a terminal. In the hero it types itself out once, then the next two commands appear. */
const Command = ({ typing = false }: { typing?: boolean }) => {
  const { copied, copy } = useCopy();
  const ref = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState(typing ? 0 : SCAFFOLD_COMMAND.length);
  const done = typed >= SCAFFOLD_COMMAND.length;

  useEffect(() => {
    if (!typing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(SCAFFOLD_COMMAND.length);
      return;
    }
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setTyped(n => {
          if (n >= SCAFFOLD_COMMAND.length) {
            clearInterval(interval);
            return n;
          }
          return n + 1;
        });
      }, 24);
    }, 1100);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [typing]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(5,11,13,0.8)] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md transition-colors duration-300 hover:border-white/20"
    >
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/80" aria-hidden />
        <span className="ml-3 text-xs text-muted">Start your own vault</span>
        <button
          type="button"
          onClick={() => copy(SCAFFOLD_COMMAND)}
          className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-neon/40 hover:text-neon active:scale-95"
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
          <span className="sr-only">{SCAFFOLD_COMMAND}</span>
          <span aria-hidden>{SCAFFOLD_COMMAND.slice(0, typed)}</span>
          {!done && (
            <span
              className="tp-caret ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] bg-neon"
              aria-hidden
            />
          )}
        </div>
        <div
          className={`whitespace-nowrap text-muted transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`}
        >
          <span className="select-none text-faint">$ </span>cd your-vault
        </div>
        <div
          className={`whitespace-nowrap text-muted transition-opacity duration-500 ${done ? "opacity-100 delay-200" : "opacity-0"}`}
        >
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
    <Image
      src="/hero-sea.jpg"
      alt=""
      fill
      priority
      sizes="100vw"
      className="tp-settle -z-20 object-cover object-bottom"
    />
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
        <div className="tp-in flex flex-wrap items-center gap-2 text-xs font-medium" style={delay(100)}>
          <span className="inline-flex items-center gap-2 rounded-full border border-neon/25 bg-neon/[0.08] px-3 py-1 text-fg backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_8px_#2EE6C8]" aria-hidden />
            Built on Hedera
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-muted backdrop-blur-sm">
            Scaffold-HBAR template
          </span>
        </div>
        <h1 className="m-0 mt-7 text-[clamp(56px,7.6vw,110px)] font-extrabold leading-[0.95] tracking-[-0.05em] text-fg">
          <span className="tp-line">
            <span style={delay(200)}>Tidepool</span>
          </span>
        </h1>
        <p className="m-0 mt-2 text-[clamp(28px,3.4vw,48px)] font-bold leading-tight tracking-[-0.035em] text-fg">
          <span className="tp-line">
            <span style={delay(380)}>
              Liquidity on <GradientText>autopilot.</GradientText>
            </span>
          </span>
        </p>
        <p className="tp-in mt-5 max-w-[540px] text-[18px] leading-relaxed text-fg/75" style={delay(560)}>
          One SaucerSwap V2 position, owned by a contract with no owner. It compounds its own fees and re-centres its
          range on the pool&apos;s average price.{" "}
          <span className="text-fg">Anyone can press the button; nobody can steer it.</span>
        </p>
      </div>
      <div className="tp-in min-w-0 lg:self-end lg:pb-4" style={delay(760)}>
        <Command typing />
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ Comparison table */

type Row = { label: string; left: string; right: string };

/** A plain three-column comparison: row label, the usual way, and Tidepool's way. Rows light up on hover. */
const CompareTable = ({
  left,
  leftSub,
  right,
  rightSub,
  rows,
}: {
  left: string;
  leftSub: string;
  right: string;
  rightSub: string;
  rows: Row[];
}) => (
  <Reveal step={1} className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08]">
    <div className="grid grid-cols-2 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="hidden border-b border-white/[0.08] p-6 md:block" />
      <div className="border-b border-white/[0.08] p-6">
        <div className="text-lg font-bold text-muted">{left}</div>
        <Mono className="mt-1 block text-faint">{leftSub}</Mono>
      </div>
      <div className="border-b border-l border-white/[0.08] bg-white/[0.02] p-6">
        <div className="text-lg font-bold text-fg">{right}</div>
        <Mono className="mt-1 block text-neon">{rightSub}</Mono>
      </div>
      {rows.map((row, i) => {
        const last = i === rows.length - 1;
        const cell = "transition-colors duration-200 group-hover/row:bg-white/[0.035]";
        return (
          <div key={row.label} className="group/row contents">
            <div
              className={`col-span-2 px-6 pt-5 md:col-span-1 md:py-5 ${cell} ${last ? "" : "md:border-b md:border-white/[0.06]"}`}
            >
              <Mono className="text-faint transition-colors duration-200 group-hover/row:text-neon">{row.label}</Mono>
            </div>
            <div
              className={`px-6 pb-5 pt-2 text-[15px] text-muted md:py-5 ${cell} ${last ? "" : "border-b border-white/[0.06]"}`}
            >
              {row.left}
            </div>
            <div
              className={`border-l border-white/[0.08] bg-white/[0.02] px-6 pb-5 pt-2 text-[15px] text-fg md:py-5 ${cell} ${
                last ? "" : "border-b border-b-white/[0.06]"
              }`}
            >
              {row.right}
            </div>
          </div>
        );
      })}
    </div>
  </Reveal>
);

/* ------------------------------------------------------------------ The problem */

const COMPARE: Row[] = [
  { label: "Who moves the range", left: "You, whenever you notice", right: "Anyone, once the TWAP has left it" },
  {
    label: "Who can steer it",
    left: "Whoever holds the keys or runs the bot",
    right: "Nobody: spot must sit within 50 ticks of the 10-minute TWAP",
  },
  { label: "Swap fees", left: "Wait until you claim them", right: "Compounded back into the position" },
  { label: "Admin keys", left: "Yours, or an operator's", right: "None: no owner, no upgrades" },
  { label: "Your stake", left: "A position NFT you manage", right: "A native HTS share token" },
];

const Problem = () => (
  <section aria-labelledby="problem-title" className={`${WRAP} pt-28`}>
    <SectionHead id="problem-title" title="Out of range, out of earnings.">
      Concentrated liquidity earns more per token, but only between two prices. Someone has to watch the market, move
      the range and reinvest the fees. <span className="text-fg">Tidepool turns that job into rules on chain.</span>
    </SectionHead>
    <CompareTable
      left="Doing it yourself"
      leftSub="Any concentrated position"
      right="Tidepool"
      rightSub="On Hedera"
      rows={COMPARE}
    />
  </section>
);

/* ------------------------------------------------------------------ Live */

const Verdict = ({ action, ok, why }: { action: string; ok: boolean; why: string }) => (
  <li className="-mx-3 flex items-start justify-between gap-4 rounded-lg px-3 py-4 transition-colors duration-200 hover:bg-white/[0.03]">
    <div>
      <div className="font-semibold text-fg">{action}</div>
      <div className="mt-0.5 text-sm text-muted">{why}</div>
    </div>
    <span
      className={`mt-0.5 shrink-0 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors duration-500 ${
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
        <Reveal
          step={1}
          className="rounded-2xl border border-white/[0.08] bg-surface/60 p-6 transition-colors duration-300 hover:border-white/[0.14]"
        >
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
        </Reveal>

        <Reveal
          step={2}
          className="rounded-2xl border border-white/[0.08] bg-surface/60 p-6 transition-colors duration-300 hover:border-white/[0.14]"
        >
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
          <div className="mt-3">
            <ArrowLink href="/dashboard">Open the dashboard</ArrowLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Hedera services */

const Services = () => (
  <section aria-labelledby="services-title" className={`${WRAP} pt-28`}>
    <SectionHead id="services-title" title="Built on Hedera's own services.">
      No off-chain bot and no custom indexer: a contract and a website on services Hedera already runs.{" "}
      <span className="text-fg">Pick one to see where it fits.</span>
    </SectionHead>
    <Reveal step={1}>
      <ServicesMap />
    </Reveal>
  </section>
);

/* ------------------------------------------------------------------ Hedera rules */

const HEDERA: Row[] = [
  {
    label: "Share token",
    left: "An ERC-20 contract you deploy",
    right: "An HTS token the vault creates, mints and burns. Holders associate it once (HIP-719).",
  },
  {
    label: "Token amounts",
    left: "uint256",
    right: "int64 inside HTS. The vault converts every amount with SafeCast.",
  },
  {
    label: "Allowances",
    left: "Approve the maximum and forget it",
    right:
      "HTS rejects anything above a token's max supply. The vault caps each one; refreshApprovals() restores them.",
  },
  {
    label: "Protocol fees",
    left: "Paid in the native token",
    right: "SaucerSwap quotes its position fee in US cents. The exchange-rate precompile (0x168) converts it on chain.",
  },
  {
    label: "Units",
    left: "Wei everywhere",
    right: "JSON-RPC uses weibar (18 decimals), contracts see tinybar (8). The dashboard converts both ways.",
  },
  {
    label: "Gas estimation",
    left: "eth_estimateGas",
    right:
      "Fails with INVALID_NFT_ID for SaucerSwap mints. The site checks every precondition, then sends with fixed gas.",
  },
  {
    label: "Wrapped native",
    left: "Call the wrapper contract",
    right: "Never approve the WHBAR contract. Wrapping goes through SaucerSwap's WhbarHelper.",
  },
];

const Hedera = () => (
  <section aria-labelledby="hedera-title" className={`${WRAP} pt-28`}>
    <SectionHead id="hedera-title" title="Hedera's rules, already handled.">
      Code that works on other EVM chains breaks on Hedera in a few specific places. The template handles each one and
      the docs explain why. <span className="text-fg">You start from working code, not from error messages.</span>
    </SectionHead>
    <CompareTable
      left="On other EVM chains"
      leftSub="What you'd expect"
      right="On Hedera"
      rightSub="Handled in Tidepool"
      rows={HEDERA}
    />
    <div className="mt-6">
      <ArrowLink href="/docs/hedera-gotchas">All the Hedera details</ArrowLink>
    </div>
  </section>
);

/* ------------------------------------------------------------------ Template */

const INCLUDED: [string, string][] = [
  ["contracts/tidepool/", "The vault. No owner, no upgrades."],
  ["deploy/", "Deploy scripts that run initialize() as a dry run first"],
  ["scripts/", "Operator scripts: compound, rebalance, withdraw"],
  ["test/", "Unit tests on mocks, no network needed"],
  ["packages/nextjs/", "This site: dashboard, docs, contract debugger"],
  ["AGENTS.md", "A briefing so a coding agent can extend it"],
];

const Template = () => (
  <section id="template" aria-labelledby="template-title" className={`${WRAP} scroll-mt-24 pt-28`}>
    <SectionHead id="template-title" title="Build your own Hedera vault.">
      Fork the template, point <code className="font-mono text-[15px] text-fg">tidepool.config.ts</code> at your pool,
      and deploy. <span className="text-fg">Everything on this site comes with it.</span>
    </SectionHead>
    <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal step={1} className="min-w-0">
        <Command />
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={`group ${btn.primary}`}>
            View on GitHub
            <ArrowTopRightOnSquareIcon
              className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </a>
          <Link href="/docs/quickstart" className={`group ${btn.ghost}`}>
            Quickstart
            <ArrowRightIcon
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </div>
      </Reveal>
      <Reveal step={2}>
        <Mono className="text-faint">What you get</Mono>
        <ul className="m-0 mt-3 list-none divide-y divide-white/[0.06] border-y border-white/[0.06] p-0">
          {INCLUDED.map(([path, text]) => (
            <li
              key={path}
              className="group -mx-3 grid grid-cols-1 gap-1 rounded-lg px-3 py-3.5 transition-colors duration-200 hover:bg-white/[0.03] sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6"
            >
              <span className="font-mono text-[13px] text-neon transition-transform duration-200 group-hover:translate-x-1">
                {path}
              </span>
              <span className="text-[15px] text-muted transition-colors duration-200 group-hover:text-fg">{text}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  </section>
);

/** The landing page: the claim, the problem, the vault live, Hedera's services and rules, and the template. */
export const Landing = () => {
  const d = useLandingData();
  return (
    <div>
      <Hero />
      <Problem />
      <Live d={d} />
      <Services />
      <Hedera />
      <Template />
    </div>
  );
};
