import type { ReactNode } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { InfoTip } from "~~/app/_components/tidepool/InfoTip";
import { Card, ExternalLink, Skeleton, Stat, TokenAmount } from "~~/app/_components/tidepool/ui";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { ACTIVITY_LIMIT, useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { entityIdFromAddress, formatAmount, shortAddress, tickToPrice } from "~~/utils/tidepool/math";

/** What the vault holds: both tokens (position and idle), total shares and the share token. */
export const VaultHoldingsCard = ({ vault }: { vault: VaultState }) => {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined && vault.total0 !== undefined;

  return (
    <Card title="Vault holdings">
      {ready ? (
        <div className="flex flex-col gap-1 text-xl font-medium">
          <TokenAmount amount={formatAmount(vault.total0, decimals0)} symbol={symbol0} />
          <TokenAmount amount={formatAmount(vault.total1, decimals1)} symbol={symbol1} />
        </div>
      ) : vault.readError ? (
        <p className="text-sm text-muted">Holdings could not be read. Retrying.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-44" />
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat label="Total shares" tip="All vault shares in existence, including 0.001 locked in the vault forever.">
          {formatAmount(vault.totalShares, SHARE_DECIMALS)}
        </Stat>
        <Stat label="Share token" tip="The HTS token that represents vault shares. Opens on HashScan.">
          {vault.shareToken ? (
            <ExternalLink href={hashscan.token(vault.shareToken)}>
              {entityIdFromAddress(vault.shareToken) ?? shortAddress(vault.shareToken)}
            </ExternalLink>
          ) : vault.initialized === false ? (
            "Not initialized"
          ) : (
            "–"
          )}
        </Stat>
      </div>
    </Card>
  );
};

const big = (value: unknown) => (typeof value === "bigint" ? value : 0n);

/** A labelled block inside a stretched card. */
const Block = ({ title, tip, children }: { title: string; tip?: ReactNode; children: ReactNode }) => (
  <div>
    <h3 className="m-0 flex items-center gap-1 text-xs font-normal text-muted">
      {title}
      {tip && <InfoTip label={title}>{tip}</InfoTip>}
    </h3>
    <div className="mt-2">{children}</div>
  </div>
);

/**
 * The connected account's position: shares and tokens, the token split, total value and share of fees (estimates at
 * the current spot price), and its own recent deposits and withdrawals. Everything comes from reads the dashboard
 * already makes (vault state, share balance, mirror-node events).
 */
export const YourPositionCard = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const { address } = useAccount();
  const { data: events, isLoading: eventsLoading } = useVaultActivity(vault.address, vault.abi);
  const { symbol0, symbol1, decimals0, decimals1, spotTick } = vault;
  const ready = decimals0 !== undefined && decimals1 !== undefined;

  // Values in token1 at the spot price (token1 per token0).
  const price = ready && spotTick !== undefined ? tickToPrice(spotTick, decimals0!, decimals1!) : undefined;
  const amount0 = ready && user.slice0 !== undefined ? Number(formatUnits(user.slice0, decimals0!)) : undefined;
  const amount1 = ready && user.slice1 !== undefined ? Number(formatUnits(user.slice1, decimals1!)) : undefined;
  const value0 = amount0 !== undefined && price !== undefined ? amount0 * price : undefined;
  const total = value0 !== undefined && amount1 !== undefined ? value0 + amount1 : undefined;
  const split0 = total && value0 !== undefined ? Math.round((value0 / total) * 100) : undefined;

  // Your share of the fees collected in the loaded events.
  const fees = (events ?? []).filter(event => event.name === "FeesCollected");
  const fee0 = fees.reduce((sum, event) => sum + big(event.args.fee0), 0n);
  const fee1 = fees.reduce((sum, event) => sum + big(event.args.fee1), 0n);
  const hasShare = user.shares !== undefined && vault.totalShares !== undefined && vault.totalShares > 0n;
  const yourFee0 = hasShare ? (fee0 * user.shares!) / vault.totalShares! : undefined;
  const yourFee1 = hasShare ? (fee1 * user.shares!) / vault.totalShares! : undefined;

  // Your own deposits and withdrawals, newest first (the mirror node returns them newest first).
  const me = address?.toLowerCase();
  const mine = (events ?? []).filter(
    event =>
      (event.name === "Deposit" || event.name === "Withdraw") &&
      me !== undefined &&
      [event.args.sender, event.args.owner, event.args.receiver].some(
        who => typeof who === "string" && who.toLowerCase() === me,
      ),
  );

  return (
    <Card title="Your position" stretch>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Shares">{user.shares === undefined ? "–" : formatAmount(user.shares, SHARE_DECIMALS)}</Stat>
        <Stat label="Share of vault">{user.percent === undefined ? "–" : `${user.percent}%`}</Stat>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs text-muted">
            Estimated tokens
            <InfoTip label="Estimated tokens">
              Your share of the vault&apos;s holdings at the current price. Uncollected fees are added at the next
              compound.
            </InfoTip>
          </div>
          <div className="mt-1 flex flex-col text-sm font-medium text-fg">
            {user.slice0 === undefined ? (
              "–"
            ) : (
              <>
                <TokenAmount amount={formatAmount(user.slice0, decimals0)} symbol={symbol0} />
                <TokenAmount amount={formatAmount(user.slice1, decimals1)} symbol={symbol1} />
              </>
            )}
          </div>
        </div>
      </div>

      <Block title="Token split (estimate)" tip={`By value in ${symbol1 ?? "token1"} at the current spot price.`}>
        {split0 === undefined ? (
          <p className="text-sm text-muted">Waiting for the pool price.</p>
        ) : (
          <>
            <div
              className="flex h-2 overflow-hidden rounded-full bg-raised"
              role="img"
              aria-label={`${split0}% ${symbol0}, ${100 - split0}% ${symbol1} by value`}
            >
              <span className="h-full bg-teal" style={{ width: `${split0}%` }} />
              <span className="h-full bg-twap" style={{ width: `${100 - split0}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal" aria-hidden />
                <TokenAmount amount={formatAmount(user.slice0, decimals0)} symbol={symbol0} />
                <span className="tp-num text-xs text-muted">{split0}%</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-twap" aria-hidden />
                <TokenAmount amount={formatAmount(user.slice1, decimals1)} symbol={symbol1} />
                <span className="tp-num text-xs text-muted">{100 - split0}%</span>
              </span>
            </div>
          </>
        )}
      </Block>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Block
          title="Total value (estimate)"
          tip={`Both tokens valued in ${symbol1 ?? "token1"} at the current spot price. Not a quote.`}
        >
          <span className="tp-num text-xl font-medium text-fg">
            {total === undefined ? "–" : total.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </span>
          <span className="ml-1 text-sm text-muted">{symbol1}</span>
        </Block>
        <Block
          title={`Your share of fees, from the last ${ACTIVITY_LIMIT} events`}
          tip="Your share of the vault times the fees collected in the events loaded below. Older collections are not counted."
        >
          {eventsLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : yourFee0 === undefined ? (
            <span className="text-sm text-muted">–</span>
          ) : (
            <span className="flex flex-col text-sm font-medium text-fg">
              <TokenAmount amount={formatAmount(yourFee0, decimals0)} symbol={symbol0} />
              <TokenAmount amount={formatAmount(yourFee1, decimals1)} symbol={symbol1} />
            </span>
          )}
        </Block>
      </div>

      <Block title="Your recent activity">
        {eventsLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : mine.length === 0 ? (
          <p className="text-sm text-muted">
            No deposits or withdrawals from this wallet in the last {ACTIVITY_LIMIT} events.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0 text-sm">
            {mine.slice(0, 5).map(event => (
              <li
                key={`${event.transactionHash}-${event.logIndex}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
              >
                <span className="font-medium text-fg">{event.name}</span>
                <span className="tp-num min-w-0 flex-1 text-muted">
                  {formatAmount(big(event.args.amount0), decimals0)} {symbol0} +{" "}
                  {formatAmount(big(event.args.amount1), decimals1)} {symbol1}
                </span>
                <ExternalLink className="tp-num text-xs text-muted" href={hashscan.tx(event.transactionHash)}>
                  {new Date(event.timestamp * 1000).toLocaleString()}
                </ExternalLink>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </Card>
  );
};

/** While a connected account's share balance is being read. */
export const PositionLoadingCard = () => (
  <Card title="Your position" stretch>
    <p className="text-sm text-muted">Reading your share balance from Hedera testnet…</p>
    <Skeleton className="h-24 w-full rounded-lg" />
  </Card>
);

const AFTER_CONNECTING = [
  "Deposit WHBAR and SAUCE and receive vault shares.",
  "Follow your position, your share of fees and your activity here.",
  "Press Compound or Rebalance when the keeper card shows Ready.",
];

/** Disconnected: what the vault is, a Connect button, and what you can do once connected. */
export const ConnectCard = () => {
  const { openConnectModal } = useConnectModal();
  return (
    <Card title="Connect a wallet" stretch>
      <div>
        <p className="text-sm text-muted">
          This vault owns one SaucerSwap V2 position on Hedera testnet. Connect a wallet on Hedera Testnet (chain 296)
          to use it.
        </p>
        <button
          type="button"
          className="btn btn-primary mt-4 h-10 min-h-10 rounded-lg px-4 text-sm font-medium"
          onClick={openConnectModal}
        >
          Connect wallet
        </button>
      </div>
      <div>
        <h3 className="m-0 text-xs font-normal text-muted">After connecting you can</h3>
        <ol className="m-0 mt-2 flex list-none flex-col gap-2 p-0 text-sm">
          {AFTER_CONNECTING.map((text, i) => (
            <li key={text} className="flex gap-3">
              <span className="tp-num text-xs text-teal">{i + 1}</span>
              <span className="text-fg">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
};
