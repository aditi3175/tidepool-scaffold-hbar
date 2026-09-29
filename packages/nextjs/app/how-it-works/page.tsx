import Link from "next/link";
import type { NextPage } from "next";
import { type Illustration, IllustrationGauge, InteractiveGauge } from "~~/app/_components/site/HowItWorksGauges";
import { Eyebrow, GradientText, Tile, btn } from "~~/components/pulse";
import { PageHero } from "~~/components/pulse/PageHero";
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
  <div>
    <PageHero eyebrow="How it works" title="How the vault" accent="decides.">
      A few rules decide when the vault may act. Each is checked on chain, so anyone can press the buttons and nobody
      can steer it.
    </PageHero>

    <div className="mx-auto flex max-w-[1480px] flex-col gap-20 px-4 pb-8 sm:px-6">
      {SECTIONS.map((section, i) => (
        <section
          key={section.id}
          aria-labelledby={section.id}
          className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
        >
          <div>
            <span className="font-mono text-sm text-faint">0{i + 1}</span>
            <h2 id={section.id} className="m-0 mt-3 text-[28px] font-bold leading-tight tracking-[-0.02em] text-fg">
              {section.title}
            </h2>
            {section.text.map(paragraph => (
              <p key={paragraph} className="mt-4 text-[16px] leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </div>
          <IllustrationGauge kind={section.id} />
        </section>
      ))}
    </div>

    <section aria-labelledby="try-it" className="mx-auto max-w-[1480px] px-4 py-24 sm:px-6">
      <Eyebrow>Try it</Eyebrow>
      <h2
        id="try-it"
        className="m-0 mt-4 text-[clamp(32px,3.6vw,48px)] font-bold leading-[1.05] tracking-[-0.03em] text-fg"
      >
        Move the price. <GradientText>Watch the rules.</GradientText>
      </h2>
      <p className="mt-4 max-w-2xl text-[16px] text-muted">
        Drag the price and see which actions the vault would accept. Nothing is sent; this runs in your browser.
      </p>
      <div className="mt-10">
        <InteractiveGauge />
      </div>
    </section>

    <section aria-labelledby="as-a-user" className="mx-auto max-w-[1480px] px-4 pb-8 sm:px-6">
      <Eyebrow>As a user</Eyebrow>
      <h2
        id="as-a-user"
        className="m-0 mt-4 text-[clamp(32px,3.6vw,48px)] font-bold leading-[1.05] tracking-[-0.03em] text-fg"
      >
        Five steps, <GradientText>then it runs itself.</GradientText>
      </h2>
      <ol className="m-0 mt-10 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <Tile as="li" key={step.title} innerClassName="p-5">
            <span className="font-mono text-sm text-neon">0{i + 1}</span>
            <h3 className="m-0 mt-4 text-lg font-bold text-fg">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
          </Tile>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/dashboard" className={btn.primary}>
          Open the dashboard
        </Link>
        <Link href="/docs/using-the-vault" className={btn.ghost}>
          Read the guide
        </Link>
      </div>
    </section>
  </div>
);

export default HowItWorks;
