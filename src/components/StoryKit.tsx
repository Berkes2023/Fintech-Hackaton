"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

// Small building blocks for the home-page story: scroll reveals, counters, dot grids and sequences.
// With prefers-reduced-motion, everything shows its final state immediately and nothing moves.
// Without JavaScript, the CSS shows every final state (see the scripting gates in globals.css).

const MOTION = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => { const m = window.matchMedia(MOTION); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
export const useReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(MOTION).matches, () => false);

/** True once the element has scrolled into view (then stays true). */
function useInView<T extends Element>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    // Also counts as seen once it's above the viewport, so a fast scroll never leaves a counter stuck at 0.
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting || e.boundingClientRect.bottom < 0) { setSeen(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return [ref, seen] as const;
}

/** Fades and lifts its content in when scrolled into view. `delay` is in ms. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "li" | "p" | "section" }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <Tag ref={ref as never} className={`rv${seen ? " in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}

const fmt = (x: number, decimals: number) => x.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Counts up to a number when scrolled into view. */
export function Counter({ to, decimals = 0, prefix = "", suffix = "", ms = 1400 }: { to: number; decimals?: number; prefix?: string; suffix?: string; ms?: number }) {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen || reduced) return;
    let frame = 0;
    const start = performance.now();
    // Timers (not animation frames) so the count still finishes when the tab is hidden or throttled.
    const tick = () => {
      const k = Math.min(1, (performance.now() - start) / ms);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) frame = window.setTimeout(tick, 16);
    };
    frame = window.setTimeout(tick, 16);
    return () => window.clearTimeout(frame);
  }, [seen, reduced, to, ms]);
  // Until it has been seen, show the real value (no-JS visitors, previews, hidden tabs); it counts up from 0 once in view.
  const shown = reduced || !seen ? to : v;
  // Screen readers get the final figure as real (visually hidden) text; the moving count is hidden from them.
  return <span ref={ref} className="counter"><span className="sr-only">{prefix}{fmt(to, decimals)}{suffix}</span><span aria-hidden="true">{prefix}{fmt(shown, decimals)}{suffix}</span></span>;
}

/**
 * The value once it has stopped changing for `ms`, for live regions: typing "2500" announces £2,500 once, not £2,
 * £25 and £250 on the way. Starts at the current value, so nothing is announced on first render.
 */
export function useSettled<T>(v: T, ms = 900): T {
  const [settled, setSettled] = useState(v);
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(v), ms);
    return () => window.clearTimeout(t);
  }, [v, ms]);
  return settled;
}

/** 100 people as dots, `filled` of them highlighted in turn when scrolled into view. */
export function DotGrid({ filled, label, total = 100 }: { filled: number; label: string; total?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`dot-grid${seen ? " in" : ""}`} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < filled ? "on" : undefined} style={{ transitionDelay: `${i < filled ? i * 14 : 0}ms` }} />)}
    </div>
  );
}

/** Reveals its children one at a time once in view. Hidden items are only faded by CSS, never hidden from screen readers. */
export function Sequence({ items, interval = 650, className = "" }: { items: ReactNode[]; interval?: number; className?: string }) {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView<HTMLOListElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen || reduced || n >= items.length) return;
    const t = window.setTimeout(() => setN((x) => x + 1), n === 0 ? 150 : interval);
    return () => window.clearTimeout(t);
  }, [seen, reduced, n, items.length, interval]);
  const shown = reduced ? items.length : n;
  return (
    <ol ref={ref} className={`sequence ${className}`}>
      {items.map((it, i) => <li key={i} className={i < shown ? "in" : undefined}>{it}</li>)}
    </ol>
  );
}
