import { useAccount } from "wagmi";
import { ExternalLink, Metric, Panel, Skeleton } from "~~/app/_components/tidepool/ui";
import { HederaAddress } from "~~/components/scaffold-hbar";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { entityIdFromAddress, formatAmount } from "~~/utils/tidepool/math";

const Pair = ({ a, b }: { a: string; b: string }) => (
  <span className="flex flex-col">
    <span>{a}</span>
    <span>{b}</span>
  </span>
);

/** What the vault holds and what the connected account owns of it. Token amounts only: no USD values on testnet. */
export const VaultOverview = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  const loaded = decimals0 !== undefined && decimals1 !== undefined && vault.total0 !== undefined;
  const amount = (value: bigint | undefined, decimals: number | undefined, symbol: string | undefined) =>
    `${formatAmount(value, decimals)} ${symbol ?? ""}`;

  return (
    <Panel
      title="Vault overview"
      subtitle="Read from the vault contract and its tokens. Amounts are in token units; testnet prices are not market prices."
    >
      {!loaded ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Vault holdings"
              value={<Pair a={amount(vault.total0, decimals0, symbol0)} b={amount(vault.total1, decimals1, symbol1)} />}
              note="getTotalAmounts(): position at the spot price plus idle balances. Excludes uncollected fees."
            />
            <Metric
              label="Idle (not in the position)"
              value={<Pair a={amount(vault.idle0, decimals0, symbol0)} b={amount(vault.idle1, decimals1, symbol1)} />}
              note="Deposits and collected fees waiting for the next compound."
            />
            <Metric
              label="Total shares"
              value={formatAmount(vault.totalShares, SHARE_DECIMALS)}
              note={vault.shareSymbol ? `${vault.shareSymbol}, HTS token with ${SHARE_DECIMALS} decimals.` : undefined}
            />
            <Metric
              label="Share token"
              value={
                vault.shareToken ? (
                  <ExternalLink href={hashscan.token(vault.shareToken)}>
                    {entityIdFromAddress(vault.shareToken) ?? vault.shareToken}
                  </ExternalLink>
                ) : vault.initialized === false ? (
                  "Not initialized"
                ) : (
                  "–"
                )
              }
              note={
                vault.address && (
                  <ExternalLink href={hashscan.contract(vault.address)}>Vault contract on HashScan</ExternalLink>
                )
              }
            />
          </div>

          <div className="border-t border-base-300 pt-4">
            <h3 className="mb-3 text-sm font-semibold">Your position</h3>
            {!user.connected ? (
              <p className="text-sm text-base-content/70">Connect a wallet to see your shares.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Account" value={<AccountId />} />
                <Metric
                  label="Your shares"
                  value={user.shares === undefined ? <Skeleton /> : formatAmount(user.shares, SHARE_DECIMALS)}
                  note={
                    user.isAssociated === false
                      ? "Share token not associated with your account yet."
                      : user.percent !== undefined
                        ? `${user.percent}% of all shares`
                        : undefined
                  }
                />
                <Metric
                  label="Estimated slice"
                  value={
                    user.slice0 === undefined ? (
                      "–"
                    ) : (
                      <Pair a={amount(user.slice0, decimals0, symbol0)} b={amount(user.slice1, decimals1, symbol1)} />
                    )
                  }
                  note="Your share of vault holdings at the spot price, before uncollected fees. Withdraw shows the exact amount."
                />
                <Metric
                  label="Share token association"
                  value={
                    user.isAssociated === undefined ? <Skeleton /> : user.isAssociated ? "Associated" : "Not associated"
                  }
                  note="Hedera accounts must associate an HTS token before receiving it. Deposit handles this."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
};

/** The connected wallet's EVM address and Hedera account ID (mirror-node lookup), via the scaffold component. */
const AccountId = () => {
  const { targetNetwork } = useTargetNetwork();
  const { address } = useAccount();
  return (
    <div className="[&>div]:items-start">
      <HederaAddress address={address} chain={targetNetwork} />
    </div>
  );
};
