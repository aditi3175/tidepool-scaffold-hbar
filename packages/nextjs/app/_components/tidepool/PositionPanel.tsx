import { RangeChart } from "~~/app/_components/tidepool/RangeChart";
import { ExternalLink, Metric, Panel, Skeleton } from "~~/app/_components/tidepool/ui";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatAmount, formatDuration, formatPrice, tickToPrice } from "~~/utils/tidepool/math";

const StatusBadge = ({ vault }: { vault: VaultState }) => {
  if (vault.twapUnavailable) return <span className="badge badge-error badge-soft">TWAP unavailable</span>;
  if (vault.priceError) return <span className="badge badge-error badge-soft">Price unavailable</span>;
  if (vault.hasPosition === false) return <span className="badge badge-ghost">No position yet</span>;
  if (vault.inRange === undefined) return <Skeleton className="h-5 w-24" />;
  return vault.inRange ? (
    <span className="badge badge-success badge-soft">In range</span>
  ) : (
    <span className="badge badge-warning badge-soft">Out of range</span>
  );
};

/** The vault's single SaucerSwap V2 position, the pool's spot and TWAP prices, and the vault's range settings. */
export const PositionPanel = ({ vault }: { vault: VaultState }) => {
  const { decimals0, decimals1, symbol0, symbol1 } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined;
  const price = (tick: number | undefined) =>
    tick === undefined || !ready ? "–" : formatPrice(tickToPrice(tick, decimals0!, decimals1!));
  const quote = `${symbol1 ?? "token1"} per ${symbol0 ?? "token0"}`;
  const deviation =
    vault.spotTick !== undefined && vault.twapTick !== undefined
      ? Math.abs(vault.spotTick - vault.twapTick)
      : undefined;
  const showChart =
    ready &&
    vault.hasPosition &&
    vault.tickLower !== undefined &&
    vault.tickUpper !== undefined &&
    vault.spotTick !== undefined &&
    vault.twapTick !== undefined;

  return (
    <Panel
      title="Position"
      subtitle={
        <>
          SaucerSwap V2 concentrated liquidity.{" "}
          {vault.pool && <ExternalLink href={hashscan.contract(vault.pool)}>Pool on HashScan</ExternalLink>}
        </>
      }
      actions={<StatusBadge vault={vault} />}
    >
      {!ready || vault.hasPosition === undefined ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="flex flex-col gap-5">
          {vault.twapUnavailable && (
            <p className="text-sm text-error">
              The pool&apos;s observation history is shorter than the vault&apos;s TWAP window, so the vault will not
              deposit, compound or rebalance until it grows. Withdrawals still work.
            </p>
          )}
          {vault.priceError && !vault.twapUnavailable && (
            <p className="text-sm text-error">Could not read the pool price: {vault.priceError}</p>
          )}

          {showChart ? (
            <RangeChart
              tickLower={vault.tickLower!}
              tickUpper={vault.tickUpper!}
              spotTick={vault.spotTick!}
              twapTick={vault.twapTick!}
              decimals0={decimals0!}
              decimals1={decimals1!}
              quoteLabel={quote}
            />
          ) : (
            vault.hasPosition === false && (
              <p className="text-sm text-base-content/70">
                The vault has no liquidity position yet. The first Compound opens one, centred on the TWAP.
              </p>
            )
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="LP NFT"
              value={
                vault.hasPosition && vault.positionSerial !== undefined ? (
                  vault.positionNft ? (
                    <ExternalLink href={hashscan.nft(vault.positionNft, vault.positionSerial)}>
                      #{vault.positionSerial.toString()}
                    </ExternalLink>
                  ) : (
                    `#${vault.positionSerial}`
                  )
                ) : (
                  "–"
                )
              }
              note="Serial of SaucerSwap's position NFT, held by the vault."
            />
            <Metric
              label="Liquidity"
              value={vault.hasPosition ? formatAmount(vault.liquidity, 0) : "–"}
              note="Position liquidity (L) from the position manager."
            />
            <Metric
              label="Range"
              value={
                vault.hasPosition ? (
                  <span className="flex flex-col">
                    <span>
                      {price(vault.tickLower)} – {price(vault.tickUpper)}
                    </span>
                    <span className="text-xs text-base-content/60">
                      ticks [{vault.tickLower}, {vault.tickUpper})
                    </span>
                  </span>
                ) : (
                  "–"
                )
              }
              note={quote}
            />
            <Metric
              label="Fees owed"
              value={
                vault.hasPosition ? (
                  <span className="flex flex-col">
                    <span>
                      {formatAmount(vault.tokensOwed0, decimals0)} {symbol0}
                    </span>
                    <span>
                      {formatAmount(vault.tokensOwed1, decimals1)} {symbol1}
                    </span>
                  </span>
                ) : (
                  "–"
                )
              }
              note="Fees owed — updates on next collection. Not the live claimable amount."
            />
            <Metric
              label="Spot price"
              value={
                <span className="flex flex-col">
                  <span>{price(vault.spotTick)}</span>
                  <span className="text-xs text-base-content/60">tick {vault.spotTick ?? "–"}</span>
                </span>
              }
              note="Pool slot0."
            />
            <Metric
              label="TWAP price"
              value={
                <span className="flex flex-col">
                  <span>{price(vault.twapTick)}</span>
                  <span className="text-xs text-base-content/60">tick {vault.twapTick ?? "–"}</span>
                </span>
              }
              note={
                vault.twapWindow !== undefined ? `Time-weighted over ${formatDuration(vault.twapWindow)}.` : undefined
              }
            />
            <Metric
              label="Spot vs TWAP"
              value={deviation === undefined ? "–" : `${deviation} ticks`}
              note={
                vault.maxTwapDeviation !== undefined
                  ? `The vault acts only within ${vault.maxTwapDeviation} ticks.`
                  : undefined
              }
            />
            <Metric
              label="Range settings"
              value={vault.halfWidth !== undefined ? `± ${vault.halfWidth} ticks` : "–"}
              note={[
                vault.rebalanceCooldown !== undefined &&
                  `rebalance cooldown ${formatDuration(vault.rebalanceCooldown)}`,
                vault.swapSlippageBps !== undefined && `swap slippage ${vault.swapSlippageBps / 100}%`,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </div>
        </div>
      )}
    </Panel>
  );
};
