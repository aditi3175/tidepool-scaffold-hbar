"use client";

import type { ReactNode } from "react";
import { useInViewOnce } from "~~/app/_components/tidepool/motion";

/**
 * One stage of "the loop" (PRICE → RANGE → FEES → COMPOUND → REBALANCE). Each stage owns a segment of the spine on
 * the left; the segment fills (indigo → aqua) the first time the stage scrolls into view, so the spine reads as
 * progress through Tidepool's mechanism. Content settles in once, just after the header.
 */
export const LoopStage = ({
  index,
  name,
  title,
  lead,
  aside,
  children,
  last = false,
}: {
  index: string;
  name: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Right-aligned element in the stage header (a status, a pill). */
  aside?: ReactNode;
  children: ReactNode;
  /** The last stage's spine ends at its marker area instead of running on. */
  last?: boolean;
}) => {
  const [ref, reached] = useInViewOnce<HTMLElement>();
  return (
    <section
      ref={ref}
      aria-label={`${index} ${name}`}
      className={`relative pl-9 sm:pl-14 ${last ? "pb-4" : "pb-20 sm:pb-28"}`}
    >
      {/* Spine: a faint track, and a fill that grows down the first time the stage is reached. */}
      <span aria-hidden className="absolute bottom-0 left-[11px] top-0 w-px bg-white/[0.07] sm:left-[19px]" />
      <span
        aria-hidden
        className={`tp-spine absolute bottom-0 left-[11px] top-0 w-px origin-top bg-[linear-gradient(180deg,#6e7bff,#3ee0c5)] sm:left-[19px] ${
          reached ? "scale-y-100" : "scale-y-0"
        }`}
      />
      <span
        aria-hidden
        className={`absolute left-[11px] top-1.5 h-[11px] w-[11px] -translate-x-1/2 rounded-full border transition-colors duration-700 sm:left-[19px] ${
          reached
            ? "border-[#8fa3ff] bg-[#6e7bff] shadow-[0_0_0_4px_rgb(110_123_255/0.15)]"
            : "border-white/25 bg-[#07080b]"
        }`}
      />

      <header className={`tp-reveal ${reached ? "tp-shown" : ""} flex flex-wrap items-end justify-between gap-4`}>
        <div className="min-w-0">
          <div className="tp-eyebrow flex items-center gap-3">
            <span className="tp-num text-primary/90">{index}</span>
            <span className="text-base-content/70">{name}</span>
          </div>
          <h2 className="tp-display m-0 mt-3 text-[2.1rem] leading-[1.05] sm:text-5xl">{title}</h2>
          {lead && <p className="mt-3 max-w-xl text-sm leading-relaxed text-base-content/55">{lead}</p>}
        </div>
        {aside}
      </header>
      <div
        className={`tp-reveal ${reached ? "tp-shown" : ""} mt-8 sm:mt-10`}
        style={{ transitionDelay: reached ? "120ms" : undefined }}
      >
        {children}
      </div>
    </section>
  );
};
