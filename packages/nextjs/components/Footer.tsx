import React from "react";
import { TidepoolMark } from "~~/components/TidepoolMark";
import { FAUCET_URL, GITHUB_URL, HASHSCAN_URL } from "~~/utils/tidepool/constants";

const links = [
  { label: "GitHub", href: GITHUB_URL },
  { label: "HashScan", href: HASHSCAN_URL },
  { label: "SaucerSwap docs", href: "https://docs.saucerswap.finance" },
  { label: "Hedera faucet", href: FAUCET_URL },
];

/** Site footer: identity, external links and the testnet disclaimer. */
export const Footer = () => (
  <footer className="mt-16 border-t border-line">
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-2">
        <TidepoolMark className="h-5 w-5" />
        <span className="font-medium text-fg">Tidepool</span>
        <span className="text-muted">Testnet reference code, not audited.</span>
      </div>
      <nav className="flex flex-wrap gap-x-6 gap-y-2 text-muted" aria-label="External links">
        {links.map(link => (
          <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="hover:text-fg">
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  </footer>
);
