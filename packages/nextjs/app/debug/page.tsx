import { DebugContracts } from "./_components/DebugContracts";
import type { NextPage } from "next";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
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
  <div className="tp-debug">
    <header className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 pt-10 sm:px-6">
      <h1 className="m-0 text-title font-semibold tracking-tight text-fg">Contracts</h1>
      <p className="max-w-2xl text-sm text-muted">
        Every function of <span className="tp-num text-fg">TidepoolVault</span> and{" "}
        <span className="tp-num text-fg">TidepoolVaultNarrow</span>, straight from the ABI, without the dashboard&apos;s
        checks.
      </p>
      <div role="note" className="flex max-w-2xl gap-3 rounded-lg border border-amber/40 bg-surface px-4 py-3 text-sm">
        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
        <p className="text-fg">
          Writes here send real Hedera Testnet transactions from your wallet. Use the dashboard for deposit, withdraw,
          compound and rebalance.
        </p>
      </div>
      <div className="max-w-2xl text-sm">
        <h2 className="m-0 text-sm font-semibold text-fg">Worth reading</h2>
        <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-muted">
          {WORTH_READING.map(item => (
            <li key={item.name}>
              <span className="tp-num text-fg">{item.name}</span>: {item.text}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-muted">
          <span className="tp-num text-fg">refreshApprovals</span> is safe for anyone to call: it only restores the
          vault&apos;s fixed allowances to SaucerSwap.
        </p>
      </div>
    </header>
    <DebugContracts />
  </div>
);

export default Contracts;
