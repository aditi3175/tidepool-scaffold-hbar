import type { CSSProperties, ReactNode } from "react";

/**
 * "Pulse" building blocks: gradient-bordered tiles, mono labels, the TWAP dial and button styles. Presentation only.
 */

/** A card: a thin teal-tinted border on a slightly raised surface. */
export const Tile = ({
  children,
  className = "",
  innerClassName = "",
  as: Tag = "div",
  style,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  as?: "div" | "section" | "article" | "li";
  style?: CSSProperties;
}) => (
  <Tag className={`tp-card rounded-2xl border border-white/[0.08] bg-surface/40 ${className}`} style={style}>
    <div className={`h-full p-5 ${innerClassName}`}>{children}</div>
  </Tag>
);

/** Small uppercase mono label. */
export const Label = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`font-mono text-[11px] uppercase tracking-[0.14em] text-faint ${className}`}>{children}</div>
);

/** Section eyebrow: a gradient tick and a mono label. */
export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] text-muted">
    <span className="h-px w-6 bg-[linear-gradient(90deg,#2EE6C8,#22D3EE)]" aria-hidden />
    {children}
  </div>
);

/** A dot that pulses when live (neon) or sits still in amber. */
export const LiveDot = ({ ok = true }: { ok?: boolean }) => (
  <span className="relative inline-flex h-2 w-2" aria-hidden>
    {ok && (
      <span className="absolute inline-flex h-full w-full rounded-full bg-neon opacity-60 motion-safe:animate-ping" />
    )}
    <span
      className={`relative inline-flex h-2 w-2 rounded-full ${ok ? "bg-neon shadow-[0_0_8px_#2EE6C8]" : "bg-amber"}`}
    />
  </span>
);

/** The TWAP guard as a half dial: ticks apart over the limit. Amber at the limit. */
export const Arc = ({ value, limit, size = 84 }: { value?: number; limit?: number; size?: number }) => {
  const f = value === undefined || !limit ? 0 : Math.min(1, value / limit);
  const colour = f >= 1 ? "#FFB020" : "#2EE6C8";
  return (
    <svg width={size} height={(size * 48) / 84} viewBox="0 0 84 48" aria-hidden>
      <path
        d="M 8 44 A 34 34 0 0 1 76 44"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 8 44 A 34 34 0 0 1 76 44"
        fill="none"
        stroke={colour}
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${Math.max(0.001, f)} 1`}
        className="tp-sweep"
      />
    </svg>
  );
};

/** Button styles (for Link or button). */
export const btn = {
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-neon px-6 text-[15px] font-semibold text-ink transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0",
  ghost:
    "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neon/25 bg-neon/[0.04] px-6 text-[15px] font-semibold text-fg transition-[color,background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-neon/45 hover:bg-neon/[0.08] active:translate-y-0",
  /** A full-width call to action inside a card (deposit, withdraw, keeper calls); greys out when disabled. */
  action:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neon px-5 text-[15px] font-semibold text-ink transition-[filter,transform,background-color,color] duration-200 enabled:hover:-translate-y-0.5 enabled:hover:brightness-110 enabled:active:translate-y-0 disabled:cursor-not-allowed disabled:border disabled:border-line disabled:bg-raised disabled:text-faint",
  small:
    "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neon/25 bg-neon/[0.05] px-4 text-sm font-medium text-fg transition-colors duration-150 hover:border-neon/45",
};

/** The mark: a small rotated square in the gradient, with a glow. */
export const PulseMark = ({ className = "h-3 w-3" }: { className?: string }) => (
  <span
    className={`inline-block rotate-45 bg-[linear-gradient(135deg,#2EE6C8,#22D3EE)] shadow-[0_0_16px_#2EE6C8] ${className}`}
    aria-hidden
  />
);

/** Gradient text for the one emphasised phrase in a headline. */
export const GradientText = ({ children }: { children: ReactNode }) => (
  <span className="bg-[linear-gradient(90deg,#2EE6C8,#22D3EE)] bg-clip-text text-transparent">{children}</span>
);
