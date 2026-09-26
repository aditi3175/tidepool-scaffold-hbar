import type { ReactNode } from "react";
import { ExternalLink, Panel, StatusBadge, TxFeedback } from "~~/app/_components/tidepool/ui";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { type ActionStatus, useKeeperQuotes, useKeeperStatus } from "~~/hooks/tidepool/useKeeperStatus";
import { useTxFeedback } from "~~/hooks/tidepool/useTxFeedback";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { useWalletGate } from "~~/hooks/tidepool/useWalletGate";
import { GAS, KEEPER_FEE_HEADROOM_TINYBARS, OBSERVED_KEEPER_GAS, TINYBAR_TO_WEIBAR } from "~~/utils/tidepool/constants";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatAmount } from "~~/utils/tidepool/math";

type Feedback = ReturnType<typeof useTxFeedback>;

const KeeperAction = ({
  title,
  description,
  status,
  feedback,
  buttonLabel,
  disabledReason,
  observedGas,
  onRun,
  result,
}: {
  title: string;
  description: string;
  status: ActionStatus;
  feedback: Feedback;
  buttonLabel: string;
  disabledReason?: string;
  observedGas: string;
  onRun: () => void;
  result?: ReactNode;
}) => (
  <div className="flex flex-col gap-3 rounded-box border border-base-300 p-4">
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-xs text-base-content/60">{description}</p>
    </div>
    <ul className="flex flex-col gap-2" aria-label={`${title} conditions`}>
      {status.checks.map(check => (
        <li key={check.label} className="flex items-start gap-2 text-sm">
          <StatusBadge status={check.status} />
          <span className="min-w-0">
            <span className="font-medium">{check.label}</span>
            {check.detail && <span className="block text-xs text-base-content/60">{check.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
    <p className="text-xs text-base-content/60">
      Gas limit {GAS.keeper.toLocaleString()} (fixed); used on testnet: {observedGas}.
    </p>
    <button
      type="button"
      className="btn btn-outline"
      disabled={!status.ready || Boolean(disabledReason) || feedback.busy}
      onClick={onRun}
    >
      {feedback.busy && <span className="loading loading-spinner loading-sm" />}
      {buttonLabel}
    </button>
    {!feedback.busy && (disabledReason || status.reason) && (
      <p className="-mt-1 text-xs text-base-content/60">Unavailable: {disabledReason ?? status.reason}</p>
    )}
    <TxFeedback state={feedback.state} />
    {feedback.state.status === "success" && result}
  </div>
);

/**
 * Keeper actions: permissionless maintenance any account can trigger. They do not change anyone's share balance;
 * the caller pays SaucerSwap's HBAR position fee (the vault refunds the headroom) and the gas.
 */
export const KeeperPanel = ({ vault }: { vault: VaultState }) => {
  const gate = useWalletGate();
  const quotes = useKeeperQuotes(vault);
  const status = useKeeperStatus(vault, quotes);
  // compound() and rebalance() can mint a SaucerSwap position, which eth_call/eth_estimateGas cannot simulate on
  // Hedera (INVALID_NFT_ID). So these two writes skip the scaffold's pre-send simulation and use a fixed gas
  // limit; the read-only checks in useKeeperStatus gate the buttons instead. Deposit and withdraw still simulate.
  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: vault.config.contractName,
    disableSimulate: true,
  });
  const compoundFeedback = useTxFeedback(vault.abi);
  const rebalanceFeedback = useTxFeedback(vault.abi);
  const busy = compoundFeedback.busy || rebalanceFeedback.busy;

  const required =
    quotes.value !== undefined && quotes.maxGasCost !== undefined ? quotes.value + quotes.maxGasCost : undefined;
  const lowBalance = quotes.walletBalance !== undefined && required !== undefined && quotes.walletBalance < required;
  const walletReason = gate.reason ?? (quotes.value === undefined ? "Waiting for the position-fee quote." : undefined);

  const run = async (functionName: "compound" | "rebalance", feedback: Feedback, label: string) => {
    await feedback.run(label, ({ step, sent }) => {
      step("Confirm in your wallet…");
      return writeContractAsync({ functionName, value: quotes.value, gas: GAS.keeper }, { onSuccess: sent });
    });
    await Promise.all([vault.refetch(), quotes.refetch()]);
  };

  const positionNow =
    vault.hasPosition && vault.positionSerial !== undefined ? (
      <p className="text-xs">
        Position now: LP NFT{" "}
        {vault.positionNft ? (
          <ExternalLink href={hashscan.nft(vault.positionNft, vault.positionSerial)}>
            #{vault.positionSerial.toString()}
          </ExternalLink>
        ) : (
          `#${vault.positionSerial}`
        )}
        , ticks [{vault.tickLower}, {vault.tickUpper}), liquidity {formatAmount(vault.liquidity, 0)}.
      </p>
    ) : null;

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Keeper actions <span className="badge badge-ghost badge-sm">Permissionless</span>
        </span>
      }
      subtitle="Maintenance anyone can trigger. It does not change your shares; the caller pays the position fee and gas."
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-base-content/60">SaucerSwap position fee</div>
            <div className="font-mono">
              {quotes.feeTinybars === undefined
                ? (quotes.feeError ?? "…")
                : `${formatAmount(quotes.feeTinybars, 8)} HBAR`}
            </div>
          </div>
          <div>
            <div className="text-xs text-base-content/60">HBAR sent with the call</div>
            <div className="font-mono">
              {quotes.value === undefined ? "…" : `${formatAmount(quotes.value, 18)} HBAR`}
            </div>
            <div className="text-[11px] text-base-content/50">
              Fee + {formatAmount(KEEPER_FEE_HEADROOM_TINYBARS * TINYBAR_TO_WEIBAR, 18)} HBAR headroom; the vault
              refunds the unused part.
            </div>
          </div>
          <div>
            <div className="text-xs text-base-content/60">Max gas cost at the limit</div>
            <div className="font-mono">
              {quotes.maxGasCost === undefined ? "…" : `${formatAmount(quotes.maxGasCost, 18, 4)} HBAR`}
            </div>
            <div className="text-[11px] text-base-content/50">Upper bound at the current gas price.</div>
          </div>
        </div>
        {lowBalance && (
          <p className="rounded-box border border-warning/50 bg-warning/10 px-3 py-2 text-xs">
            Your wallet holds {formatAmount(quotes.walletBalance, 18, 4)} HBAR, less than the HBAR sent plus the maximum
            gas cost. The transaction may be rejected.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <KeeperAction
            title={vault.hasPosition === false ? "Compound (opens the position)" : "Compound"}
            description="Collects fees, swaps idle tokens to the range's ratio and adds them to the position."
            status={status.compound}
            feedback={compoundFeedback}
            buttonLabel={vault.hasPosition === false ? "Open position" : "Compound"}
            disabledReason={
              walletReason ?? (busy && !compoundFeedback.busy ? "Another action is in progress." : undefined)
            }
            observedGas={OBSERVED_KEEPER_GAS.compound}
            onRun={() => run("compound", compoundFeedback, vault.hasPosition === false ? "Open position" : "Compound")}
            result={positionNow}
          />
          <KeeperAction
            title="Rebalance"
            description="When the TWAP has left the range: withdraws everything and mints a new position centred on the TWAP."
            status={status.rebalance}
            feedback={rebalanceFeedback}
            buttonLabel="Rebalance"
            disabledReason={
              walletReason ?? (busy && !rebalanceFeedback.busy ? "Another action is in progress." : undefined)
            }
            observedGas={OBSERVED_KEEPER_GAS.rebalance}
            onRun={() => run("rebalance", rebalanceFeedback, "Rebalance")}
            result={positionNow}
          />
        </div>
        <p className="text-xs text-base-content/60">
          These calls cannot be simulated on Hedera before sending (a SaucerSwap position mint returns INVALID_NFT_ID in
          eth_call), so the dashboard checks the contract&apos;s conditions from on-chain reads instead. If the state
          changes between the check and execution, the contract reverts and only gas is charged.
        </p>
      </div>
    </Panel>
  );
};
