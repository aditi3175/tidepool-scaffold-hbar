"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Fades and lifts its content into place the first time it scrolls into view. `step` staggers siblings (80 ms each).
 * The motion lives in globals.css (.tp-reveal); reduced motion shows everything at once.
 */
export const Reveal = ({
  children,
  className = "",
  step = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  as?: "div" | "li" | "section";
}) => {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`tp-reveal ${shown ? "is-in" : ""} ${className}`}
      style={{ "--step": step } as CSSProperties}
    >
      {children}
    </Tag>
  );
};
