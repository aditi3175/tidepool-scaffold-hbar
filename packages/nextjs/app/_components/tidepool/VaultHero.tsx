import { RangeVisual } from "~~/app/_components/tidepool/PriceRange";
import { YourStake } from "~~/app/_components/tidepool/YourPosition";
import { Num } from "~~/app/_components/tidepool/motion";
import { ExternalLink, Skeleton, StatePill, TokenAmount } from "~~/app/_components/tidepool/ui";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { ARCHITECTURE_DOC_URL, SHARE_DECIMALS } from "~~/utils/tidepool/constants";
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

const STEPS = [
  {
    title: "Deposit",
    text: "Add both tokens in the vault's current ratio and receive vault shares.",
  },
  {
    title: "Compound fees",
    text: "Anyone can collect the position's swap fees and add them back into the range.",
  },
  {
    title: "Rebalance",
    text: "When the TWAP leaves the range, anyone can re-centre the position on it.",
  },
] as const;

/** Three steps under the range visual, with a link to the full write-up. */
const HowItWorks = () => (
  <div className="mt-6">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="m-0 text-sm font-medium text-base-content/85">How it works</h2>
      <ExternalLink className="text-xs text-base-content/55" href={ARCHITECTURE_DOC_URL}>
        Architecture and design notes
      </ExternalLink>
    </div>
    <ol className="m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
      {STEPS.map((step, i) => (
        <li key={step.title} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <div className="flex items-baseline gap-2 text-sm font-medium text-base-content">
            <span className="tp-num text-xs text-primary/90">{i + 1}</span>
            {step.title}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-base-content/55">{step.text}</p>
        </li>
      ))}
    </ol>
  </div>
);

/**
 * Hero: the pair and its live state as a normal heading row, the range visual as the centrepiece with "How it works"
 * under it, and the vault's holdings (with your stake) beside it. Enters once per vault.
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
      className="relative pb-6 pt-6 sm:pt-10"
      aria-label={`${config.label}${config.demo ? " (demo / test vault)" : ""}`}
    >
      {/* Heading row: pair, status and spot price */}
      <div className="tp-in flex flex-wrap items-end justify-between gap-x-8 gap-y-4" style={d(0)}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/55">
            <span className={config.demo ? "text-warning/90" : undefined}>{config.label}</span>
            {config.demo && (
              <span className="rounded-full border border-warning/30 bg-warning/[0.07] px-2.5 py-0.5 text-xs text-warning/90">
                Test vault for rebalancing
              </span>
            )}
          </div>
          <h1 className="m-0 mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {symbol0 && symbol1 ? (
              <>
                {symbol0} <span className="font-normal text-base-content/35">/</span> {symbol1}
              </>
            ) : (
              <Skeleton className="h-8 w-48" />
            )}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-base-content/55">{config.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <VaultStatusPill vault={vault} size="lg" />
          <div className="whitespace-nowrap">
            <span className="text-xs text-base-content/50">Spot </span>
            <Num id="hero-spot" text={spot ?? "–"} className="text-xl text-base-content" />
            <span className="ml-1.5 text-xs text-base-content/45">
              {symbol1} per {symbol0}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Centrepiece: the range */}
        <div className="tp-in min-w-0 lg:col-span-8" style={d(120)}>
          <RangeVisual vault={vault} />
          <HowItWorks />
        </div>

        {/* The vault's holdings and your stake */}
        <div className="tp-in min-w-0 lg:col-span-4" style={d(240)}>
          <div className="rounded-3xl border border-white/[0.08] bg-[linear-gradient(160deg,rgb(110_123_255/0.09),rgb(13_15_20/0.6)_45%,rgb(62_224_197/0.05))] p-5 sm:p-6">
            <h2 className="m-0 text-sm font-medium text-base-content/85">Vault holdings</h2>
            {!figuresReady ? (
              <div className="mt-4 flex flex-col gap-3">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-9 w-56" />
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-1 text-[1.75rem] leading-tight tracking-tight">
                <TokenAmount id="ov-total0" amount={formatAmount(vault.total0, decimals0)} symbol={symbol0} />
                <TokenAmount id="ov-total1" amount={formatAmount(vault.total1, decimals1)} symbol={symbol1} />
              </div>
            )}
            <p className="mt-2 text-xs leading-snug text-base-content/45">
              Includes idle tokens. Fees are added at the next compound.
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.07] pt-5 text-sm">
              <div>
                <dt className="tp-eyebrow">Total shares</dt>
                <dd className="m-0 mt-1">
                  <TokenAmount
                    id="ov-shares"
                    amount={formatAmount(vault.totalShares, SHARE_DECIMALS)}
                    symbol={vault.shareSymbol}
                  />
                </dd>
              </div>
              <div>
                <dt className="tp-eyebrow">Share token</dt>
                <dd className="m-0 mt-1 text-xs">
                  {vault.shareToken ? (
                    <ExternalLink className="tp-num text-base-content/75" href={hashscan.token(vault.shareToken)}>
                      {entityIdFromAddress(vault.shareToken) ?? shortAddress(vault.shareToken)}
                    </ExternalLink>
                  ) : vault.initialized === false ? (
                    "Not initialized"
                  ) : (
                    "–"
                  )}
                </dd>
              </div>
              {vault.address && (
                <div className="col-span-2">
                  <dt className="tp-eyebrow">Vault contract</dt>
                  <dd className="m-0 mt-1 text-xs">
                    <ExternalLink className="tp-num text-base-content/75" href={hashscan.contract(vault.address)}>
                      {entityIdFromAddress(vault.address) ?? shortAddress(vault.address)}
                    </ExternalLink>
                    <span className="ml-2 text-base-content/40">on Hedera Testnet</span>
                  </dd>
                </div>
              )}
            </dl>
            <YourStake vault={vault} user={user} />
          </div>
        </div>
      </div>
    </section>
  );
};
