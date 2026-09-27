import { DebugContracts } from "./_components/DebugContracts";
import type { NextPage } from "next";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Debug Contracts",
  description: "Raw ABI-level access to the Tidepool vault contracts on Hedera Testnet.",
});

const Debug: NextPage = () => {
  return (
    <div className="tp-debug">
      <header className="tp-scope mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-base-content sm:text-3xl">Contracts</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-base-content/55">
          Raw ABI-level access to <span className="tp-num text-base-content/75">TidepoolVault</span> and{" "}
          <span className="tp-num text-base-content/75">TidepoolVaultNarrow</span>: read every view function and call
          any write function directly, without the Dashboard&apos;s checks.
        </p>
        <div
          role="note"
          className="flex max-w-2xl gap-3 rounded-xl border border-warning/15 bg-warning/[0.04] px-4 py-3 text-sm leading-relaxed"
        >
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning/80" aria-hidden />
          <p className="text-base-content/70">
            <span className="font-medium text-warning/90">Developer tool.</span> Writes here send real Hedera Testnet
            transactions. Use the Dashboard for Compound and Rebalance.
          </p>
        </div>
      </header>
      <DebugContracts />
    </div>
  );
};

export default Debug;
