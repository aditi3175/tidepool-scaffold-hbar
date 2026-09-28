import type { ReactNode } from "react";

/**
 * "Pulse" building blocks: gradient-bordered tiles, mono labels, the TWAP dial and button styles. Presentation only.
 */

/** A tile with a hairline gradient border (neon at the top-left, cyan at the bottom-right). */
export const Tile = ({
  children,
  className = "",
  innerClassName = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  as?: "div" | "section" | "article" | "li";
}) => (
  <Tag
    className={`rounded-2xl bg-[linear-gradient(160deg,rgba(0,245,160,0.34),rgba(255,255,255,0.06)_30%,rgba(255,255,255,0.04)_70%,rgba(0,209,255,0.28))] p-px ${className}`}
  >
    <div className={`h-full rounded-[15px] bg-surface p-5 ${innerClassName}`}>{children}</div>
  </Tag>
);

/** Small uppercase mono label. */
export const Label = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`font-mono text-[11px] uppercase tracking-[0.14em] text-faint ${className}`}>{children}</div>
);

/** Section eyebrow: a gradient tick and a mono label. */
export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] text-muted">
    <span className="h-px w-6 bg-[linear-gradient(90deg,#00F5A0,#00D1FF)]" aria-hidden />
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
      className={`relative inline-flex h-2 w-2 rounded-full ${ok ? "bg-neon shadow-[0_0_8px_#00F5A0]" : "bg-amber"}`}
    />
  </span>
);

/** The TWAP guard as a half dial: ticks apart over the limit. Amber at the limit. */
export const Arc = ({ value, limit, size = 84 }: { value?: number; limit?: number; size?: number }) => {
  const f = value === undefined || !limit ? 0 : Math.min(1, value / limit);
  const c = Math.PI * 34;
  const colour = f >= 1 ? "#FFB020" : "#00F5A0";
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
        strokeDasharray={`${Math.max(0.001, f) * c} ${c}`}
        style={{ filter: `drop-shadow(0 0 6px ${colour})` }}
      />
    </svg>
  );
};

/** Button styles (for Link or button). */
export const btn = {
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(90deg,#00F5A0,#00D1FF)] px-6 text-[15px] font-bold text-ink shadow-[0_0_32px_-4px_rgba(0,245,160,0.55)] transition-[filter,transform] duration-150 hover:brightness-110 active:translate-y-px",
  ghost:
    "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 px-6 text-[15px] font-semibold text-fg transition-colors duration-150 hover:border-white/30 hover:bg-white/[0.03]",
  small:
    "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neon/40 bg-neon/10 px-4 text-sm font-semibold text-neon transition-colors duration-150 hover:bg-neon/20",
};

/** The mark: a small rotated square in the gradient, with a glow. */
export const PulseMark = ({ className = "h-3 w-3" }: { className?: string }) => (
  <span
    className={`inline-block rotate-45 bg-[linear-gradient(135deg,#00F5A0,#00D1FF)] shadow-[0_0_16px_#00F5A0] ${className}`}
    aria-hidden
  />
);

/** Gradient text for the one emphasised phrase in a headline. */
export const GradientText = ({ children }: { children: ReactNode }) => (
  <span className="bg-[linear-gradient(90deg,#00F5A0,#00D1FF)] bg-clip-text text-transparent">{children}</span>
);
