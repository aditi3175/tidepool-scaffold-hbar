"use client";

import { useEffect, useRef } from "react";

const COLS = 46;
const ROWS = 26;

/** Height of the surface at (x in -1..1, z in 0..1 from near to far) and time t. A crest that rolls slowly. */
const height = (x: number, z: number, t: number) => {
  const crest =
    Math.exp(-((x - 0.28 - 0.08 * Math.sin(t * 0.25)) ** 2) / 0.16) * (0.75 + 0.25 * Math.sin(z * 3.2 - t * 0.6));
  const ridge = Math.exp(-((z - 0.55) ** 2) / 0.05) * 0.35 * (0.5 + 0.5 * Math.sin(x * 2.2 + t * 0.35));
  const ripple = 0.06 * Math.sin(x * 7 + z * 9 - t * 1.1) * (1 - z * 0.5);
  return Math.max(0, crest * (0.35 + 0.65 * (1 - z)) + ridge + ripple);
};

/**
 * The hero's wireframe tide: a perspective grid over a slowly moving height field, drawn with the 2D canvas.
 * Decorative. Pauses off screen and in hidden tabs; one still frame with reduced motion.
 */
export const WaveField = ({ className = "" }: { className?: string }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

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

    const project = (x: number, z: number, y: number) => {
      const s = 1 / (1 + z * 2.3);
      return [w * 0.5 + x * w * 1.05 * s, h * 0.14 + h * 0.8 * s - y * h * 0.62 * s] as const;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;
      const grid: (readonly [number, number, number])[][] = [];
      for (let r = 0; r < ROWS; r++) {
        const z = 1 - r / (ROWS - 1); // far to near
        const row: (readonly [number, number, number])[] = [];
        for (let c = 0; c < COLS; c++) {
          const x = -1 + (2 * c) / (COLS - 1);
          const y = height(x, z, t);
          const [sx, sy] = project(x, z, y);
          row.push([sx, sy, y]);
        }
        grid.push(row);
      }
      // Lines across (constant depth), brighter when near and on the crest.
      for (let r = 0; r < ROWS; r++) {
        const near = r / (ROWS - 1);
        for (let c = 1; c < COLS; c++) {
          const a = grid[r][c - 1];
          const b = grid[r][c];
          const glow = 0.05 + near * 0.22 + Math.min(0.5, (a[2] + b[2]) * 0.35);
          ctx.strokeStyle = `rgba(46,230,200,${glow.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
      }
      // Lines into the distance.
      for (let c = 0; c < COLS; c += 2) {
        for (let r = 1; r < ROWS; r++) {
          const a = grid[r - 1][c];
          const b = grid[r][c];
          const near = r / (ROWS - 1);
          const glow = 0.03 + near * 0.12 + Math.min(0.35, (a[2] + b[2]) * 0.25);
          ctx.strokeStyle = `rgba(34,211,238,${glow.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    resize();
    let raf = 0;
    let onScreen = true;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      draw((now - start) / 1000);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      if (reduced) draw(2);
      else if (onScreen && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(2);
    });
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={wrap} className={`pointer-events-none ${className}`} aria-hidden>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
};
