"use client";

import {
  type PointerEvent,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * Motion helpers for the Tidepool dashboard. Presentation only: nothing here reads chain data, polls, or changes a
 * displayed value. Every effect is skipped when the user prefers reduced motion.
 */

// ---------------------------------------------------------------------------------------------------------------
// Reduced motion
// ---------------------------------------------------------------------------------------------------------------

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

// ---------------------------------------------------------------------------------------------------------------
// UI events: "the vault data refreshed" and "a transaction succeeded". Emitted from values the dashboard already
// has (the read query's dataUpdatedAt, a confirmed transaction hash); they only trigger one-shot visuals.
// ---------------------------------------------------------------------------------------------------------------

const REFRESH_EVENT = "tidepool:refresh";
const SUCCESS_EVENT = "tidepool:tx-success";

export const emitRefresh = () => window.dispatchEvent(new Event(REFRESH_EVENT));
export const emitSuccess = () => window.dispatchEvent(new Event(SUCCESS_EVENT));

export function onSuccessEvent(handler: () => void): () => void {
  window.addEventListener(SUCCESS_EVENT, handler);
  return () => window.removeEventListener(SUCCESS_EVENT, handler);
}

/** Increments once per real data refresh; components use it as a `key` to replay a one-shot animation. */
export function useRefreshTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, []);
  return tick;
}

/** Calls emitRefresh() when `stamp` changes after the first value (so the first load does not pulse). */
export function useEmitRefreshOnChange(stamp: number | undefined) {
  const first = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!stamp) return;
    if (first.current === undefined) {
      first.current = stamp;
      return;
    }
    if (stamp !== first.current) {
      first.current = stamp;
      emitRefresh();
    }
  }, [stamp]);
}

// ---------------------------------------------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------------------------------------------

/**
 * Renders `children` unchanged and briefly brightens them when `value` changes. No animation on first render and
 * no count-up: the displayed text is always the real value.
 */
export const Changing = ({
  value,
  children,
  className = "",
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) => {
  const previous = useRef(value);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      setFlash(f => f + 1);
    }
  }, [value]);
  return (
    <span key={flash} className={`${flash > 0 ? "tp-flash" : ""} ${className}`}>
      {children}
    </span>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Live numbers: tween between two REAL values. The final text is always exactly the formatted value passed in.
// ---------------------------------------------------------------------------------------------------------------

/** Last displayed value per metric id, so a remount (for example a vault switch) can animate from the old vault's
 *  real value to the new vault's real value. Nothing is animated on the first load of a metric. */
const lastShown = new Map<string, string>();

const parse = (text: string) => {
  if (!/^-?[\d,]*\.?\d+$/.test(text)) return undefined; // "–", "1.2e-7", labels: not tweened
  return Number(text.replace(/,/g, ""));
};
const decimalsOf = (text: string) => (text.includes(".") ? text.split(".")[1].length : 0);
const grouped = (text: string) => text.includes(",");

function formatLike(n: number, decimals: number, group: boolean): string {
  const fixed = n.toFixed(decimals);
  if (!group) return fixed;
  const [whole, fraction] = fixed.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction !== undefined ? `${withCommas}.${fraction}` : withCommas;
}

/**
 * A number that glides to its new value when the real value changes (600 ms). Writes the text node directly during
 * the tween (no React re-render per frame), and always ends on `text` exactly. Pass a stable `id` to also animate
 * across a vault switch.
 */
export const Num = ({ text, id, className = "" }: { text: string; id?: string; className?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<string | undefined>(id ? lastShown.get(id) : undefined);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = shown.current;
    shown.current = text;
    if (id) lastShown.set(id, text);
    const a = from === undefined ? undefined : parse(from);
    const b = parse(text);
    if (reduced || a === undefined || b === undefined || a === b) {
      el.textContent = text;
      return;
    }
    const decimals = decimalsOf(text);
    const group = grouped(text) || grouped(from!);
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = t < 1 ? formatLike(a + (b - a) * eased, decimals, group) : text;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [text, id, reduced]);

  // Initial render: the previous real value when switching vaults (then it glides), otherwise the value itself.
  return (
    <span ref={ref} className={`tp-num ${className}`}>
      {shown.current ?? text}
    </span>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Scroll reveal
// ---------------------------------------------------------------------------------------------------------------

/** True once the element has entered the viewport (then the observer disconnects). */
export function useInViewOnce<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);
  return [ref, inView];
}

// ---------------------------------------------------------------------------------------------------------------
// Pointer highlight: writes CSS variables on the element; no React state, no re-render.
// ---------------------------------------------------------------------------------------------------------------

export function trackPointer(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse") return;
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  el.style.setProperty("--my", `${event.clientY - rect.top}px`);
}

// ---------------------------------------------------------------------------------------------------------------
// Chart highlight: the activity feed publishes the ranges recorded in a hovered Rebalance event; the range chart
// draws them. An external store keeps the rest of the dashboard from re-rendering on hover.
// ---------------------------------------------------------------------------------------------------------------

export type RangeHighlight = { oldLower?: number; oldUpper?: number; newLower: number; newUpper: number } | null;

type HighlightStore = {
  get: () => RangeHighlight;
  set: (value: RangeHighlight) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createHighlightStore(): HighlightStore {
  let value: RangeHighlight = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: next => {
      value = next;
      listeners.forEach(listener => listener());
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const HighlightContext = createContext<HighlightStore | null>(null);
export const HighlightProvider = HighlightContext.Provider;

export function useRangeHighlight(): RangeHighlight {
  const store = useContext(HighlightContext);
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => undefined),
    () => store?.get() ?? null,
    () => null,
  );
}

export function useSetRangeHighlight(): (value: RangeHighlight) => void {
  const store = useContext(HighlightContext);
  return store?.set ?? (() => undefined);
}
