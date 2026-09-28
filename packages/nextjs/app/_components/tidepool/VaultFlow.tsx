import { Skeleton } from "~~/app/_components/tidepool/ui";
import { FlowChart } from "~~/components/pulse/FlowChart";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { formatPriceSig } from "~~/utils/tidepool/format";
import { tickToPrice } from "~~/utils/tidepool/math";

/**
 * The vault's live range as the flow chart (the flowing swaps are illustrative), with a real message for every state
 * that has no range to draw. Same states as the older LiveGauge.
 */
export const VaultFlow = ({ vault, height = "h-[240px]" }: { vault: VaultState; height?: string }) => {
  const { decimals0, decimals1, symbol0, symbol1, tickLower, tickUpper, spotTick, twapTick } = vault;

  const message = (text: string) => (
    <div
      className={`flex ${height} items-center justify-center rounded-xl border border-dashed border-white/10 px-4 text-center text-sm text-muted`}
    >
      {text}
    </div>
  );

  if (vault.isLoading || (!vault.notFound && (decimals0 === undefined || decimals1 === undefined))) {
    return <Skeleton className={`${height} w-full rounded-xl`} />;
  }
  if (vault.notFound) return message("This vault is not deployed on the selected network.");
  if (vault.hasPosition === undefined) return <Skeleton className={`${height} w-full rounded-xl`} />;
  if (!vault.hasPosition) return message("No position yet. The first Compound opens one, centred on the TWAP.");
  if (tickLower === undefined || tickUpper === undefined) return <Skeleton className={`${height} w-full rounded-xl`} />;
  if (spotTick === undefined && twapTick === undefined) {
    return message(
      vault.twapUnavailable
        ? "The pool's price history is shorter than the TWAP window, so the price can't be shown yet."
        : "Could not read the pool price. It will retry automatically.",
    );
  }

  const price = (tick: number) => tickToPrice(tick, decimals0!, decimals1!);
  const lower = price(tickLower);
  const upper = price(tickUpper);
  const spot = price(spotTick ?? twapTick!);
  const twap = price(twapTick ?? spotTick!);
  const unit = symbol0 && symbol1 ? `${symbol1} per ${symbol0}` : "";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 font-mono text-[11px] text-faint">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-white" aria-hidden /> spot
          </span>
          {Math.abs((spotTick ?? 0) - (twapTick ?? 0)) > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 border-l border-dashed border-cyan" aria-hidden /> TWAP
            </span>
          )}
        </span>
        <span>flow illustrative</span>
      </div>
      <FlowChart
        className={height}
        lower={lower}
        upper={upper}
        spot={spot}
        twap={twap}
        inRange={vault.inRange !== false}
        label={`Range ${formatPriceSig(lower)} to ${formatPriceSig(upper)} ${unit}; spot ${formatPriceSig(spot)}; TWAP ${formatPriceSig(twap)}`}
      />
      <div className="mt-3 flex justify-between font-mono text-xs text-muted">
        <span>LOW {formatPriceSig(lower)}</span>
        <span className="text-faint">{unit}</span>
        <span>HIGH {formatPriceSig(upper)}</span>
      </div>
    </div>
  );
};
