"use client";

import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";

const EDGE = 8; // px kept clear of the viewport edge

/**
 * A "?" button with a short explanation. Opens on hover and on keyboard focus, closes on blur, mouse leave or Escape.
 * The button is described by the tooltip, so screen readers announce the text with it. The tooltip is nudged
 * sideways when it would leave the viewport (narrow screens).
 */
export const InfoTip = ({ label, children }: { label: string; children: ReactNode }) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const tipRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open || !tipRef.current) {
      setShift(0);
      return;
    }
    const rect = tipRef.current.getBoundingClientRect();
    const left = rect.left - shift;
    const right = rect.right - shift;
    const viewport = document.documentElement.clientWidth;
    setShift(left < EDGE ? EDGE - left : right > viewport - EDGE ? viewport - EDGE - right : 0);
    // Measure once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={id}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-line text-[10px] leading-none text-muted hover:text-fg"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={event => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        ?
      </button>
      <span
        ref={tipRef}
        id={id}
        role="tooltip"
        style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
        className={`absolute bottom-full left-1/2 z-30 mb-2 w-56 rounded-lg border border-line bg-raised px-3 py-2 text-xs font-normal leading-4 text-fg shadow-[0_4px_16px_rgb(0_0_0/0.35)] ${
          open ? "block" : "hidden"
        }`}
      >
        {children}
      </span>
    </span>
  );
};
