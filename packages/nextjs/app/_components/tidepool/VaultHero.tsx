import { YourStake } from "~~/app/_components/tidepool/YourPosition";
import { Num } from "~~/app/_components/tidepool/motion";
import { ExternalLink, Skeleton, StatePill, TokenAmount } from "~~/app/_components/tidepool/ui";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { entityIdFromAddress, formatAmount, formatPrice, shortAddress, tickToPrice } from "~~/utils/tidepool/math";
import type { TidepoolVaultConfig } from "~~/utils/tidepool/vaults";

/** The vault's live state, from getPriceState() and positionSerial (same conditions as before the redesign). */
export const VaultStatusPill = ({ vault, size = "sm" }: { vault: VaultState; size?: "sm" | "lg" }) => {
  const cls = size === "lg" ? "px-3.5 py-1.5 text-xs" : "";
  if (vault.twapUnavailable)
    return (
      <StatePill key="twap" tone="error" className={cls}>
        TWAP unavailable
      </StatePill>
    );
  if (vault.priceError)
    return (
      <StatePill key="price" tone="error" className={cls}>
        Price unavailable
      </StatePill>
    );
  if (vault.hasPosition === false)
    return (
      <StatePill key="none" tone="neutral" className={cls}>
        No position yet
      </StatePill>
    );
  if (vault.inRange === undefined) return <Skeleton className="h-7 w-28 rounded-full" />;
  return vault.inRange ? (
    <StatePill key="in" tone="success" live className={cls}>
      In range
    </StatePill>
  ) : (
    <StatePill key="out" tone="warning" live className={cls}>
      Out of range
    </StatePill>
  );
};

const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` });

/**
 * Hero composition: the pair and its live state on the left; the vault's figures on the right (what used to be the
 * Overview card). Enters once per vault (the dashboard remounts on a vault switch).
 */
export const VaultHero = ({
  vault,
  config,
  user,
}: {
  vault: VaultState;
  config: TidepoolVaultConfig;
  user: UserPosition;
}) => {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  const spot =
    vault.spotTick !== undefined && decimals0 !== undefined && decimals1 !== undefined
      ? formatPrice(tickToPrice(vault.spotTick, decimals0, decimals1))
      : undefined;
  const figuresReady = decimals0 !== undefined && decimals1 !== undefined && vault.total0 !== undefined;

  return (
    <section
      className="relative grid grid-cols-1 items-start gap-10 pb-6 pt-8 sm:pt-12 lg:grid-cols-12 lg:gap-12"
      aria-label={`${config.label}${config.demo ? " (demo / test vault)" : ""}`}
    >
      {/* Left: identity and live state */}
      <div className="min-w-0 lg:col-span-7 lg:pt-8">
        <div className="tp-in mb-5 flex flex-wrap items-center gap-2.5" style={d(0)}>
          <span className={`tp-eyebrow ${config.demo ? "text-warning/85" : "text-base-content/60"}`}>
            {config.label}
          </span>
          {config.demo && (
            <span className="rounded-full border border-warning/30 bg-warning/[0.07] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-warning/90">
              Test vault · demonstrates rebalancing
            </span>
          )}
        </div>

        <h1 className="tp-display m-0 max-w-full pl-[0.03em] text-[clamp(2.5rem,10vw,6.25rem)] leading-[0.95]">
          {symbol0 && symbol1 ? (
            <>
              <span className="tp-in-track inline-block" style={d(80)}>
                {symbol0}
              </span>
              <span className="tp-in mx-2 inline-block text-base-content/25 sm:mx-4" style={d(180)}>
                /
              </span>
              <span className="tp-in-track inline-block italic text-base-content/85" style={d(240)}>
                {symbol1}
              </span>
            </>
          ) : (
            <Skeleton className="h-20 w-80" />
          )}
        </h1>

        <p className="tp-in mt-5 max-w-lg text-sm leading-relaxed text-base-content/55 sm:text-[15px]" style={d(340)}>
          {config.description}
        </p>

        <div className="tp-in mt-8 flex flex-wrap items-end gap-x-10 gap-y-5" style={d(440)}>
          <div>
            <div className="tp-eyebrow mb-2">Status</div>
            <VaultStatusPill vault={vault} size="lg" />
          </div>
          <div>
            <div className="tp-eyebrow mb-1.5">Spot price</div>
            <Num id="hero-spot" text={spot ?? "–"} className="text-3xl text-base-content" />
            <span className="ml-2 text-xs text-base-content/45">
              {symbol1} per {symbol0}
            </span>
          </div>
        </div>
      </div>

      {/* Right: the vault's figures */}
      <div className="tp-in lg:col-span-5" style={d(520)}>
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(160deg,rgb(110_123_255/0.09),rgb(13_15_20/0.6)_45%,rgb(62_224_197/0.05))] p-6 sm:p-7">
          <div className="tp-eyebrow">In the vault</div>
          {!figuresReady ? (
            <div className="mt-4 flex flex-col gap-3">
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-10 w-64" />
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-1 text-[2rem] leading-tight tracking-tight sm:text-[2.4rem]">
              <TokenAmount id="ov-total0" amount={formatAmount(vault.total0, decimals0)} symbol={symbol0} />
              <TokenAmount id="ov-total1" amount={formatAmount(vault.total1, decimals1)} symbol={symbol1} />
            </div>
          )}
          <p className="mt-2 text-[11px] leading-snug text-base-content/40">
            Position at the spot price plus idle balances (getTotalAmounts); excludes uncollected fees.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.07] pt-5 text-sm">
            <div>
              <dt className="tp-eyebrow">Total shares</dt>
              <dd className="m-0 mt-1.5">
                <TokenAmount
                  id="ov-shares"
                  amount={formatAmount(vault.totalShares, SHARE_DECIMALS)}
                  symbol={vault.shareSymbol}
                />
              </dd>
            </div>
            <div>
              <dt className="tp-eyebrow">Share token</dt>
              <dd className="m-0 mt-1.5 text-xs">
                {vault.shareToken ? (
                  <ExternalLink className="tp-num text-base-content/75" href={hashscan.token(vault.shareToken)}>
                    {entityIdFromAddress(vault.shareToken) ?? shortAddress(vault.shareToken)}
                  </ExternalLink>
                ) : vault.initialized === false ? (
                  "Not initialized"
                ) : (
                  "–"
                )}
                <span className="mt-1 block text-[11px] text-base-content/40">HTS, {SHARE_DECIMALS} decimals</span>
              </dd>
            </div>
            {vault.address && (
              <div className="col-span-2">
                <dt className="tp-eyebrow">Vault contract</dt>
                <dd className="m-0 mt-1.5 text-xs">
                  <ExternalLink
                    className="tp-num break-all text-base-content/75"
                    href={hashscan.contract(vault.address)}
                  >
                    {vault.address}
                  </ExternalLink>
                  <span className="mt-1 block text-[11px] text-base-content/40">SaucerSwap V2 · Hedera Testnet</span>
                </dd>
              </div>
            )}
          </dl>
          <YourStake vault={vault} user={user} />
        </div>
      </div>
    </section>
  );
};
