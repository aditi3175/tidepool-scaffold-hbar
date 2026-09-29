import React from "react";
import Link from "next/link";
import { GradientText } from "~~/components/pulse";
import { Logo } from "~~/components/pulse/Logo";
import { GITHUB_URL, HASHSCAN_URL } from "~~/utils/tidepool/constants";

const LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Home", href: "/" },
  { label: "Docs", href: "/docs" },
  { label: "GitHub", href: GITHUB_URL, external: true },
  { label: "HashScan", href: HASHSCAN_URL, external: true },
  { label: "SaucerSwap", href: "https://docs.saucerswap.finance", external: true },
];

/** Site footer: wordmark and tagline, links, the network, and the testnet disclaimer. */
export const Footer = () => (
  <footer className="mt-20 border-t border-neon/[0.08]">
    <div className="mx-auto flex max-w-[1480px] flex-col gap-8 px-5 py-10 sm:px-8 lg:px-12 md:flex-row md:items-center md:justify-between">
      <div>
        <Logo />
        <p className="mt-2 text-sm text-muted">
          Liquidity on <GradientText>autopilot.</GradientText>
        </p>
      </div>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-2 text-sm">
        {LINKS.map(link =>
          link.external ? (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="text-muted hover:text-fg">
              {link.label}
            </a>
          ) : (
            <Link key={link.href} href={link.href} className="text-muted hover:text-fg">
              {link.label}
            </Link>
          ),
        )}
      </nav>
      <span className="inline-flex items-center gap-2 text-sm text-muted">
        <span className="h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_#2EE6C8]" aria-hidden />
        Hedera Testnet
      </span>
    </div>
    <div className="border-t border-neon/[0.06]">
      <p className="mx-auto max-w-[1480px] px-5 py-4 text-xs text-faint sm:px-8 lg:px-12">
        Testnet reference code. Not audited. No yield implied. Built with Scaffold-HBAR.
      </p>
    </div>
  </footer>
);
