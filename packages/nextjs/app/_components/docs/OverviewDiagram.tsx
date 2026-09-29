import type { ReactNode } from "react";

/**
 * The Introduction's big picture: who uses the vault, what the vault does, and where the liquidity lives. The call
 * level detail is on the Architecture page (ArchitectureDiagram).
 */

const Mono = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${className}`}>{children}</span>
);

const Card = ({
  kicker,
  title,
  lines,
  strong = false,
  className = "",
}: {
  kicker: string;
  title: string;
  lines: ReactNode[];
  strong?: boolean;
  className?: string;
}) => (
  <div
    className={`flex flex-col justify-center rounded-xl border p-5 ${strong ? "border-neon/45 bg-neon/[0.05]" : "border-white/10 bg-bg"} ${className}`}
  >
    <Mono className="text-faint">{kicker}</Mono>
    <div className={`mt-1.5 text-lg font-bold ${strong ? "text-neon" : "text-fg"}`}>{title}</div>
    <ul className="m-0 mt-3 list-none space-y-1.5 p-0 text-[14px] leading-snug text-muted">
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  </div>
);

/** An arrow with a label; `both` draws a two-way link. Horizontal from md up, vertical on phones. */
const Arrow = ({ label, both = false }: { label: string; both?: boolean }) => (
  <div className="flex flex-col items-center justify-center gap-1.5 py-1 md:px-2 md:py-0">
    <Mono className="text-balance text-center leading-5 text-muted">{label}</Mono>
    <div className="hidden w-full items-center md:flex" aria-hidden>
      {both && <span className="h-0 w-0 border-y-[5px] border-r-[7px] border-y-transparent border-r-neon/70" />}
      <span className="h-px flex-1 bg-neon/50" />
      <span className="h-0 w-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-neon/70" />
    </div>
    <span className="text-neon/70 md:hidden" aria-hidden>
      {both ? "↕" : "↓"}
    </span>
  </div>
);

const code = (t: string) => <code className="whitespace-nowrap font-mono text-[12.5px] text-fg">{t}</code>;

export const OverviewDiagram = () => (
  <figure className="my-8" aria-label="Who uses the vault, what it does, and where the liquidity lives">
    <div className="rounded-2xl border border-white/[0.08] bg-surface/40 p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_128px_minmax(0,1.15fr)_128px_minmax(0,1fr)] md:grid-rows-2 md:gap-x-0 md:gap-y-4">
        {/* Row 1: depositors */}
        <Card
          className="md:col-start-1 md:row-start-1"
          kicker="Depositors"
          title="You"
          lines={["Deposit WHBAR and SAUCE", "Hold HTS shares", "Withdraw at any time"]}
        />
        <div className="md:col-start-2 md:row-start-1 md:flex md:items-center">
          <Arrow label="tokens ⇄ shares" both />
        </div>

        {/* Row 2: keepers */}
        <Card
          kicker="Keepers"
          title="Anyone"
          className="md:col-start-1 md:row-start-2"
          lines={[
            <>
              Calls {code("compound()")} and {code("rebalance()")}
            </>,
            "Pays gas and SaucerSwap's fee",
          ]}
        />
        <div className="md:col-start-2 md:row-start-2 md:flex md:items-center">
          <Arrow label="compound · rebalance" />
        </div>
        {/* The vault spans both rows */}
        <Card
          kicker="On Hedera"
          title="TidepoolVault"
          strong
          className="md:col-start-3 md:row-span-2 md:row-start-1"
          lines={[
            "Owns the position and the idle tokens",
            "Mints and burns the share token",
            "Checks the TWAP guard before acting",
            "No owner, no upgrades",
          ]}
        />
        <div className="md:col-start-4 md:row-span-2 md:row-start-1 md:flex md:items-center">
          <Arrow label="add · remove · collect" />
        </div>
        <Card
          kicker="SaucerSwap V2"
          title="One position"
          className="md:col-start-5 md:row-span-2 md:row-start-1"
          lines={["WHBAR / SAUCE, 0.30% pool", "A range of ±600 ticks", "Earns swap fees while in range"]}
        />
      </div>
    </div>
  </figure>
);
