"use client";

import { useEffect, useRef } from "react";

export type FlowChartProps = {
  lower?: number;
  upper?: number;
  spot?: number;
  twap?: number;
  /** The vault's own flag. Out of range: the band turns amber and trades pass through without sparking. */
  inRange?: boolean;
  className?: string;
  label: string;
};

/** A price domain around the range, with room for spot and the TWAP. */
export function priceDomain(lower: number, upper: number, extra: number[]) {
  const lo = Math.min(lower, ...extra);
  const hi = Math.max(upper, ...extra);
  const pad = Math.max((hi - lo) * 0.18, (upper - lower) * 0.45);
  return { min: lo - pad, max: hi + pad };
}

/**
 * The range with swaps flowing across it. The flowing dots are illustrative; the band, spot (white) and TWAP (dashed
 * cyan, shown when apart) are live. Pauses off screen and in hidden tabs; draws still frames with reduced motion.
 */
export const FlowChart = ({ lower, upper, spot, twap, inRange = true, className = "", label }: FlowChartProps) => {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const props = useRef({ lower, upper, spot, twap, inRange });
  useEffect(() => {
    props.current = { lower, upper, spot, twap, inRange };
  });

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = el.clientWidth;
      h = el.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw(0);
    });
    ro.observe(el);

    const dots = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: 0.12 + Math.random() * 0.76,
      v: (0.04 + Math.random() * 0.08) * (Math.random() < 0.5 ? 1 : -1),
      r: 1 + Math.random() * 1.6,
    }));
    const sparks: { x: number; y: number; age: number }[] = [];

    function draw(dt: number) {
      const s = props.current;
      ctx!.clearRect(0, 0, w, h);
      // Grid.
      ctx!.strokeStyle = "rgba(255,255,255,0.05)";
      ctx!.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 32) {
        ctx!.beginPath();
        ctx!.moveTo(gx + 0.5, 0);
        ctx!.lineTo(gx + 0.5, h);
        ctx!.stroke();
      }
      if (s.lower === undefined || s.upper === undefined || s.spot === undefined) {
        ctx!.fillStyle = "rgba(154,167,182,0.8)";
        ctx!.font = "13px var(--font-space), sans-serif";
        ctx!.textAlign = "center";
        ctx!.fillText("Reading the vault…", w / 2, h / 2);
        return;
      }
      const { min, max } = priceDomain(s.lower, s.upper, [s.spot, s.twap ?? s.spot]);
      const X = (p: number) => ((p - min) / (max - min)) * w;
      const x0 = X(s.lower);
      const x1 = X(s.upper);
      const xs = X(s.spot);
      const edge = s.inRange ? "#00F5A0" : "#FFB020";

      const band = ctx!.createLinearGradient(0, 0, 0, h);
      band.addColorStop(0, s.inRange ? "rgba(0,245,160,0.22)" : "rgba(255,176,32,0.18)");
      band.addColorStop(1, s.inRange ? "rgba(0,209,255,0.04)" : "rgba(255,176,32,0.03)");
      ctx!.fillStyle = band;
      ctx!.fillRect(x0, 0, x1 - x0, h);
      ctx!.fillStyle = edge;
      ctx!.shadowColor = edge;
      ctx!.shadowBlur = 16;
      ctx!.fillRect(x0 - 1, 0, 2, h);
      ctx!.fillRect(x1 - 1, 0, 2, h);
      ctx!.shadowBlur = 0;

      for (const dot of dots) {
        dot.x += dot.v * dt;
        if (dot.x > 1.02) dot.x = -0.02;
        if (dot.x < -0.02) dot.x = 1.02;
        const px = dot.x * w;
        const lit = s.inRange && px >= x0 && px <= x1;
        if (lit && Math.random() < dt * 0.25) sparks.push({ x: px, y: dot.y * h, age: 0 });
        ctx!.fillStyle = lit ? "rgba(0,245,160,0.95)" : "rgba(255,255,255,0.22)";
        ctx!.beginPath();
        ctx!.arc(px, dot.y * h, dot.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.age += dt;
        if (sp.age > 0.9) {
          sparks.splice(i, 1);
          continue;
        }
        ctx!.strokeStyle = `rgba(0,245,160,${0.7 * (1 - sp.age / 0.9)})`;
        ctx!.beginPath();
        ctx!.arc(sp.x, sp.y, 2 + sp.age * 14, 0, Math.PI * 2);
        ctx!.stroke();
      }

      if (s.twap !== undefined && Math.abs(X(s.twap) - xs) > 2) {
        ctx!.strokeStyle = "#00D1FF";
        ctx!.setLineDash([4, 4]);
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.moveTo(X(s.twap), 0);
        ctx!.lineTo(X(s.twap), h);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }
      ctx!.strokeStyle = "#fff";
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.moveTo(xs, 0);
      ctx!.lineTo(xs, h);
      ctx!.stroke();
    }

    let raf = 0;
    let last = performance.now();
    let onScreen = true;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(dt);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      if (reduced) {
        draw(0);
      } else if (onScreen && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    // With reduced motion, redraw now and then so live values (spot, range) stay current.
    const still = reduced ? setInterval(() => draw(0), 2000) : undefined;
    return () => {
      cancelAnimationFrame(raf);
      if (still) clearInterval(still);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" role="img" aria-label={label} />
    </div>
  );
};
