import { formatPrice, tickToPrice } from "~~/utils/tidepool/math";

type Props = {
  tickLower: number;
  tickUpper: number;
  spotTick: number;
  twapTick: number;
  decimals0: number;
  decimals1: number;
  quoteLabel: string;
};

const WIDTH = 640;
const HEIGHT = 140;

/** The position's tick range with the pool's spot and TWAP ticks, on a linear tick axis. */
export const RangeChart = ({ tickLower, tickUpper, spotTick, twapTick, decimals0, decimals1, quoteLabel }: Props) => {
  const width = tickUpper - tickLower;
  const min = Math.min(tickLower - width / 2, spotTick, twapTick);
  const max = Math.max(tickUpper + width / 2, spotTick, twapTick);
  const x = (tick: number) => ((tick - min) / (max - min)) * WIDTH;
  const price = (tick: number) => formatPrice(tickToPrice(tick, decimals0, decimals1));
  const inRange = twapTick >= tickLower && twapTick < tickUpper;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Position range and current price">
      <rect
        x={x(tickLower)}
        y={20}
        width={x(tickUpper) - x(tickLower)}
        height={80}
        rx={6}
        className={inRange ? "fill-success/30" : "fill-warning/30"}
      />
      <line x1={0} x2={WIDTH} y1={100} y2={100} className="stroke-base-content/30" />
      <line x1={x(twapTick)} x2={x(twapTick)} y1={12} y2={100} strokeDasharray="4 4" className="stroke-info" />
      <line x1={x(spotTick)} x2={x(spotTick)} y1={12} y2={100} strokeWidth={2} className="stroke-primary" />
      <text x={x(tickLower)} y={118} textAnchor="middle" className="fill-base-content text-[11px]">
        {price(tickLower)}
      </text>
      <text x={x(tickUpper)} y={118} textAnchor="middle" className="fill-base-content text-[11px]">
        {price(tickUpper)}
      </text>
      <text x={x(spotTick)} y={10} textAnchor="middle" className="fill-primary text-[11px]">
        spot {price(spotTick)}
      </text>
      <text x={WIDTH} y={136} textAnchor="end" className="fill-base-content/60 text-[10px]">
        {quoteLabel} · dashed line = TWAP
      </text>
    </svg>
  );
};
