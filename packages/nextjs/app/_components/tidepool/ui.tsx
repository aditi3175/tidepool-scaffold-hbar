import type { ReactNode } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import type { CheckStatus } from "~~/hooks/tidepool/useKeeperStatus";
import type { TxFeedbackState } from "~~/hooks/tidepool/useTxFeedback";
import { hashscan } from "~~/utils/tidepool/hashscan";

/** Small shared pieces for the Tidepool dashboard. */

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
    className={`link link-hover inline-flex items-center gap-1 ${className}`}
    href={href}
    target="_blank"
    rel="noreferrer"
  >
    {children}
    <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-60" aria-hidden />
  </a>
);

export const Panel = ({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`rounded-box border border-base-300 bg-base-100 ${className}`}>
    <header className="flex flex-wrap items-start justify-between gap-2 border-b border-base-300 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-base-content/60">{subtitle}</p>}
      </div>
      {actions}
    </header>
    <div className="px-4 py-4 sm:px-5">{children}</div>
  </section>
);

/** A labelled value. `note` explains where the number comes from or what it excludes. */
export const Metric = ({ label, value, note }: { label: ReactNode; value: ReactNode; note?: ReactNode }) => (
  <div className="min-w-0">
    <div className="text-xs text-base-content/60">{label}</div>
    <div className="mt-0.5 font-mono text-sm sm:text-base break-words">{value}</div>
    {note && <div className="mt-0.5 text-[11px] leading-snug text-base-content/50">{note}</div>}
  </div>
);

export const Skeleton = ({ className = "h-4 w-24" }: { className?: string }) => (
  <span className={`inline-block animate-pulse rounded bg-base-300 ${className}`} aria-hidden />
);

const STATUS_STYLES: Record<CheckStatus, { badge: string; text: string }> = {
  ok: { badge: "badge-success", text: "OK" },
  warn: { badge: "badge-warning", text: "Note" },
  blocked: { badge: "badge-error", text: "Blocked" },
  loading: { badge: "badge-ghost", text: "…" },
};

export const StatusBadge = ({ status }: { status: CheckStatus }) => (
  <span className={`badge badge-sm badge-soft ${STATUS_STYLES[status].badge} w-16 shrink-0`}>
    {STATUS_STYLES[status].text}
  </span>
);

/** Inline result of a card's transaction flow. The toast shows the same, briefly. */
export const TxFeedback = ({ state }: { state: TxFeedbackState }) => {
  switch (state.status) {
    case "idle":
      return null;
    case "running":
      return (
        <p className="flex items-center gap-2 text-sm" role="status">
          <span className="loading loading-spinner loading-xs" />
          {state.step}
        </p>
      );
    case "success":
      return (
        <p className="text-sm text-success" role="status">
          {state.label} confirmed.{" "}
          {state.hash && <ExternalLink href={hashscan.tx(state.hash)}>View on HashScan</ExternalLink>}
        </p>
      );
    case "cancelled":
      return (
        <p className="text-sm text-base-content/70" role="status">
          Transaction cancelled in the wallet. Nothing was sent.
        </p>
      );
    case "failed":
      return (
        <div className="rounded-box border border-error/40 bg-error/5 px-3 py-2 text-sm" role="alert">
          <p>{state.message}</p>
          {state.hash && (
            <ExternalLink className="text-xs" href={hashscan.tx(state.hash)}>
              Transaction on HashScan
            </ExternalLink>
          )}
        </div>
      );
  }
};
