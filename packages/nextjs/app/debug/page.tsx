import type { CSSProperties } from "react";
import { DebugContracts } from "./_components/DebugContracts";
import type { NextPage } from "next";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { PageHero } from "~~/components/pulse/PageHero";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Contracts · Tidepool",
  description: "Read and call every function of the Tidepool vault contracts on Hedera Testnet.",
});

const WORTH_READING = [
  { name: "getPriceState", text: "spot tick, TWAP tick, and whether the TWAP is inside the range" },
  { name: "getTotalAmounts", text: "the tokens the vault controls: the position at spot plus idle balances" },
  { name: "approvalCap0 / approvalCap1", text: "the standing allowance caps granted to SaucerSwap" },
  { name: "positionSerial", text: "the LP NFT serial of the current position (0 before the first compound)" },
  { name: "refreshApprovals", text: "safe for anyone: only restores the vault's fixed allowances" },
];

const Contracts: NextPage = () => (
  <div>
    <PageHero
      eyebrow="Contracts"
      title="Every function,"
      accent="straight from the ABI."
      compact
      aside={
        <div
          role="note"
          className="flex gap-3 rounded-2xl border border-amber/30 bg-amber/[0.05] p-5 text-[15px] leading-relaxed"
        >
          <ExclamationTriangleIcon className="mt-1 h-5 w-5 shrink-0 text-amber" aria-hidden />
          <p className="m-0 text-fg">
            Writes here send <strong>real Hedera Testnet transactions</strong> from your wallet. Use the dashboard for
            deposit, withdraw, compound and rebalance: it runs the same checks the contract does first.
          </p>
        </div>
      }
    >
      Read and call <span className="font-mono text-fg">TidepoolVault</span> and{" "}
      <span className="font-mono text-fg">TidepoolVaultNarrow</span> directly, without the dashboard&apos;s checks.
    </PageHero>
    {/* The read functions worth knowing, in the same cells as the Docs introduction. */}
    <section
      className="tp-in mx-auto w-full max-w-[1480px] px-5 sm:px-8 lg:px-12"
      style={{ "--d": 560 } as CSSProperties}
      aria-labelledby="worth-reading"
    >
      <h2 id="worth-reading" className="m-0 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-faint">
        Worth reading
      </h2>
      <dl className="m-0 mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-5">
        {WORTH_READING.map((item, i) => (
          <div
            key={item.name}
            className={`bg-bg p-5 transition-colors duration-300 hover:bg-surface ${
              i === WORTH_READING.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
            }`}
          >
            <dt className="font-mono text-[12px] text-neon [overflow-wrap:anywhere]">{item.name}</dt>
            <dd className="m-0 mt-2 text-sm leading-relaxed text-muted">{item.text}</dd>
          </div>
        ))}
      </dl>
    </section>
    {/* .tp-debug maps the debugger package onto the site's palette; it wraps only the package. */}
    <div className="tp-debug">
      <DebugContracts />
    </div>
  </div>
);

export default Contracts;
