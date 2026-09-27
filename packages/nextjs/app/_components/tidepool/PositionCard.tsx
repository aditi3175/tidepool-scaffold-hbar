import { LiveGauge } from "~~/app/_components/tidepool/LiveGauge";
import { Card, ExternalLink, Skeleton, Stat, StatePill } from "~~/app/_components/tidepool/ui";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatAmount, formatDuration, formatPrice, tickToPrice } from "~~/utils/tidepool/math";

/** The vault's live state, from getPriceState() and positionSerial. */
export const VaultStatusPill = ({ vault }: { vault: VaultState }) => {
  if (vault.twapUnavailable) return <StatePill tone="error">TWAP unavailable</StatePill>;
  if (vault.priceError) return <StatePill tone="error">Price unavailable</StatePill>;
  if (vault.hasPosition === false) return <StatePill tone="neutral">No position</StatePill>;
  if (vault.inRange === undefined) return <Skeleton className="h-6 w-20 rounded-full" />;
  return vault.inRange ? (
    <StatePill tone="success">In range</StatePill>
  ) : (
    <StatePill tone="warning">Out of range</StatePill>
  );
};

/** The spot price as "45.8699 SAUCE per WHBAR". */
export const SpotPrice = ({ vault }: { vault: VaultState }) => {
  const { spotTick, decimals0, decimals1, symbol0, symbol1 } = vault;
  if (spotTick === undefined || decimals0 === undefined || decimals1 === undefined) {
    return <Skeleton className="h-5 w-32" />;
  }
  return (
    <span className="text-sm">
      <span className="text-muted">Spot </span>
      <span className="tp-num font-medium text-fg">{formatPrice(tickToPrice(spotTick, decimals0, decimals1))}</span>
      <span className="text-muted">
        {" "}
        {symbol1} per {symbol0}
      </span>
    </span>
  );
};

/** The range chart and one row of position stats. */
export const PositionCard = ({ vault }: { vault: VaultState }) => {
  const { decimals0, decimals1, spotTick, twapTick } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined;
  const price = (tick: number | undefined) =>
    tick === undefined || !ready ? "–" : formatPrice(tickToPrice(tick, decimals0!, decimals1!));
  const apart = spotTick !== undefined && twapTick !== undefined ? Math.abs(spotTick - twapTick) : undefined;
  const over = apart !== undefined && vault.maxTwapDeviation !== undefined && apart > vault.maxTwapDeviation;

  const windowText =
    vault.twapWindow === undefined
      ? "the TWAP window"
      : vault.twapWindow % 60 === 0
        ? `${vault.twapWindow / 60} minutes`
        : formatDuration(vault.twapWindow);
  const limit = vault.maxTwapDeviation ?? "–";

  return (
    <Card title="Position">
      <LiveGauge vault={vault} />
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-5">
        <Stat label="Spot" tip="The pool's price right now.">
          {price(spotTick)}
        </Stat>
        <Stat
          label="TWAP"
          tip={`The pool's average price over the last ${windowText}. The vault acts on this, not on spot.`}
        >
          {price(twapTick)}
        </Stat>
        <Stat
          label="Ticks apart"
          tip={`How far spot is from the TWAP. Above ${limit} ticks the vault pauses deposits, compounds and rebalances; withdrawals still work.`}
        >
          <span className={over ? "text-danger" : undefined}>
            {apart ?? "–"} / {limit}
          </span>
        </Stat>
        <Stat label="LP NFT" tip="The SaucerSwap position NFT the vault owns. Opens on HashScan.">
          {vault.positionSerial !== undefined && vault.positionSerial > 0n && vault.positionNft ? (
            <ExternalLink href={hashscan.nft(vault.positionNft, vault.positionSerial)}>
              #{vault.positionSerial.toString()}
            </ExternalLink>
          ) : (
            "None yet"
          )}
        </Stat>
        <Stat
          label="Liquidity"
          tip="The position's liquidity, in SaucerSwap's own units. It grows when fees are compounded."
        >
          {vault.hasPosition === false ? "0" : formatAmount(vault.liquidity, 0)}
        </Stat>
      </div>
    </Card>
  );
};
