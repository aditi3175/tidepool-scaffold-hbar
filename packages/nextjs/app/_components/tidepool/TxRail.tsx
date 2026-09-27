"use client";

import { useRef } from "react";
import type { TxFeedbackState } from "~~/hooks/tidepool/useTxFeedback";

type RailStep = {
  label: string;
  /** Already satisfied on chain (for example an allowance that covers the amount), so the flow will skip it. */
  done: boolean;
  /** Text that identifies this step in the flow's existing progress messages ("approving SAUCE", "depositing"). */
  match: string | string[];
};

type Phase = "todo" | "done" | "current" | "failed";

const BAR: Record<Phase, string> = {
  todo: "bg-base-300",
  done: "bg-success",
  current: "bg-primary",
  failed: "bg-error",
};

const TEXT: Record<Phase, string> = {
  todo: "text-base-content/50",
  done: "text-success",
  current: "text-base-content",
  failed: "text-error",
};

const matches = (text: string, match: string | string[]) =>
  (Array.isArray(match) ? match : [match]).some(m => text.toLowerCase().includes(m.toLowerCase()));

/**
 * The transactions a flow sends, as a row of steps. Driven only by the existing feedback state: the step in progress
 * is the one whose `match` appears in the flow's current progress message. `flow` is the label useTxFeedback reports
 * for this flow's success, so other flows sharing the same feedback (e.g. Wrap HBAR) never mark this one done.
 */
export const TxRail = ({ steps, state, flow }: { steps: RailStep[]; state: TxFeedbackState; flow: string }) => {
  const running = state.status === "running";
  const current = running ? steps.findIndex(step => matches(state.step, step.match)) : -1;
  const lastCurrent = useRef(-1);
  if (running && current >= 0) lastCurrent.current = current;
  if (state.status === "idle") lastCurrent.current = -1;
  const succeeded = state.status === "success" && state.label === flow;
  const failedAt = state.status === "failed" ? lastCurrent.current : -1;

  const phaseOf = (step: RailStep, i: number): Phase => {
    if (succeeded) return "done";
    if (running && current >= 0) return i < current ? "done" : i === current ? "current" : step.done ? "done" : "todo";
    if (i === failedAt) return "failed";
    return step.done ? "done" : "todo";
  };

  return (
    <ol
      className="m-0 grid list-none gap-2 p-0"
      style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
      aria-label="Transactions to send"
    >
      {steps.map((step, i) => {
        const phase = phaseOf(step, i);
        return (
          <li key={step.label} className="min-w-0">
            <div className={`h-1 rounded-full ${BAR[phase]}`} />
            <div className={`mt-1 truncate text-xs ${TEXT[phase]}`}>
              {phase === "done" ? "✓ " : phase === "failed" ? "× " : `${i + 1}. `}
              {step.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
