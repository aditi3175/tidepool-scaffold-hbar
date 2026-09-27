import { Gauge } from "~~/app/_components/tidepool/Gauge";
import { Skeleton } from "~~/app/_components/tidepool/ui";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { formatPrice, tickToPrice } from "~~/utils/tidepool/math";

/** The gauge for a vault's live state, with a real message for every state that has no range to draw. */
export const LiveGauge = ({ vault, size = "lg" }: { vault: VaultState; size?: "lg" | "md" }) => {
  const { decimals0, decimals1, symbol0, symbol1, tickLower, tickUpper, spotTick, twapTick } = vault;
  const height = size === "lg" ? "h-[172px]" : "h-[140px]";

  const message = (text: string) => (
    <div
      className={`flex ${height} items-center justify-center rounded-lg border border-dashed border-line px-4 text-center text-sm text-muted`}
    >
      {text}
    </div>
  );

  if (vault.isLoading || (!vault.notFound && (decimals0 === undefined || decimals1 === undefined))) {
    return <Skeleton className={`${height} w-full rounded-lg`} />;
  }
  if (vault.notFound) return message("This vault is not deployed on the selected network.");
  if (vault.hasPosition === undefined) return <Skeleton className={`${height} w-full rounded-lg`} />;
  if (!vault.hasPosition) return message("No position yet. The first Compound opens one, centred on the TWAP.");
  if (tickLower === undefined || tickUpper === undefined) return <Skeleton className={`${height} w-full rounded-lg`} />;
  if (spotTick === undefined && twapTick === undefined) {
    return message(
      vault.twapUnavailable
        ? "The pool's price history is shorter than the TWAP window, so the price can't be shown yet."
        : "Could not read the pool price. It will retry automatically.",
    );
  }

  return (
    <Gauge
      lower={tickLower}
      upper={tickUpper}
      spot={spotTick}
      twap={twapTick}
      price={tick => formatPrice(tickToPrice(tick, decimals0!, decimals1!))}
      size={size}
      label={symbol0 && symbol1 ? `${symbol0}/${symbol1} vault` : undefined}
    />
  );
};
