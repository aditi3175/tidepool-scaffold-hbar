import type { CSSProperties, ReactNode } from "react";
import { GradientText } from "~~/components/pulse";

/**
 * The top of an inner page, in the Docs page's type: a small breadcrumb ("Tidepool / eyebrow"), a headline with one
 * gradient phrase, a subline, optional actions, and an optional `aside` beside it on wide screens (below it on narrow
 * ones). The headline rises out of a mask and the rest fades up.
 */
export const PageHero = ({
  eyebrow,
  title,
  accent,
  children,
  actions,
  aside,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  /** The gradient phrase, placed after `title`. */
  accent?: string;
  children?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  compact?: boolean;
}) => (
  <section className="relative isolate overflow-x-clip">
    <div
      className={`mx-auto grid max-w-[1480px] grid-cols-1 gap-x-12 gap-y-8 px-5 sm:px-8 lg:px-12 ${
        aside ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end" : ""
      } ${compact ? "pb-8 pt-12" : "pb-12 pt-16 sm:pt-20"}`}
    >
      <div>
        <div className="tp-in font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          Tidepool <span className="text-white/20">/</span> <span className="text-neon">{eyebrow}</span>
        </div>
        <h1 className="m-0 mt-5 max-w-5xl text-balance text-[clamp(38px,5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-fg">
          <span className="tp-line">
            <span style={{ "--d": 80 } as CSSProperties}>
              {title}
              {accent && (
                <>
                  {" "}
                  <GradientText>{accent}</GradientText>
                </>
              )}
            </span>
          </span>
        </h1>
        {children && (
          <div
            className="tp-in mt-4 max-w-2xl text-[17px] leading-relaxed text-muted"
            style={{ "--d": 380 } as CSSProperties}
          >
            {children}
          </div>
        )}
        {actions && (
          <div className="tp-in mt-8 flex flex-wrap gap-3" style={{ "--d": 480 } as CSSProperties}>
            {actions}
          </div>
        )}
      </div>
      {aside && (
        <div className="tp-in" style={{ "--d": 460 } as CSSProperties}>
          {aside}
        </div>
      )}
    </div>
  </section>
);
