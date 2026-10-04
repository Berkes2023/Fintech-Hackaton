"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

// Small building blocks for the home-page story: scroll reveals, counters, dot grids and typing.
// With prefers-reduced-motion, everything shows its final state immediately and nothing moves.

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
  return <span ref={ref} className="counter" aria-label={`${prefix}${fmt(to, decimals)}${suffix}`}><span aria-hidden="true">{prefix}{fmt(shown, decimals)}{suffix}</span></span>;
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

/** Types a line once when scrolled into view. */
export function TypeOnce({ text, className = "", speed = 38 }: { text: string; className?: string; speed?: number }) {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView<HTMLParagraphElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen || reduced || n >= text.length) return;
    const t = window.setTimeout(() => setN((x) => x + 1), speed);
    return () => window.clearTimeout(t);
  }, [seen, reduced, n, text.length, speed]);
  const shown = reduced ? text.length : n;
  return (
    <p ref={ref} className={`type-once ${className}`} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, shown)}</span>
      {!reduced && shown < text.length && <span className="caret" aria-hidden="true" />}
    </p>
  );
}

/** Reveals its children one at a time once in view. */
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
      {items.map((it, i) => <li key={i} className={i < shown ? "in" : undefined} aria-hidden={i >= shown}>{it}</li>)}
    </ol>
  );
}

/** Adds .in once scrolled into view, for CSS-driven multi-step animations. */
export function Stage({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <div ref={ref} className={`stage-anim${seen ? " in" : ""} ${className}`} aria-label={label}>{children}</div>;
}

const HERO_LINES = ["You know the price.", "You know the monthly payment.", "You know the APR.", "You know your credit score."];

/** The opening: four things you know, typed and replaced, then the question that matters. */
export function HeroTyper() {
  const reduced = useReducedMotion();
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "erasing" | "question">("typing");
  useEffect(() => {
    if (reduced || phase === "question") return;
    const text = HERO_LINES[line];
    let t: number;
    if (phase === "typing") t = window.setTimeout(() => (chars < text.length ? setChars(chars + 1) : setPhase("holding")), 42);
    else if (phase === "holding") t = window.setTimeout(() => (line === HERO_LINES.length - 1 ? setPhase("question") : setPhase("erasing")), line === HERO_LINES.length - 1 ? 1300 : 900);
    else t = window.setTimeout(() => {
      if (chars > 0) setChars(chars - 1);
      else { setLine(line + 1); setPhase("typing"); }
    }, 18);
    return () => window.clearTimeout(t);
  }, [reduced, phase, line, chars]);

  const question = reduced || phase === "question";
  return (
    <div className="hero-typer" aria-live="polite">
      {!question
        ? <p className="hero-line" aria-label={HERO_LINES[line]}><span aria-hidden="true">{HERO_LINES[line].slice(0, chars)}</span><span className="caret" aria-hidden="true" /></p>
        : <>
            <ul className="hero-knowns" aria-label="What you might already know">{HERO_LINES.map((l) => <li key={l}>{l}</li>)}</ul>
            <p className="hero-question">But do you know what the decision actually means for you?</p>
          </>}
      {question && (
        <div className="hero-reveal">
          <p className="display-xl">Every financial decision has consequences.</p>
          <p className="lead">See beyond the monthly payment. Understand your situation, your credit and the real cost, and see what a decision could change for you, before you commit.</p>
        </div>
      )}
    </div>
  );
}
