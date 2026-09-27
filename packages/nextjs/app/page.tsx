import Link from "next/link";
import type { NextPage } from "next";
import { ArrowPathIcon, ArrowsRightLeftIcon, CircleStackIcon, KeyIcon } from "@heroicons/react/24/outline";
import { LandingGauge } from "~~/app/_components/site/LandingGauge";
import { CopyButton } from "~~/app/_components/tidepool/CopyButton";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";
import { SCAFFOLD_COMMAND } from "~~/utils/tidepool/constants";

export const metadata = getMetadata({
  title: "Tidepool",
  description:
    "A Scaffold-HBAR template for a vault that owns one SaucerSwap V2 position, compounds its fees, and re-centres when the price leaves the range.",
});

const FEATURES = [
  {
    Icon: KeyIcon,
    title: "Owns the position",
    text: "The vault contract holds the SaucerSwap V2 position NFT; depositors hold shares.",
  },
  {
    Icon: ArrowPathIcon,
    title: "Compounds fees",
    text: "Anyone can call compound to collect the swap fees and add them back to the position.",
  },
  {
    Icon: ArrowsRightLeftIcon,
    title: "Rebalances on the TWAP",
    text: "When the 10-minute average price leaves the range, anyone can re-centre it.",
  },
  {
    Icon: CircleStackIcon,
    title: "Issues an HTS share token",
    text: "Deposits mint a native Hedera token for your share; withdrawals burn it.",
  },
];

const HEDERA = [
  { name: "HTS share token", text: "Created, minted and burned by the vault through the Hedera Token Service" },
  { name: "SaucerSwap V2", text: "The concentrated-liquidity pool, position manager and swap router" },
  { name: "Exchange-rate system contract", text: "Converts SaucerSwap's position fee from US cents to HBAR on chain" },
  { name: "Mirror node", text: "The vault's event history for the dashboard" },
];

const Landing: NextPage = () => (
  <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 pt-12 sm:px-6 sm:pt-16">
    <section className="flex flex-col gap-8">
      <div className="max-w-3xl">
        <h1 className="m-0 text-balance text-title font-semibold tracking-tight text-fg sm:text-display">
          Concentrated liquidity that looks after itself
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Tidepool is a Scaffold-HBAR template for a vault that owns one SaucerSwap V2 position, compounds its fees, and
          re-centres when the price leaves the range.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn btn-primary h-10 min-h-10 rounded-lg px-4 text-sm font-medium">
            Open dashboard
          </Link>
          <Link
            href="/docs"
            className="btn h-10 min-h-10 rounded-lg border-line bg-transparent px-4 text-sm font-medium text-fg hover:border-muted hover:bg-raised"
          >
            Read the docs
          </Link>
        </div>
      </div>
      <LandingGauge />
    </section>

    <section aria-labelledby="features">
      <h2 id="features" className="sr-only">
        What the vault does
      </h2>
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ Icon, title, text }) => (
          <li key={title} className="rounded-lg border border-line bg-surface p-4">
            <Icon className="h-5 w-5 text-teal" aria-hidden />
            <h3 className="m-0 mt-3 text-sm font-semibold text-fg">{title}</h3>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>
    </section>

    <section className="grid grid-cols-1 gap-8 lg:grid-cols-2" aria-label="Get started">
      <div>
        <h2 className="m-0 text-xl font-semibold text-fg">Start from the template</h2>
        <p className="mt-2 text-sm text-muted">
          Scaffolds the contracts, deploy scripts, tests and this site. The dashboard already points at the testnet
          vault.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface p-2 pl-4">
          {/* Shown on two lines (break before --template); the copy button copies the one-line command. */}
          <code className="tp-num min-w-0 flex-1 whitespace-pre-wrap break-all py-1.5 text-sm text-fg">
            {SCAFFOLD_COMMAND.replace(" --template", "\n  --template")}
          </code>
          <CopyButton text={SCAFFOLD_COMMAND} />
        </div>
      </div>
      <div>
        <h2 className="m-0 text-xl font-semibold text-fg">Built on Hedera</h2>
        <dl className="m-0 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HEDERA.map(item => (
            <div key={item.name}>
              <dt className="text-sm font-medium text-fg">{item.name}</dt>
              <dd className="m-0 mt-1 text-sm text-muted">{item.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  </div>
);

export default Landing;
