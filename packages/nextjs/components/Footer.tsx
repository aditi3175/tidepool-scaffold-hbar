import React from "react";
import Link from "next/link";
import { GradientText, PulseMark } from "~~/components/pulse";
import { FAUCET_URL, GITHUB_URL, HASHSCAN_URL } from "~~/utils/tidepool/constants";

const SITE = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Docs", href: "/docs" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Contracts", href: "/debug" },
];

const EXTERNAL = [
  { label: "GitHub", href: GITHUB_URL },
  { label: "HashScan", href: HASHSCAN_URL },
  { label: "SaucerSwap docs", href: "https://docs.saucerswap.finance" },
  { label: "Hedera faucet", href: FAUCET_URL },
];

/** Site footer: identity, site and external links, and the testnet disclaimer. */
export const Footer = () => (
  <footer className="mt-24 border-t border-white/[0.06]">
    <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-20">
      <div>
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Tidepool home">
          <PulseMark />
          <span className="text-lg font-bold tracking-tight text-fg">tidepool</span>
        </Link>
        <p className="mt-4 max-w-xs text-2xl font-bold leading-tight tracking-[-0.02em] text-fg">
          Liquidity on <GradientText>autopilot.</GradientText>
        </p>
      </div>
      <nav aria-label="Site">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Site</div>
        <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0 text-sm">
          {SITE.map(item => (
            <li key={item.href}>
              <Link href={item.href} className="text-muted hover:text-fg">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label="External links">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Elsewhere</div>
        <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0 text-sm">
          {EXTERNAL.map(item => (
            <li key={item.href}>
              <a href={item.href} target="_blank" rel="noreferrer" className="text-muted hover:text-fg">
                {item.label} <span aria-hidden>↗</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
    <div className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-2 px-4 py-5 font-mono text-[11px] uppercase tracking-[0.12em] text-faint sm:px-6">
        <span>Testnet reference code · Not audited · No yield implied</span>
        <span>Built with Scaffold-HBAR</span>
      </div>
    </div>
  </footer>
);
