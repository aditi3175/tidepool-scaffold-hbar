import { DebugContracts } from "./_components/DebugContracts";
import type { NextPage } from "next";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { Label, Tile } from "~~/components/pulse";
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
];

const Contracts: NextPage = () => (
  <div>
    <PageHero eyebrow="Contracts" title="Every function," accent="straight from the ABI." compact>
      Read and call <span className="font-mono text-fg">TidepoolVault</span> and{" "}
      <span className="font-mono text-fg">TidepoolVaultNarrow</span> directly, without the dashboard&apos;s checks.
    </PageHero>
    <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-4 px-5 sm:px-8 lg:px-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <div
        role="note"
        className="flex gap-3 rounded-2xl border border-amber/30 bg-amber/[0.05] p-5 text-[15px] leading-relaxed"
      >
        <ExclamationTriangleIcon className="mt-1 h-5 w-5 shrink-0 text-amber" aria-hidden />
        <p className="text-fg">
          Writes here send <strong>real Hedera Testnet transactions</strong> from your wallet. Use the dashboard for
          deposit, withdraw, compound and rebalance: it runs the same checks the contract does first.
        </p>
      </div>
      <Tile innerClassName="p-5">
        <Label>Worth reading</Label>
        <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-x-6 gap-y-2.5 p-0 text-sm sm:grid-cols-2">
          {WORTH_READING.map(item => (
            <li key={item.name}>
              <span className="font-mono text-neon">{item.name}</span>
              <span className="block text-muted">{item.text}</span>
            </li>
          ))}
          <li>
            <span className="font-mono text-neon">refreshApprovals</span>
            <span className="block text-muted">safe for anyone: only restores the vault&apos;s fixed allowances</span>
          </li>
        </ul>
      </Tile>
    </div>
    {/* .tp-debug maps the debugger package onto the site's palette; it wraps only the package. */}
    <div className="tp-debug">
      <DebugContracts />
    </div>
  </div>
);

export default Contracts;
