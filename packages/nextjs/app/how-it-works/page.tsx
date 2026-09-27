import Link from "next/link";
import type { NextPage } from "next";
import { type Illustration, IllustrationGauge, InteractiveGauge } from "~~/app/_components/site/HowItWorksGauges";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "How it works · Tidepool",
  description: "How the Tidepool vault keeps a SaucerSwap V2 position in range, and what you do as a user.",
});

const SECTIONS: { id: Illustration; title: string; text: string[] }[] = [
  {
    id: "in-range",
    title: "A position only earns inside its range",
    text: [
      "A SaucerSwap V2 position provides liquidity between two prices. Trades inside that range pay the position a fee; outside it, the liquidity sits unused.",
      "The vault holds one such position, centred on the pool's price, and depositors own it through shares.",
    ],
  },
  {
    id: "out-of-range",
    title: "Prices move out of range",
    text: [
      "When the price leaves the range, the position holds only one of the two tokens and stops earning fees.",
      "Someone has to move the range. Tidepool lets anyone do it, under the rules below.",
    ],
  },
  {
    id: "twap-guard",
    title: "The TWAP guard",
    text: [
      "The vault compares the live price with the pool's 10-minute time-weighted average (the TWAP). When they are more than 50 ticks apart, it refuses deposits, compounds and rebalances.",
      "A trade that pushes the price for a moment cannot steer the vault, which is what makes it safe to let anyone call it. Withdrawals are never blocked.",
    ],
  },
  {
    id: "rebalance",
    title: "Rebalance opens a new centred position",
    text: [
      "Once the TWAP has left the range and the cooldown has passed, anyone can call rebalance.",
      "The vault withdraws everything, swaps to the right ratio and opens a new position of the same width, centred on the TWAP. The old position NFT stays in the vault, empty.",
    ],
  },
];

const STEPS = [
  { title: "Associate", text: "Associate WHBAR, SAUCE and the share token with your account, one transaction each." },
  { title: "Wrap HBAR", text: "Turn HBAR into WHBAR with the dashboard's Wrap button." },
  { title: "Get SAUCE", text: "Swap for SAUCE on SaucerSwap's testnet site." },
  { title: "Deposit", text: "Add both tokens in the vault's ratio and receive shares." },
  { title: "Withdraw anytime", text: "Burn shares for your slice of the vault. The TWAP guard never blocks this." },
];

const HowItWorks: NextPage = () => (
  <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 pt-12 sm:px-6 sm:pt-16">
    <header className="max-w-2xl">
      <h1 className="m-0 text-title font-semibold tracking-tight text-fg">How it works</h1>
      <p className="mt-3 text-base text-muted">
        One vault, one SaucerSwap V2 position, and a few rules that decide when it may act.
      </p>
    </header>

    {SECTIONS.map(section => (
      <section
        key={section.id}
        aria-labelledby={section.id}
        className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12"
      >
        <div>
          <h2 id={section.id} className="m-0 text-xl font-semibold text-fg">
            {section.title}
          </h2>
          {section.text.map(paragraph => (
            <p key={paragraph} className="mt-3 text-sm text-muted">
              {paragraph}
            </p>
          ))}
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <IllustrationGauge kind={section.id} />
        </div>
      </section>
    ))}

    <section aria-labelledby="try-it" className="flex flex-col gap-4">
      <div className="max-w-2xl">
        <h2 id="try-it" className="m-0 text-xl font-semibold text-fg">
          Move the price
        </h2>
        <p className="mt-2 text-sm text-muted">
          Drag the price and see which action the vault would accept. Nothing is sent; this runs in your browser.
        </p>
      </div>
      <InteractiveGauge />
    </section>

    <section aria-labelledby="as-a-user" className="flex flex-col gap-4">
      <h2 id="as-a-user" className="m-0 text-xl font-semibold text-fg">
        What you do as a user
      </h2>
      <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-baseline gap-2">
              <span className="tp-num text-xs text-teal">{i + 1}</span>
              <h3 className="m-0 text-sm font-semibold text-fg">{step.title}</h3>
            </div>
            <p className="mt-1 text-sm text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
      <div>
        <Link href="/dashboard" className="btn btn-primary h-10 min-h-10 rounded-lg px-4 text-sm font-medium">
          Open dashboard
        </Link>
      </div>
    </section>
  </div>
);

export default HowItWorks;
