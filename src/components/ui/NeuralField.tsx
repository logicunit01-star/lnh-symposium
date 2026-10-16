"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Animated neural-network field: drifting nodes linked by fading synapses, reacting to the pointer. */
export function NeuralField({ className, density = 1, interactive = true }: { className?: string; density?: number; interactive?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, visible = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const mouse = { x: -9999, y: -9999 };
    type N = { x: number; y: number; vx: number; vy: number; r: number; hue: number; pulse: number };
    let nodes: N[] = [];
    const palette = ["63,184,240", "21,96,212", "210,25,46", "255,255,255"];
    const resize = () => {
      const r = c.getBoundingClientRect(); w = r.width; h = r.height;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(140, (w * h) / 9000) * density);
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6, hue: Math.random() < 0.12 ? 2 : Math.random() < 0.5 ? 0 : Math.random() < 0.7 ? 1 : 3, pulse: Math.random() * Math.PI * 2,
      }));
    };
    const LINK = 130;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const a of nodes) {
        if (!reduce) { a.x += a.vx; a.y += a.vy; a.pulse += 0.03; }
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        if (interactive) {
          const dx = a.x - mouse.x, dy = a.y - mouse.y, d = Math.hypot(dx, dy);
          if (d < 140 && d > 0) { a.x += (dx / d) * 0.6; a.y += (dy / d) * 0.6; }
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(${palette[a.hue === 2 || b.hue === 2 ? 2 : 0]},${(1 - d / LINK) * 0.28})`;
            ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (interactive) {
          const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (dm < 180) { ctx.strokeStyle = `rgba(63,184,240,${(1 - dm / 180) * 0.5})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
        }
      }
      for (const a of nodes) {
        const glow = 0.55 + Math.sin(a.pulse) * 0.35;
        ctx.fillStyle = `rgba(${palette[a.hue]},${glow})`;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
        if (a.hue === 2) { ctx.fillStyle = `rgba(210,25,46,${glow * 0.25})`; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 4, 0, Math.PI * 2); ctx.fill(); }
      }
      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };
    resize(); draw();
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(); }); ro.observe(c);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); } });
    io.observe(c);
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const leave = () => { mouse.x = mouse.y = -9999; };
    if (interactive) { window.addEventListener("pointermove", move, { passive: true }); window.addEventListener("pointerleave", leave); }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener("pointermove", move); window.removeEventListener("pointerleave", leave); };
  }, [density, interactive]);
  return <canvas ref={ref} className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden />;
}
