import type { CSSProperties, ReactNode } from "react";
import { Eyebrow, GradientText } from "~~/components/pulse";

/**
 * The top of an inner page: eyebrow, a headline with one gradient phrase, a subline, optional actions. The headline
 * lines rise out of a mask and the rest fades up, like the other pages (.tp-line / .tp-in in globals.css).
 */
export const PageHero = ({
  eyebrow,
  title,
  accent,
  children,
  actions,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  /** The gradient phrase, placed after `title`. */
  accent?: string;
  children?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) => (
  <section className="relative isolate overflow-x-clip">
    <div className={`mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-12 ${compact ? "pb-8 pt-12" : "pb-12 pt-16 sm:pt-20"}`}>
      <div className="tp-in">
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h1
        className={`m-0 mt-4 max-w-4xl font-bold leading-[1.02] tracking-[-0.04em] text-fg ${
          compact ? "text-[clamp(32px,4vw,52px)]" : "text-[clamp(40px,5vw,72px)]"
        }`}
      >
        <span className="tp-line">
          <span style={{ "--d": 80 } as CSSProperties}>{title}</span>
        </span>
        {accent && (
          <span className="tp-line">
            <span style={{ "--d": 200 } as CSSProperties}>
              <GradientText>{accent}</GradientText>
            </span>
          </span>
        )}
      </h1>
      {children && (
        <div
          className="tp-in mt-5 max-w-2xl text-[17px] leading-relaxed text-muted"
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
  </section>
);
