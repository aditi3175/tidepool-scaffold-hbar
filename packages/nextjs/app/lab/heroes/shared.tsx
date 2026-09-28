"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

export const SCAFFOLD = "npm create scaffold-hbar@latest -- --template aditi3175/tidepool-scaffold-hbar";

/** Element width, kept current with a ResizeObserver. */
export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** A price domain around the range with room for spot and TWAP. */
export function domain(lower: number, upper: number, extra: number[], padRatio = 0.45) {
  const lo = Math.min(lower, ...extra);
  const hi = Math.max(upper, ...extra);
  const pad = Math.max((hi - lo) * 0.18, (upper - lower) * padRatio);
  return { min: lo - pad, max: hi + pad };
}

export const useCopied = () => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);
  return {
    copied,
    copy: async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    },
  };
};

/** Film grain as an SVG data URI (used at a few percent opacity). */
export const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;
