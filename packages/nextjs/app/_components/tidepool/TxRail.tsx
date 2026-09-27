"use client";

import { useEffect, useRef } from "react";
import { emitSuccess } from "~~/app/_components/tidepool/motion";
import type { TxFeedbackState } from "~~/hooks/tidepool/useTxFeedback";

export type RailStep = {
  label: string;
  /** Already satisfied on chain (for example an allowance that covers the amount), so the flow will skip it. */
  done: boolean;
  /** Text that identifies this step in the flow's existing progress messages ("approving SAUCE", "depositing"). */
  match: string | string[];
};

type Phase = "todo" | "done" | "current" | "failed" | "success";

const FILL: Record<Phase, string> = {
  todo: "w-0",
  done: "w-full bg-[#3ee0c5]/45",
  current: "w-full tp-rail-active",
  failed: "w-full bg-error/80",
  success: "w-full bg-[linear-gradient(90deg,#6e7bff,#3ee0c5)]",
};

const matches = (text: string, match: string | string[]) =>
  (Array.isArray(match) ? match : [match]).some(m => text.toLowerCase().includes(m.toLowerCase()));

/**
 * Plays the "a transaction just succeeded" signal (the stream glows once) when a new success arrives. Used by every
 * transaction surface; the state itself comes from useTxFeedback and is not changed here.
 */
export const SuccessSignal = ({ state }: { state: TxFeedbackState }) => {
  const key = state.status === "success" ? (state.hash ?? state.label) : null;
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (key && key !== last.current) emitSuccess();
    last.current = key;
  }, [key]);
  return null;
};

/**
 * The transactions a flow sends, as a rail. Driven only by the existing feedback state: the step in progress is the
 * one whose `match` appears in the flow's current progress message. `flow` is the label useTxFeedback reports for
 * this flow's success, so other flows sharing the same feedback (e.g. Wrap HBAR) never light up this rail.
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
    if (succeeded) return "success";
    if (running && current >= 0) return i < current ? "done" : i === current ? "current" : step.done ? "done" : "todo";
    if (i === failedAt) return "failed";
    return step.done ? "done" : "todo";
  };

  return (
    <div className="relative" aria-label="Transactions to send">
      <SuccessSignal state={state} />
      <ol className="m-0 grid list-none gap-2 p-0" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((step, i) => {
          const phase = phaseOf(step, i);
          return (
            <li key={step.label} className="min-w-0">
              <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full transition-[width,background-color] duration-500 ${FILL[phase]}`}
                />
              </div>
              <div
                className={`mt-2 flex items-center gap-1.5 truncate text-[11px] ${
                  phase === "current"
                    ? "text-base-content"
                    : phase === "failed"
                      ? "text-error"
                      : phase === "done" || phase === "success"
                        ? "text-[#3ee0c5]/85"
                        : "text-base-content/45"
                }`}
              >
                <span className="tp-num text-[10px] opacity-70">
                  {phase === "done" || phase === "success" ? "✓" : phase === "failed" ? "×" : i + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {succeeded && (
        <span
          key={state.hash ?? "success"}
          className="tp-ripple pointer-events-none absolute -right-8 -top-12 h-24 w-24 rounded-full border border-[#3ee0c5]/60"
          aria-hidden
        />
      )}
    </div>
  );
};
