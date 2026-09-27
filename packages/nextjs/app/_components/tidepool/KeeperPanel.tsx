import { Card, StatusBadge, TxFeedback } from "~~/app/_components/tidepool/ui";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { type ActionStatus, useKeeperQuotes, useKeeperStatus } from "~~/hooks/tidepool/useKeeperStatus";
import { useTxFeedback } from "~~/hooks/tidepool/useTxFeedback";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { useWalletGate } from "~~/hooks/tidepool/useWalletGate";
import { GAS } from "~~/utils/tidepool/constants";
import { formatAmount } from "~~/utils/tidepool/math";

type Feedback = ReturnType<typeof useTxFeedback>;

/** One keeper action: status line, button, fee and gas limit, and the collapsed conditions checklist. */
const KeeperAction = ({
  title,
  status,
  feedback,
  buttonLabel,
  disabledReason,
  feeLine,
  onRun,
}: {
  title: string;
  status: ActionStatus;
  feedback: Feedback;
  buttonLabel: string;
  disabledReason?: string;
  feeLine: string;
  onRun: () => void;
}) => {
  const checking = !status.ready && status.checks.some(check => check.status === "loading");
  const blocked = status.checks.some(check => check.status === "blocked");
  const met = status.checks.filter(check => check.status === "ok" || check.status === "warn").length;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-sm font-semibold">{title}</h3>
        <span className="tp-num text-xs text-base-content/55">
          {met}/{status.checks.length} conditions
        </span>
      </div>
      <p className="line-clamp-2 min-h-10 text-sm" role="status">
        {status.ready ? (
          <span className="text-success">Ready</span>
        ) : checking && !blocked ? (
          <span className="text-base-content/60">Checking…</span>
        ) : (
          <>
            <span className="text-error">Blocked: </span>
            <span className="text-base-content/75">{status.reason}</span>
          </>
        )}
      </p>
      <button
        type="button"
        className="btn btn-primary h-10 w-full rounded-lg text-sm font-medium shadow-none"
        disabled={!status.ready || Boolean(disabledReason) || feedback.busy}
        onClick={onRun}
      >
        {feedback.busy && <span className="loading loading-spinner loading-sm" />}
        {buttonLabel}
      </button>
      {status.ready && disabledReason && !feedback.busy && (
        <p className="-mt-1 text-center text-xs text-base-content/55">{disabledReason}</p>
      )}
      <p className="tp-num text-xs text-base-content/55">{feeLine}</p>
      <TxFeedback state={feedback.state} />
      <details className="tp-details rounded-lg border border-base-300">
        <summary className="flex items-center justify-between px-3 py-2 text-sm text-base-content/75 hover:text-base-content">
          Conditions
          <span className="tp-chevron text-base-content/50" aria-hidden>
            ▾
          </span>
        </summary>
        <ul className="m-0 flex list-none flex-col gap-2 border-t border-base-300 p-3">
          {status.checks.map(check => (
            <li key={check.label} className="text-sm">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-base-content/85">{check.label}</span>
                <StatusBadge status={check.status} />
              </span>
              {check.detail && check.status !== "ok" && check.status !== "loading" && (
                <span className="mt-0.5 block text-xs text-base-content/55">{check.detail}</span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
};

/**
 * Compound and rebalance: permissionless maintenance any account can trigger. They do not change anyone's share
 * balance; the caller pays SaucerSwap's HBAR position fee (the vault refunds the headroom) and the gas.
 */
export const KeeperCard = ({ vault }: { vault: VaultState }) => {
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
      return writeContractAsync(
        { functionName, value: quotes.value, gas: GAS.keeper },
        {
          onSuccess: hash => {
            sent(hash);
            step("Pending on Hedera — waiting for the receipt…");
          },
        },
      );
    });
    await Promise.all([vault.refetch(), quotes.refetch()]);
  };

  const fee =
    quotes.feeTinybars === undefined
      ? quotes.feeError
        ? "unavailable"
        : "…"
      : `${formatAmount(quotes.feeTinybars, 8)} HBAR`;
  const feeLine = `Fee ${fee} · gas limit ${GAS.keeper.toLocaleString()}`;
  const compoundLabel = vault.hasPosition === false ? "Open position" : "Compound";

  return (
    <Card title="Keeper" actions={<span className="text-xs text-base-content/55">Anyone can call</span>}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <KeeperAction
          title={compoundLabel}
          status={status.compound}
          feedback={compoundFeedback}
          buttonLabel={compoundLabel}
          disabledReason={
            walletReason ?? (busy && !compoundFeedback.busy ? "Another action is in progress." : undefined)
          }
          feeLine={feeLine}
          onRun={() => run("compound", compoundFeedback, compoundLabel)}
        />
        <KeeperAction
          title="Rebalance"
          status={status.rebalance}
          feedback={rebalanceFeedback}
          buttonLabel="Rebalance"
          disabledReason={
            walletReason ?? (busy && !rebalanceFeedback.busy ? "Another action is in progress." : undefined)
          }
          feeLine={feeLine}
          onRun={() => run("rebalance", rebalanceFeedback, "Rebalance")}
        />
      </div>
      {lowBalance && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-base-content/80">
          Low HBAR: {formatAmount(quotes.walletBalance, 18, 4)} may not cover fee + gas
        </p>
      )}
    </Card>
  );
};
