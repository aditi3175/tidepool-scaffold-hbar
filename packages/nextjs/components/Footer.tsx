import React from "react";
import { HederaPortalFaucet } from "@scaffold-hbar-ui/components";
import { hedera } from "viem/chains";
import { TidepoolMark } from "~~/components/TidepoolMark";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar/useTargetNetwork";

const links = [
  { label: "HashScan", href: "https://hashscan.io/testnet" },
  { label: "SaucerSwap docs", href: "https://docs.saucerswap.finance" },
  { label: "Hedera docs", href: "https://docs.hedera.com/" },
  { label: "Built with Scaffold-HBAR", href: "https://github.com/hedera-dev/scaffold-hbar" },
];

/**
 * Site footer: Tidepool identity, the testnet disclaimer, and developer links (including the Scaffold-HBAR credit).
 */
export const Footer = () => {
  const { targetNetwork } = useTargetNetwork();
  const isTestnet = targetNetwork.id !== hedera.id;

  return (
    <footer className="mt-16 border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <TidepoolMark className="mt-0.5 h-6 w-6 shrink-0 opacity-80" />
          <div>
            <div className="font-medium">Tidepool</div>
            <div className="text-xs text-base-content/45">
              SaucerSwap V2 liquidity vault template for Hedera. Testnet reference code, not audited.
            </div>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-base-content/55">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-base-content"
            >
              {link.label}
            </a>
          ))}
          {isTestnet && (
            <HederaPortalFaucet
              variant="link"
              showIcon
              className="inline-flex items-center gap-1.5 no-underline transition-colors hover:text-base-content"
            />
          )}
        </nav>
      </div>
    </footer>
  );
};
