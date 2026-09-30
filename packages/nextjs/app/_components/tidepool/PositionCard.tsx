import { VaultFlow } from "~~/app/_components/tidepool/VaultFlow";
import { Card, ExternalLink, Skeleton, Stat, StatePill } from "~~/app/_components/tidepool/ui";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { formatPriceSig, formatToken } from "~~/utils/tidepool/format";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatAmount, tickToPrice } from "~~/utils/tidepool/math";

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

/** The range chart and one row of position stats. */
export const PositionCard = ({ vault }: { vault: VaultState }) => {
  const { decimals0, decimals1 } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined;
  const price = (tick: number | undefined) =>
    tick === undefined || !ready ? "–" : formatPriceSig(tickToPrice(tick, decimals0!, decimals1!));
  const halfWidthPct =
    ready && vault.tickLower !== undefined && vault.tickUpper !== undefined
      ? (Math.sqrt(
          tickToPrice(vault.tickUpper, decimals0!, decimals1!) / tickToPrice(vault.tickLower, decimals0!, decimals1!),
        ) -
          1) *
        100
      : undefined;

  return (
    <Card title="Position">
      <VaultFlow vault={vault} />
      <div className="mt-2 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-4">
        <Stat label="Range">
          {price(vault.tickLower)} – {price(vault.tickUpper)}
        </Stat>
        <Stat label="Width" tip="How far each edge sits from the middle of the range, in price.">
          {halfWidthPct === undefined ? "–" : `±${halfWidthPct.toFixed(1)}%`}
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
          {vault.hasPosition === false ? (
            "0"
          ) : (
            <span title={formatAmount(vault.liquidity, 0)}>
              {vault.liquidity === undefined ? "–" : formatToken(Number(vault.liquidity), { compact: true })}
            </span>
          )}
        </Stat>
      </div>
    </Card>
  );
};
