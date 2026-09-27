import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/20/solid";
import type { CheckStatus } from "~~/hooks/tidepool/useKeeperStatus";
import type { TxFeedbackState } from "~~/hooks/tidepool/useTxFeedback";
import { hashscan } from "~~/utils/tidepool/hashscan";

/** Shared visual primitives for the Tidepool dashboard. Presentation only. */

export const ExternalLink = ({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) => (
  <a
    className={`inline-flex items-center gap-0.5 hover:text-base-content hover:underline ${className}`}
    href={href}
    target="_blank"
    rel="noreferrer"
  >
    {children}
    <ArrowUpRightIcon className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
  </a>
);

/** A flat surface with an optional title row. */
export const Card = ({
  title,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`rounded-xl border border-base-300 bg-base-100 p-4 sm:p-6 ${className}`}>
    {(title || actions) && (
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {title && <h2 className="m-0 text-base font-semibold leading-6">{title}</h2>}
        {actions}
      </header>
    )}
    {children}
  </section>
);

/** A short label over a value. */
export const Stat = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <div className="min-w-0">
    <div className="text-xs text-base-content/55">{label}</div>
    <div className="tp-num mt-1 truncate text-sm font-medium text-base-content">{children}</div>
  </div>
);

/** An amount with its token symbol set smaller. */
export const TokenAmount = ({
  amount,
  symbol,
  className = "",
}: {
  amount: string;
  symbol?: string;
  className?: string;
}) => (
  <span className={`tp-num inline-flex items-baseline gap-1 ${className}`}>
    <span>{amount}</span>
    {symbol && <span className="text-[0.75em] font-normal text-base-content/55">{symbol}</span>}
  </span>
);

export const Skeleton = ({ className = "h-4 w-24" }: { className?: string }) => (
  <span className={`inline-block animate-pulse rounded bg-base-300/70 ${className}`} aria-hidden />
);

type Tone = "success" | "warning" | "error" | "neutral" | "accent";

const TONES: Record<Tone, { text: string; dot: string; ring: string }> = {
  success: { text: "text-success", dot: "bg-success", ring: "border-success/30 bg-success/10" },
  warning: { text: "text-warning", dot: "bg-warning", ring: "border-warning/30 bg-warning/10" },
  error: { text: "text-error", dot: "bg-error", ring: "border-error/30 bg-error/10" },
  neutral: { text: "text-base-content/65", dot: "bg-base-content/40", ring: "border-base-300 bg-base-200" },
  accent: { text: "text-primary", dot: "bg-primary", ring: "border-primary/30 bg-primary/10" },
};

/** A small state indicator: dot + label. */
export const StatePill = ({
  tone,
  children,
  className = "",
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone].ring} ${TONES[tone].text} ${className}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${TONES[tone].dot}`} aria-hidden />
    {children}
  </span>
);

const CHECK_TONE: Record<CheckStatus, { tone: Tone; text: string }> = {
  ok: { tone: "success", text: "OK" },
  warn: { tone: "warning", text: "Note" },
  blocked: { tone: "error", text: "Blocked" },
  loading: { tone: "neutral", text: "Checking" },
};

/** Status of one keeper condition. */
export const StatusBadge = ({ status }: { status: CheckStatus }) => (
  <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs ${TONES[CHECK_TONE[status].tone].text}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${TONES[CHECK_TONE[status].tone].dot}`} aria-hidden />
    {CHECK_TONE[status].text}
  </span>
);

/** Inline result of a card's transaction flow. The toast shows the same, briefly. */
export const TxFeedback = ({ state }: { state: TxFeedbackState }) => {
  switch (state.status) {
    case "idle":
      return null;
    case "running":
      return (
        <div className="flex items-center gap-2 rounded-lg bg-base-200 px-3 py-2 text-sm" role="status">
          <span className="loading loading-spinner loading-xs text-primary" />
          <span className="text-base-content/80">{state.step}</span>
        </div>
      );
    case "success":
      return (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm"
          role="status"
        >
          <span className="text-success">{state.label} confirmed.</span>
          {state.hash && (
            <ExternalLink className="text-xs text-base-content/65" href={hashscan.tx(state.hash)}>
              HashScan
            </ExternalLink>
          )}
        </div>
      );
    case "cancelled":
      return (
        <div className="rounded-lg bg-base-200 px-3 py-2 text-sm text-base-content/65" role="status">
          Cancelled in the wallet. Nothing was sent.
        </div>
      );
    case "failed":
      return (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm" role="alert">
          <p className="text-base-content/85">{state.message}</p>
          {state.hash && (
            <ExternalLink className="mt-1 text-xs text-base-content/65" href={hashscan.tx(state.hash)}>
              HashScan
            </ExternalLink>
          )}
        </div>
      );
  }
};
