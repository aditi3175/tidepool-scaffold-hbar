import type { ReactNode } from "react";
import { Eyebrow, GradientText } from "~~/components/pulse";

/** The top of an inner page: eyebrow, a headline with one gradient phrase, a subline, optional actions. */
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
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1
        className={`m-0 mt-4 max-w-4xl font-bold leading-[1.02] tracking-[-0.04em] text-fg ${
          compact ? "text-[clamp(32px,4vw,52px)]" : "text-[clamp(40px,5vw,72px)]"
        }`}
      >
        {title}
        {accent && (
          <>
            {" "}
            <GradientText>{accent}</GradientText>
          </>
        )}
      </h1>
      {children && <div className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted">{children}</div>}
      {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
    </div>
  </section>
);
