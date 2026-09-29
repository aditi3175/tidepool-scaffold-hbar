"use client";

import { useEffect, useRef } from "react";

const ROWS = 58; // contour lines, far to near
const STEPS = 110; // samples per line

/** Surface height at x (-1.3..1.3, left to right) and depth z (0 near .. 1 far): a tall ridge that rolls slowly. */
const surface = (x: number, z: number, t: number) => {
  // The ridge line runs diagonally into the distance and drifts slowly.
  const line = 0.18 + (z - 0.5) * 0.7 + 0.05 * Math.sin(t * 0.15);
  const main = 0.62 * Math.exp(-((x - line) ** 2) / 0.32) * (0.9 + 0.1 * Math.sin(z * 3.5 - t * 0.4));
  const second = 0.38 * Math.exp(-((x - line - 0.72) ** 2) / 0.1) * Math.exp(-((z - 0.35) ** 2) / 0.06);
  const low = 0.22 * Math.exp(-((x - line + 0.85) ** 2) / 0.18);
  const envelope = Math.exp(-((z - 0.5) ** 2) / 0.2);
  const swell = 0.04 * Math.sin(x * 4.2 + z * 6 - t * 0.8) + 0.025 * Math.sin(x * 9 - z * 4 + t * 1.1);
  return Math.max(0, (main + second + low) * envelope + swell * (1 - z * 0.7));
};

type Spark = { x: number; z: number; phase: number; size: number };

/**
 * The hero's tide: smooth contour lines over a moving ridge, with a glowing crest and drifting light points. Decorative.
 * Canvas 2D, device-pixel-ratio capped at 2; pauses off screen and in hidden tabs; one still frame with reduced motion.
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

    const sparks: Spark[] = Array.from({ length: 150 }, (_, i) => {
      const a = Math.sin(i * 91.7) * 43758.5453;
      const b = Math.sin(i * 17.3) * 12345.678;
      return { x: (a - Math.floor(a)) * 2.4 - 1.2, z: b - Math.floor(b), phase: i * 0.7, size: 0.6 + (i % 5) * 0.35 };
    });

    const project = (x: number, z: number, y: number) => {
      const s = 1 / (0.6 + z * 1.4);
      return [w * 0.46 + x * w * 0.62 * s, h * 0.24 + h * 0.5 * s - y * h * 0.82 * s] as const;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      for (let r = 0; r < ROWS; r++) {
        const z = 1 - r / (ROWS - 1); // far rows first
        const near = 1 - z;
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= STEPS; i++) {
          const x = -1.3 + (2.6 * i) / STEPS;
          const y = surface(x, z, t);
          const [sx, sy] = project(x, z, y);
          pts.push([sx, sy, y]);
        }
        // The whole line, faint, fading out at both ends.
        const grad = ctx.createLinearGradient(pts[0][0], 0, pts[STEPS][0], 0);
        const base = 0.05 + near * 0.16;
        grad.addColorStop(0, "rgba(46,230,200,0)");
        grad.addColorStop(0.25, `rgba(46,230,200,${base.toFixed(3)})`);
        grad.addColorStop(0.75, `rgba(34,211,238,${base.toFixed(3)})`);
        grad.addColorStop(1, "rgba(34,211,238,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.6 + near * 0.6;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < STEPS; i++) {
          const mx = (pts[i][0] + pts[i + 1][0]) / 2;
          const my = (pts[i][1] + pts[i + 1][1]) / 2;
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
        }
        ctx.stroke();

        // The crest: brighter where the surface is high.
        ctx.lineWidth = 1 + near * 0.8;
        for (let i = 1; i <= STEPS; i++) {
          const hgt = (pts[i - 1][2] + pts[i][2]) / 2;
          if (hgt < 0.22) continue;
          const glow = Math.min(0.8, (hgt - 0.22) * 1.2) * (0.3 + near * 0.7);
          ctx.strokeStyle = `rgba(120,255,232,${glow.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
          ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
        }
      }

      // Light points riding the surface.
      for (const s of sparks) {
        const y = surface(s.x, s.z, t);
        const [sx, sy] = project(s.x, s.z, y + 0.02);
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + s.phase));
        const a = (0.15 + Math.min(0.8, y * 1.4)) * twinkle * (1 - s.z * 0.6);
        ctx.fillStyle = `rgba(160,255,238,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * (1.2 - s.z * 0.6), 0, Math.PI * 2);
        ctx.fill();
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
      if (reduced) draw(3);
      else if (onScreen && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(3);
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
