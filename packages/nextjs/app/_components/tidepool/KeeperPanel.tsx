import type { ReactNode } from "react";
import { LoopStage } from "~~/app/_components/tidepool/Loop";
import { SuccessSignal } from "~~/app/_components/tidepool/TxRail";
import { ExternalLink, StatePill, StatusBadge, TxFeedback } from "~~/app/_components/tidepool/ui";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { type ActionStatus, useKeeperQuotes, useKeeperStatus } from "~~/hooks/tidepool/useKeeperStatus";
import { useTxFeedback } from "~~/hooks/tidepool/useTxFeedback";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { useWalletGate } from "~~/hooks/tidepool/useWalletGate";
import { GAS, KEEPER_FEE_HEADROOM_TINYBARS, OBSERVED_KEEPER_GAS, TINYBAR_TO_WEIBAR } from "~~/utils/tidepool/constants";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatAmount } from "~~/utils/tidepool/math";

type Feedback = ReturnType<typeof useTxFeedback>;

type TxPhase = "wallet" | "pending" | "confirmed" | "failed" | "cancelled";

/** Maps the existing feedback state to the transaction's real phase (nothing is simulated or assumed). */
function phaseOf(state: Feedback["state"]): TxPhase | null {
  switch (state.status) {
    case "running":
      return state.step.startsWith("Pending") ? "pending" : "wallet";
    case "success":
      return "confirmed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

/** Wallet request → Pending on Hedera → Confirmed / Failed / Cancelled. */
const TxStates = ({ state }: { state: Feedback["state"] }) => {
  const phase = phaseOf(state);
  if (!phase) return null;
  const endLabel = phase === "failed" ? "Failed" : phase === "cancelled" ? "Cancelled" : "Confirmed";
  const steps: { label: string; status: "done" | "active" | "todo" | "bad" | "neutral" }[] = [
    { label: "Wallet request", status: phase === "wallet" ? "active" : phase === "cancelled" ? "neutral" : "done" },
    {
      label: "Pending on Hedera",
      status: phase === "pending" ? "active" : phase === "wallet" || phase === "cancelled" ? "todo" : "done",
    },
    {
      label: endLabel,
      status: phase === "confirmed" ? "done" : phase === "failed" ? "bad" : phase === "cancelled" ? "neutral" : "todo",
    },
  ];
  return (
    <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0" aria-label="Transaction status">
      {steps.map(step => (
        <li key={step.label} className="min-w-0">
          <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-500 ${
                step.status === "active"
                  ? "w-full tp-rail-active"
                  : step.status === "done"
                    ? "w-full bg-[#3ee0c5]/70"
                    : step.status === "bad"
                      ? "w-full bg-error/80"
                      : step.status === "neutral"
                        ? "w-full bg-white/20"
                        : "w-0"
              }`}
            />
          </div>
          <div
            key={step.status}
            className={`tp-pill-in mt-2 truncate text-[11px] ${
              step.status === "active"
                ? "text-base-content"
                : step.status === "done"
                  ? "text-[#3ee0c5]/85"
                  : step.status === "bad"
                    ? "text-error"
                    : "text-base-content/45"
            }`}
          >
            {step.label}
          </div>
        </li>
      ))}
    </ol>
  );
};

const Arrow = ({ down = false }: { down?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className={`h-5 w-5 text-base-content/25 ${down ? "rotate-90" : ""}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden
  >
    <path d="M4 12h15m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Conditions → action → result, for one keeper action. The button and its guards are unchanged. */
const KeeperFlow = ({
  title,
  readySummary,
  status,
  feedback,
  buttonLabel,
  disabledReason,
  observedGas,
  onRun,
  result,
}: {
  title: string;
  /** What the action will do when every condition is met. */
  readySummary: string;
  status: ActionStatus;
  feedback: Feedback;
  buttonLabel: string;
  disabledReason?: string;
  observedGas: string;
  onRun: () => void;
  result: ReactNode;
}) => {
  // Headline derived from the same checks that gate the button: nothing here is assumed.
  const checking = !status.ready && status.checks.some(check => check.status === "loading");
  const met = status.checks.filter(check => check.status === "ok" || check.status === "warn").length;
  const headline = status.ready
    ? { tone: "success" as const, text: "Ready", line: readySummary }
    : checking
      ? { tone: "neutral" as const, text: "Checking", line: "Reading the vault and pool state…" }
      : { tone: "warning" as const, text: "Not ready", line: status.reason ?? "" };
  const blocking = status.checks.filter(check => check.status === "blocked");
  // Why the button is disabled, in plain words (same inputs as its `disabled` expression).
  const why = feedback.busy
    ? undefined
    : !status.ready
      ? checking
        ? "Disabled while the conditions are being checked."
        : `Disabled until ${blocking.length === 1 ? "the blocked gate opens" : `${blocking.length} blocked gates open`}.`
      : disabledReason
        ? `Disabled: ${disabledReason}`
        : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1fr)] xl:items-start">
        {/* Conditions */}
        <div>
          <div className="tp-eyebrow mb-4 flex items-center justify-between">
            <span>Conditions</span>
            <span className="tp-num text-base-content/40">
              {met}/{status.checks.length} open
            </span>
          </div>
          <div className="relative pl-7">
            <span className="absolute bottom-3 left-[9px] top-3 w-px bg-white/[0.08]" aria-hidden />
            {status.ready && (
              <span
                className="tp-gate-stream-v absolute bottom-3 left-[8.5px] top-3 w-[2px] rounded-full"
                aria-hidden
              />
            )}
            <ol
              className="m-0 flex list-none flex-col gap-3 p-0"
              aria-label={`${title} conditions: ${met} of ${status.checks.length} met`}
            >
              {status.checks.map(check => {
                const open = check.status === "ok" || check.status === "warn";
                return (
                  <li key={check.label} className="relative text-sm">
                    <span
                      className={`absolute -left-7 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[10px] transition-colors duration-500 ${
                        check.status === "ok"
                          ? "border-success/40 bg-[#0d1a14] text-success"
                          : check.status === "warn"
                            ? "border-warning/40 bg-[#1c170c] text-warning"
                            : check.status === "blocked"
                              ? "border-error/50 bg-[#1f0f10] text-error"
                              : "border-white/15 bg-[#0d0f14] text-base-content/40"
                      }`}
                      aria-hidden
                    >
                      {check.status === "ok"
                        ? "✓"
                        : check.status === "warn"
                          ? "!"
                          : check.status === "blocked"
                            ? "×"
                            : "·"}
                    </span>
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={open ? "text-base-content/80" : "text-base-content"}>{check.label}</span>
                      <StatusBadge status={check.status} />
                    </span>
                    {check.detail && (check.status !== "ok" || status.ready) && (
                      <span
                        className={`mt-0.5 block text-xs leading-snug ${
                          check.status === "blocked" ? "text-base-content/65" : "text-base-content/40"
                        }`}
                      >
                        {check.detail}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="hidden pt-16 xl:block">
          <Arrow />
        </div>

        {/* Action */}
        <div
          className={`tp-card relative flex flex-col gap-4 rounded-2xl border p-5 ${
            status.ready ? "border-[#3ee0c5]/25 bg-[#3ee0c5]/[0.03]" : "border-white/[0.07] bg-black/25"
          }`}
        >
          <SuccessSignal state={feedback.state} />
          <div className="flex items-center justify-between gap-3">
            <div className="tp-eyebrow">Action</div>
            <StatePill tone={headline.tone}>{headline.text}</StatePill>
          </div>
          <p className={`text-sm leading-relaxed ${status.ready ? "text-base-content/85" : "text-base-content/60"}`}>
            {headline.line}
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className={`btn tp-cta h-12 w-full rounded-xl text-[15px] font-medium shadow-none ${
                status.ready ? "btn-primary" : "border-white/[0.08] bg-white/[0.04]"
              }`}
              disabled={!status.ready || Boolean(disabledReason) || feedback.busy}
              onClick={onRun}
            >
              {feedback.busy && <span className="loading loading-spinner loading-sm" />}
              {buttonLabel}
            </button>
            {why && <p className="text-center text-xs text-base-content/55">{why}</p>}
            {why && !status.ready && disabledReason && (
              <p className="-mt-1 text-center text-xs text-base-content/40">{disabledReason}</p>
            )}
          </div>
          <TxStates state={feedback.state} />
          <TxFeedback state={feedback.state} />
          <p className="text-[11px] text-base-content/40">
            Gas limit <span className="tp-num">{GAS.keeper.toLocaleString()}</span> (fixed, no simulation); used on
            testnet: <span className="tp-num">{observedGas}</span>.
          </p>
        </div>
      </div>

      {/* Result */}
      <div className="flex items-start gap-4">
        <div className="pt-0.5">
          <Arrow down />
        </div>
        <div className="min-w-0 flex-1">
          <div className="tp-eyebrow mb-2">Result</div>
          {result}
        </div>
      </div>
    </div>
  );
};

/** The last Rebalance the vault recorded (from its own event), drawn old range → new range on one axis. */
const LastRebalance = ({ vault }: { vault: VaultState }) => {
  const { data: events } = useVaultActivity(vault.address, vault.abi);
  const event = events?.find(e => e.name === "Rebalance");
  if (!event) return <p className="text-sm text-base-content/50">No rebalance in the recent activity.</p>;
  const n = (v: unknown) => (typeof v === "number" ? v : Number(v));
  const oldLo = n(event.args.oldTickLower);
  const oldHi = n(event.args.oldTickUpper);
  const newLo = n(event.args.newTickLower);
  const newHi = n(event.args.newTickUpper);
  const opened = oldLo === 0 && oldHi === 0;
  const lo = Math.min(newLo, ...(opened ? [] : [oldLo]));
  const hi = Math.max(newHi, ...(opened ? [] : [oldHi]));
  const pad = Math.max(10, (hi - lo) * 0.15);
  const x = (t: number) => ((t - (lo - pad)) / (hi + pad - (lo - pad))) * 100;
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-base-content/55">
        <span>
          Last {opened ? "position opening" : "rebalance"} ·{" "}
          <ExternalLink href={hashscan.tx(event.transactionHash)}>
            {new Date(event.timestamp * 1000).toLocaleString()}
          </ExternalLink>
        </span>
        <span className="tp-num">
          TWAP tick {String(event.args.twapTick)} · LP NFT #{String(event.args.newPositionSerial)}
        </span>
      </div>
      <div className="relative mt-4 h-16">
        {!opened && (
          <div
            className="absolute top-1 h-5 rounded-sm border border-dashed border-white/40 bg-white/[0.03]"
            style={{ left: `${x(oldLo)}%`, width: `${x(oldHi) - x(oldLo)}%` }}
          >
            <span className="tp-num absolute -top-4 left-0 whitespace-nowrap text-[10px] text-base-content/45">
              [{oldLo}, {oldHi})
            </span>
          </div>
        )}
        <div
          className="absolute bottom-1 h-5 rounded-sm border border-[#8fa3ff]/80 bg-[#6e7bff]/15"
          style={{ left: `${x(newLo)}%`, width: `${x(newHi) - x(newLo)}%` }}
        >
          <span className="tp-num absolute -bottom-4 left-0 whitespace-nowrap text-[10px] text-[#c9d2ff]">
            [{newLo}, {newHi})
          </span>
        </div>
      </div>
      <p className="mt-9 text-[11px] text-base-content/45">
        {opened
          ? "The range this event opened, in ticks (from the event)."
          : "Dashed = previous range, solid = new range, in ticks (from the event)."}
      </p>
    </div>
  );
};

/**
 * Loop stages 04 COMPOUND and 05 REBALANCE: permissionless maintenance any account can trigger. They do not change
 * anyone's share balance; the caller pays SaucerSwap's HBAR position fee (the vault refunds the headroom) and the gas.
 */
export const KeepStages = ({ vault }: { vault: VaultState }) => {
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

  const positionNow =
    vault.hasPosition && vault.positionSerial !== undefined ? (
      <p className="tp-num text-xs text-base-content/60">
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

  const idleLine =
    vault.hasPosition === false ? (
      <p className="text-sm text-base-content/70">
        Opens the vault&apos;s first position, centred on the TWAP, with{" "}
        <span className="tp-num">{formatAmount(vault.total0, vault.decimals0)}</span> {vault.symbol0} +{" "}
        <span className="tp-num">{formatAmount(vault.total1, vault.decimals1)}</span> {vault.symbol1}.
      </p>
    ) : (
      <p className="text-sm text-base-content/70">
        Adds the idle <span className="tp-num">{formatAmount(vault.idle0, vault.decimals0)}</span> {vault.symbol0} +{" "}
        <span className="tp-num">{formatAmount(vault.idle1, vault.decimals1)}</span> {vault.symbol1}, plus any fees
        collected when it runs, to LP NFT #{vault.positionSerial?.toString() ?? "–"}.
      </p>
    );

  return (
    <>
      <LoopStage
        index="04"
        name="Compound"
        title="Put the fees back to work."
        lead="Collects fees, swaps idle tokens to the range's ratio and adds everything to the position. Permissionless: anyone can call it, it changes no one's shares, and the caller pays the position fee and gas."
        aside={<StatePill tone="accent">Permissionless</StatePill>}
      >
        <KeeperFlow
          title={vault.hasPosition === false ? "Open position" : "Compound"}
          readySummary={
            vault.hasPosition === false
              ? "The vault can open its first position, centred on the TWAP."
              : "Fees and idle tokens can be added to the position."
          }
          status={status.compound}
          feedback={compoundFeedback}
          buttonLabel={vault.hasPosition === false ? "Open position" : "Compound"}
          disabledReason={
            walletReason ?? (busy && !compoundFeedback.busy ? "Another action is in progress." : undefined)
          }
          observedGas={OBSERVED_KEEPER_GAS.compound}
          onRun={() => run("compound", compoundFeedback, vault.hasPosition === false ? "Open position" : "Compound")}
          result={compoundFeedback.state.status === "success" && positionNow ? positionNow : idleLine}
        />
      </LoopStage>

      <LoopStage
        index="05"
        name="Rebalance"
        title="Follow the price."
        lead="When the TWAP leaves the range, anyone can re-centre it: the vault withdraws everything and mints a new position centred on the TWAP. Guarded by the cooldown and the price guard."
        aside={<StatePill tone="accent">Permissionless</StatePill>}
        last
      >
        <div className="flex flex-col gap-8">
          <KeeperFlow
            title="Rebalance"
            readySummary={`The TWAP has left the range; the position can be re-centred on it (± ${vault.halfWidth ?? "–"} ticks).`}
            status={status.rebalance}
            feedback={rebalanceFeedback}
            buttonLabel="Rebalance"
            disabledReason={
              walletReason ?? (busy && !rebalanceFeedback.busy ? "Another action is in progress." : undefined)
            }
            observedGas={OBSERVED_KEEPER_GAS.rebalance}
            onRun={() => run("rebalance", rebalanceFeedback, "Rebalance")}
            result={
              rebalanceFeedback.state.status === "success" && positionNow ? (
                positionNow
              ) : (
                <LastRebalance vault={vault} />
              )
            }
          />

          <div className="grid grid-cols-1 gap-4 border-t border-white/[0.07] pt-6 text-sm sm:grid-cols-3">
            <div>
              <div className="tp-eyebrow">SaucerSwap position fee</div>
              <div className="tp-num mt-1">
                {quotes.feeTinybars === undefined
                  ? (quotes.feeError ?? "…")
                  : `${formatAmount(quotes.feeTinybars, 8)} HBAR`}
              </div>
            </div>
            <div>
              <div className="tp-eyebrow">HBAR sent with the call</div>
              <div className="tp-num mt-1">
                {quotes.value === undefined ? "…" : `${formatAmount(quotes.value, 18)} HBAR`}
              </div>
              <div className="mt-0.5 text-[11px] text-base-content/40">
                Fee + {formatAmount(KEEPER_FEE_HEADROOM_TINYBARS * TINYBAR_TO_WEIBAR, 18)} HBAR headroom; the vault
                refunds the unused part.
              </div>
            </div>
            <div>
              <div className="tp-eyebrow">Max gas cost at the limit</div>
              <div className="tp-num mt-1">
                {quotes.maxGasCost === undefined ? "…" : `${formatAmount(quotes.maxGasCost, 18, 4)} HBAR`}
              </div>
              <div className="mt-0.5 text-[11px] text-base-content/40">Upper bound at the current gas price.</div>
            </div>
          </div>
          {lowBalance && (
            <p className="rounded-xl border border-warning/20 bg-warning/[0.05] px-4 py-3 text-xs text-base-content/75">
              Your wallet holds {formatAmount(quotes.walletBalance, 18, 4)} HBAR, less than the HBAR sent plus the
              maximum gas cost. The transaction may be rejected.
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-base-content/40">
            Compound and rebalance cannot be simulated on Hedera before sending (a SaucerSwap position mint returns
            INVALID_NFT_ID in eth_call), so the dashboard checks the contract&apos;s conditions from on-chain reads
            instead. If the state changes between the check and execution, the contract reverts and only gas is charged.
          </p>
        </div>
      </LoopStage>
    </>
  );
};
