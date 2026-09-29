"use client";

import { useEffect, useState } from "react";

type Key = "relay" | "vault" | "saucer" | "hts" | "rate" | "mirror";

type Service = {
  key: Key;
  name: string;
  tag: string;
  text: string;
  usedIn: string[];
  /** Position in the map, in percent of its box. */
  x: number;
  y: number;
};

const SERVICES: Service[] = [
  {
    key: "vault",
    name: "Smart Contract Service",
    tag: "EVM",
    text: "Runs the vault itself: plain Solidity on Hedera's EVM, with no owner and no upgrade path.",
    usedIn: ["every action"],
    x: 58,
    y: 24,
  },
  {
    key: "hts",
    name: "Token Service",
    tag: "HTS · 0x167",
    text: "The vault creates its share token, mints it on deposit and burns it on withdraw, and associates its own tokens.",
    usedIn: ["initialize", "deposit", "withdraw"],
    x: 44,
    y: 78,
  },
  {
    key: "rate",
    name: "Exchange Rate",
    tag: "0x168",
    text: "SaucerSwap charges its position fee in US cents. This precompile converts it to tinybars in the same call.",
    usedIn: ["compound", "rebalance"],
    x: 72,
    y: 78,
  },
  {
    key: "saucer",
    name: "SaucerSwap V2",
    tag: "On Hedera",
    text: "The pool, position manager and router: where the liquidity lives and where the vault swaps to the right ratio.",
    usedIn: ["compound", "rebalance", "withdraw"],
    x: 88,
    y: 24,
  },
  {
    key: "mirror",
    name: "Mirror Node",
    tag: "REST API",
    text: "The dashboard reads the vault's event history, and the reason behind any failed transaction, from its public API.",
    usedIn: ["activity feed", "error messages"],
    x: 16,
    y: 78,
  },
  {
    key: "relay",
    name: "JSON-RPC Relay",
    tag: "Hashio",
    text: "Wallets, this site and the deploy scripts reach Hedera through Hashio, the standard EVM JSON-RPC endpoint.",
    usedIn: ["every read", "every transaction"],
    x: 30,
    y: 24,
  },
];

const WALLET = { x: 6, y: 24 };
const at = (k: Key) => SERVICES.find(s => s.key === k)!;

/** Connections, and the services each one belongs to. */
const EDGES: { from: { x: number; y: number }; to: { x: number; y: number }; keys: Key[] }[] = [
  { from: WALLET, to: at("relay"), keys: ["relay"] },
  { from: at("relay"), to: at("vault"), keys: ["relay", "vault"] },
  { from: at("vault"), to: at("saucer"), keys: ["vault", "saucer"] },
  { from: at("vault"), to: at("hts"), keys: ["vault", "hts"] },
  { from: at("vault"), to: at("rate"), keys: ["vault", "rate"] },
  { from: at("vault"), to: at("mirror"), keys: ["vault", "mirror"] },
];

/** An elbow path: down (or across) from one node to another, drawn in the map's 100 x 100 space. */
const path = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.y === b.y ? `M ${a.x} ${a.y} H ${b.x}` : `M ${a.x} ${a.y} V ${(a.y + b.y) / 2} H ${b.x} V ${b.y}`;

/**
 * How Tidepool sits on Hedera: the services it uses, drawn as a map. Selecting one lights up its connections and
 * explains it. Cycles on its own until someone picks one; no cycling with reduced motion.
 */
export const ServicesMap = () => {
  const [active, setActive] = useState<Key>("vault");
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const order = SERVICES.map(s => s.key);
    const id = setInterval(() => setActive(k => order[(order.indexOf(k) + 1) % order.length]), 3800);
    return () => clearInterval(id);
  }, [held]);

  const pick = (k: Key) => {
    setHeld(true);
    setActive(k);
  };
  const current = at(active);

  return (
    <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* The map (from md up) */}
      <div className="relative hidden h-[400px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_58%_30%,rgba(46,230,200,0.06),transparent_60%)] md:block">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {EDGES.map((e, i) => {
            const on = e.keys.includes(active);
            return (
              <path
                key={i}
                d={path(e.from, e.to)}
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeWidth={on ? 1.6 : 1}
                stroke={on ? "#2EE6C8" : "rgba(255,255,255,0.14)"}
                strokeDasharray={on ? "5 6" : undefined}
                className={`transition-[stroke] duration-500 ${on ? "tp-flow" : ""}`}
              />
            );
          })}
        </svg>

        {/* The visitor, as the starting point */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-bg px-3 py-1.5 text-xs text-muted"
          style={{ left: `${WALLET.x}%`, top: `${WALLET.y}%` }}
        >
          Your wallet
        </div>

        {SERVICES.map(s => {
          const on = s.key === active;
          const linked = EDGES.some(e => e.keys.includes(active) && e.keys.includes(s.key));
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => pick(s.key)}
              onMouseEnter={() => pick(s.key)}
              aria-pressed={on}
              className={`absolute w-[170px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl border px-4 py-3 text-left transition-all duration-300 ${
                on
                  ? "scale-105 border-neon/60 bg-[#0c1a1d] shadow-[0_10px_40px_-12px_rgba(46,230,200,0.45)]"
                  : linked
                    ? "border-neon/25 bg-bg"
                    : "border-white/10 bg-bg hover:border-white/25"
              }`}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <div
                className={`font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${on ? "text-neon" : "text-faint"}`}
              >
                {s.tag}
              </div>
              <div className={`mt-1 text-sm font-semibold transition-colors ${on ? "text-fg" : "text-muted"}`}>
                {s.key === "vault" ? "Tidepool vault" : s.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Chips on phones, where the map would be too small */}
      <div className="flex flex-wrap gap-2 md:hidden">
        {SERVICES.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => pick(s.key)}
            aria-pressed={s.key === active}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
              s.key === active ? "border-neon/60 bg-neon/10 text-fg" : "border-white/10 text-muted"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* What the selected service does */}
      <div
        className="flex flex-col rounded-2xl border border-white/[0.08] bg-surface/60 p-7"
        aria-live="polite"
        key={current.key}
      >
        <div className="tp-in font-mono text-[11px] uppercase tracking-[0.14em] text-neon">{current.tag}</div>
        <h3 className="tp-in m-0 mt-3 text-[28px] font-bold leading-tight tracking-[-0.02em] text-fg">
          {current.name}
        </h3>
        <p className="tp-in mt-4 text-[16px] leading-relaxed text-muted" style={{ animationDelay: "80ms" }}>
          {current.text}
        </p>
        <div className="mt-auto pt-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Used in</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {current.usedIn.map(u => (
              <span key={u} className="rounded-md border border-white/10 px-2.5 py-1 text-sm text-fg">
                {u}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-6 flex gap-1.5" aria-hidden>
          {SERVICES.map(s => (
            <span
              key={s.key}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${s.key === active ? "bg-neon" : "bg-white/10"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
