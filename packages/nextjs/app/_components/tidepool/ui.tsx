import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/20/solid";
import { Num, trackPointer, useInViewOnce, useRefreshTick } from "~~/app/_components/tidepool/motion";
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
    className={`inline-flex items-center gap-0.5 underline decoration-white/15 underline-offset-[3px] transition-colors hover:text-base-content hover:decoration-white/40 ${className}`}
    href={href}
    target="_blank"
    rel="noreferrer"
  >
    {children}
    <ArrowUpRightIcon className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
  </a>
);

/** Section container: eyebrow label, title, optional actions, restrained surface. */
export const Panel = ({
  title,
  subtitle,
  eyebrow,
  index,
  actions,
  children,
  className = "",
  style,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  /** Section number shown before the eyebrow ("01"). */
  index?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** `animationDelay` is used as the reveal stagger. */
  style?: CSSProperties;
}) => {
  const [ref, shown] = useInViewOnce<HTMLElement>();
  const { animationDelay, ...rest } = style ?? {};
  return (
    <section
      ref={ref}
      className={`tp-panel tp-reveal ${shown ? "tp-shown" : ""} ${className}`}
      style={{ ...rest, transitionDelay: shown ? undefined : (animationDelay as string | undefined) }}
      onPointerMove={trackPointer}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          {eyebrow && (
            <div className="tp-eyebrow mb-2 flex items-center gap-2">
              {index && <span className="tp-num hidden text-primary/80 lg:inline">{index}</span>}
              {index && <span className="hidden h-px w-5 bg-white/15 lg:inline-block" aria-hidden />}
              {eyebrow}
            </div>
          )}
          <h2 className="tp-display m-0 text-[26px] leading-tight sm:text-[28px]">{title}</h2>
          {subtitle && <p className="mt-1 text-xs leading-relaxed text-base-content/45">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">{children}</div>
    </section>
  );
};

/**
 * A labelled value. `size` sets its weight in the hierarchy; `note` explains where the number comes from or what
 * it excludes, and is kept quiet.
 */
export const Metric = ({
  label,
  value,
  note,
  size = "md",
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  size?: "lg" | "md" | "sm";
}) => (
  <div className="min-w-0">
    <div className="tp-eyebrow">{label}</div>
    <div
      className={`tp-num mt-1.5 break-words text-base-content ${
        size === "lg" ? "text-2xl sm:text-[28px] leading-tight" : size === "md" ? "text-base sm:text-lg" : "text-sm"
      }`}
    >
      {value}
    </div>
    {note && <div className="mt-1 text-[11px] leading-snug text-base-content/40">{note}</div>}
  </div>
);

/** An amount with its token symbol set smaller, like a financial figure. */
export const TokenAmount = ({
  amount,
  symbol,
  className = "",
  id,
}: {
  amount: string;
  symbol?: string;
  className?: string;
  /** Stable metric id: lets the value glide from the previous vault's real value after a vault switch. */
  id?: string;
  /** @deprecated kept for call sites; every amount now glides between real values when it changes. */
  flash?: boolean;
}) => (
  <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
    <Num text={amount} id={id} />
    {symbol && <span className="font-sans text-[0.55em] font-medium tracking-wide text-base-content/45">{symbol}</span>}
  </span>
);

export const Skeleton = ({ className = "h-4 w-24" }: { className?: string }) => (
  <span className={`inline-block animate-pulse rounded-md bg-white/[0.06] ${className}`} aria-hidden />
);

export type Tone = "success" | "warning" | "error" | "neutral" | "accent";

const TONES: Record<Tone, { text: string; dot: string; ring: string }> = {
  success: { text: "text-success", dot: "bg-success", ring: "border-success/25 bg-success/[0.07]" },
  warning: { text: "text-warning", dot: "bg-warning", ring: "border-warning/25 bg-warning/[0.07]" },
  error: { text: "text-error", dot: "bg-error", ring: "border-error/25 bg-error/[0.07]" },
  neutral: { text: "text-base-content/60", dot: "bg-base-content/40", ring: "border-white/10 bg-white/[0.03]" },
  accent: { text: "text-primary", dot: "bg-primary", ring: "border-primary/30 bg-primary/[0.08]" },
};

/** A status dot that pulses once each time the vault data actually refreshes (never on a timer). */
const LiveDot = ({ className }: { className: string }) => {
  const tick = useRefreshTick();
  return (
    <span
      key={tick}
      className={`h-1.5 w-1.5 rounded-full text-current ${className} ${tick > 0 ? "tp-ping" : ""}`}
      aria-hidden
    />
  );
};

/** A small state indicator: dot + label. `live` makes the dot pulse once per real data refresh. */
export const StatePill = ({
  tone,
  children,
  live = false,
  className = "",
}: {
  tone: Tone;
  children: ReactNode;
  live?: boolean;
  className?: string;
}) => (
  <span
    key={tone}
    className={`tp-pill-in inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-500 ${TONES[tone].ring} ${TONES[tone].text} ${className}`}
  >
    {live ? (
      <LiveDot className={TONES[tone].dot} />
    ) : (
      <span className={`h-1.5 w-1.5 rounded-full ${TONES[tone].dot}`} aria-hidden />
    )}
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
  <span
    className={`inline-flex w-[4.5rem] shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider ${TONES[CHECK_TONE[status].tone].text}`}
  >
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
        <div className="tp-inset flex items-center gap-2.5 px-3.5 py-2.5 text-sm" role="status">
          <span className="loading loading-spinner loading-xs text-primary" />
          <span className="text-base-content/80">{state.step}</span>
        </div>
      );
    case "success":
      return (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-success/20 bg-success/[0.06] px-3.5 py-2.5 text-sm"
          role="status"
        >
          <span className="text-success">{state.label} confirmed.</span>
          {state.hash && (
            <ExternalLink className="text-xs text-base-content/60" href={hashscan.tx(state.hash)}>
              View on HashScan
            </ExternalLink>
          )}
        </div>
      );
    case "cancelled":
      return (
        <div className="tp-inset px-3.5 py-2.5 text-sm text-base-content/60" role="status">
          Transaction cancelled in the wallet. Nothing was sent.
        </div>
      );
    case "failed":
      return (
        <div className="rounded-xl border border-error/25 bg-error/[0.06] px-3.5 py-2.5 text-sm" role="alert">
          <p className="text-base-content/85">{state.message}</p>
          {state.hash && (
            <ExternalLink className="mt-1 text-xs text-base-content/60" href={hashscan.tx(state.hash)}>
              Transaction on HashScan
            </ExternalLink>
          )}
        </div>
      );
  }
};
