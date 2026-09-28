"use client";

import { useId, useState } from "react";
import { Label, Tile } from "~~/components/pulse";
import { FlowChart } from "~~/components/pulse/FlowChart";
import { formatPrice, tickToPrice } from "~~/utils/tidepool/math";

// Illustrations use the main vault's pair and settings: WHBAR (8 decimals) / SAUCE (6 decimals), a ±600-tick range,
// and a 50-tick limit between spot and the 10-minute TWAP.
const toPrice = (tick: number) => tickToPrice(tick, 8, 6);
const price = (tick: number) => formatPrice(toPrice(tick));
const LOWER = -8340;
const UPPER = -7140;
const START = -7700;
const MAX_DEVIATION = 50;
const DOMAIN = { min: -9000, max: -6480 };
const UNIT = "SAUCE per WHBAR";

export type Illustration = "in-range" | "out-of-range" | "twap-guard" | "rebalance";

const SCENES: Record<
  Illustration,
  { lower: number; upper: number; spot: number; twap: number; previous?: { lower: number; upper: number } }
> = {
  "in-range": { lower: LOWER, upper: UPPER, spot: START, twap: START },
  "out-of-range": { lower: LOWER, upper: UPPER, spot: -6900, twap: -6900 },
  "twap-guard": { lower: LOWER, upper: UPPER, spot: -7300, twap: START },
  rebalance: { lower: -7500, upper: -6300, spot: -6900, twap: -6900, previous: { lower: LOWER, upper: UPPER } },
};

const LEGEND: Record<Illustration, string> = {
  "in-range": "Swaps inside the band pay the position a fee",
  "out-of-range": "Price above the range: no fees",
  "twap-guard": "Spot (white) jumped; the TWAP (dashed) has not",
  rebalance: "New range centred on the TWAP; the old one dotted",
};

/** The chart drawn next to each chapter of How it works. The flowing swaps are illustrative. */
export const IllustrationGauge = ({ kind }: { kind: Illustration }) => {
  const s = SCENES[kind];
  const inRange = s.twap >= s.lower && s.twap < s.upper;
  return (
    <Tile innerClassName="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <Label>WHBAR / SAUCE · illustration</Label>
        <span className={`font-mono text-[11px] uppercase ${inRange ? "text-neon" : "text-amber"}`}>
          {inRange ? "in range" : "out of range"}
        </span>
      </div>
      <FlowChart
        className="mt-3 h-[220px]"
        lower={toPrice(s.lower)}
        upper={toPrice(s.upper)}
        spot={toPrice(s.spot)}
        twap={toPrice(s.twap)}
        inRange={inRange}
        previous={s.previous ? { lower: toPrice(s.previous.lower), upper: toPrice(s.previous.upper) } : undefined}
        label={`${LEGEND[kind]}. Range ${price(s.lower)} to ${price(s.upper)} ${UNIT}, spot ${price(s.spot)}, TWAP ${price(s.twap)}.`}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted">
        <span>LOW {price(s.lower)}</span>
        <span className="text-faint">{LEGEND[kind]}</span>
        <span>HIGH {price(s.upper)}</span>
      </div>
    </Tile>
  );
};

type Verdict = { action: string; ok: boolean; why: string };

/** A range you can move: the verdicts apply the same checks the contract makes. */
export const InteractiveGauge = () => {
  const sliderId = useId();
  const [spot, setSpot] = useState(START);
  const [sudden, setSudden] = useState(false);
  const twap = sudden ? START : spot;
  const apart = Math.abs(spot - twap);
  const paused = apart > MAX_DEVIATION;
  const inRange = twap >= LOWER && twap < UPPER;

  // Same order as the contract: the TWAP guard first, then the range rule of each function.
  const verdicts: Verdict[] = [
    {
      action: "Deposit",
      ok: !paused,
      why: paused ? `Spot is ${apart} ticks from the TWAP (limit ${MAX_DEVIATION})` : "Only the TWAP guard applies",
    },
    {
      action: "Compound",
      ok: !paused && inRange,
      why: paused
        ? "Refused by the TWAP guard"
        : inRange
          ? "The TWAP is inside the range"
          : "The TWAP is outside the range",
    },
    {
      action: "Rebalance",
      ok: !paused && !inRange,
      why: paused
        ? "Refused by the TWAP guard"
        : inRange
          ? "Refused while the TWAP is inside the range"
          : "Allowed once the cooldown has passed",
    },
    { action: "Withdraw", ok: true, why: "Never blocked" },
  ];
  const headline = paused ? "Paused by the TWAP guard" : inRange ? "In range, earning fees" : "Out of range";

  return (
    <Tile innerClassName="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${paused || !inRange ? "bg-amber" : "bg-neon shadow-[0_0_10px_#00F5A0]"}`}
            aria-hidden
          />
          <span className="text-lg font-bold text-fg" role="status" aria-live="polite">
            {headline}
          </span>
        </div>
        <span className="font-mono text-sm tabular-nums text-muted">
          spot {price(spot)} · TWAP {price(twap)} · {apart} ticks apart
        </span>
      </div>

      <FlowChart
        className="mt-6 h-[260px]"
        lower={toPrice(LOWER)}
        upper={toPrice(UPPER)}
        spot={toPrice(spot)}
        twap={toPrice(twap)}
        inRange={inRange}
        label={`Range ${price(LOWER)} to ${price(UPPER)} ${UNIT}; spot ${price(spot)}; TWAP ${price(twap)}`}
      />

      <div className="mt-6">
        <label htmlFor={sliderId} className="flex items-baseline justify-between text-sm text-fg">
          <span className="font-semibold">Drag the pool price</span>
          <span className="font-mono text-muted">
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
          aria-valuetext={`${price(spot)} ${UNIT}`}
          onChange={event => setSpot(Number(event.target.value))}
          className="mt-3 h-2 w-full cursor-pointer accent-neon"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-muted">
          <span className="relative inline-flex">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={sudden}
              onChange={event => setSudden(event.target.checked)}
            />
            <span className="h-5 w-9 rounded-full bg-white/10 transition-colors peer-checked:bg-neon/40 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-neon" />
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </span>
          Sudden move: the TWAP has not caught up
        </label>
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-sm text-muted hover:border-white/30 hover:text-fg"
          onClick={() => {
            setSpot(START);
            setSudden(false);
          }}
        >
          Reset
        </button>
      </div>

      <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {verdicts.map(v => (
          <li
            key={v.action}
            className={`rounded-xl border p-4 ${v.ok ? "border-neon/25 bg-neon/[0.04]" : "border-white/[0.08] bg-white/[0.02]"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-fg">{v.action}</span>
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] ${
                  v.ok ? "bg-neon/10 text-neon" : "bg-amber/10 text-amber"
                }`}
              >
                {v.ok ? "Allowed" : "Refused"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">{v.why}</p>
          </li>
        ))}
      </ul>
    </Tile>
  );
};
