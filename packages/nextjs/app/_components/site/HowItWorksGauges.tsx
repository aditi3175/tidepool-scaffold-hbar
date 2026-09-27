"use client";

import { useId, useState } from "react";
import { Gauge } from "~~/app/_components/tidepool/Gauge";
import { formatPrice, tickToPrice } from "~~/utils/tidepool/math";

// Illustrations use the main vault's pair and settings: WHBAR (8 decimals) / SAUCE (6 decimals), a ±600-tick range,
// and a 50-tick limit between spot and the 10-minute TWAP.
const price = (tick: number) => formatPrice(tickToPrice(tick, 8, 6));
const LOWER = -8340;
const UPPER = -7140;
const START = -7700;
const MAX_DEVIATION = 50;
const DOMAIN = { min: -9000, max: -6480 };

export type Illustration = "in-range" | "out-of-range" | "twap-guard" | "rebalance";

/** The static gauge drawn next to each section of How it works. */
export const IllustrationGauge = ({ kind }: { kind: Illustration }) => {
  switch (kind) {
    case "in-range":
      return <Gauge lower={LOWER} upper={UPPER} spot={START} twap={START} price={price} domain={DOMAIN} size="md" />;
    case "out-of-range":
      return <Gauge lower={LOWER} upper={UPPER} spot={-6900} twap={-6900} price={price} domain={DOMAIN} size="md" />;
    case "twap-guard":
      return <Gauge lower={LOWER} upper={UPPER} spot={-7300} twap={START} price={price} domain={DOMAIN} size="md" />;
    case "rebalance":
      return (
        <Gauge
          lower={-7500}
          upper={-6300}
          spot={-6900}
          twap={-6900}
          ghost={{ lower: LOWER, upper: UPPER }}
          price={price}
          domain={{ min: -9000, max: -6000 }}
          size="md"
        />
      );
  }
};

/** A gauge you can move: the status line applies the same rules the contract checks. */
export const InteractiveGauge = () => {
  const sliderId = useId();
  const [spot, setSpot] = useState(START);
  const [sudden, setSudden] = useState(false);
  const twap = sudden ? START : spot;
  const apart = Math.abs(spot - twap);
  const inRange = twap >= LOWER && twap < UPPER;

  const status =
    apart > MAX_DEVIATION
      ? {
          tone: "text-amber",
          text: `Paused: spot is ${apart} ticks from the TWAP (limit ${MAX_DEVIATION}). Deposit, Compound and Rebalance are refused. Withdraw still works.`,
        }
      : inRange
        ? {
            tone: "text-teal",
            text: "In range: Compound is allowed. Rebalance is refused while the TWAP is inside the range.",
          }
        : {
            tone: "text-amber",
            text: "Out of range: Rebalance is allowed once the cooldown has passed. Compound is refused until the range is re-centred.",
          };

  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-6">
      <Gauge lower={LOWER} upper={UPPER} spot={spot} twap={twap} price={price} domain={DOMAIN} />
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={sliderId} className="flex items-baseline justify-between text-sm text-fg">
            Pool price
            <span className="tp-num text-muted">
              {price(spot)} · tick {spot}
            </span>
          </label>
          <input
            id={sliderId}
            type="range"
            min={DOMAIN.min + 40}
            max={DOMAIN.max - 40}
            step={10}
            value={spot}
            aria-valuetext={`${price(spot)} SAUCE per WHBAR`}
            onChange={event => setSpot(Number(event.target.value))}
            className="range range-primary range-xs w-full"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="checkbox checkbox-xs rounded border-line"
              checked={sudden}
              onChange={event => setSudden(event.target.checked)}
            />
            Sudden move: the TWAP has not caught up
          </label>
          <button
            type="button"
            className="rounded-lg border border-line px-3 py-1 text-sm text-muted hover:text-fg"
            onClick={() => {
              setSpot(START);
              setSudden(false);
            }}
          >
            Reset
          </button>
        </div>
        <p className={`m-0 text-sm ${status.tone}`} role="status" aria-live="polite">
          {status.text}
        </p>
      </div>
    </div>
  );
};
