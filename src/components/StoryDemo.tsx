"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { money } from "@/lib/format";
import { Icon } from "./Icon";

export interface DemoNumbers {
  credit: { total: number; band: string; parts: { label: string; points: number; max: number }[] };
  price: number; deposit: number; financed: number;
  providers: { name: string; apr: number; term: number; monthly: number }[];
  monthly: number; salary: number; spending: number; loan: number; savings: number;
  normal: number; withCar: number; bonus: number;
  wait: { deposit: number; financed: number; monthly: number; withCar: number };
}

const reduceQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => { const m = window.matchMedia(reduceQuery); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(reduceQuery).matches, () => false);

export const STAGES = [
  { n: "01", title: "Understand your credit", body: "Know your score already? Enter it. Don’t know it? Build an educational credit estimate with us." },
  { n: "02", title: "Tell us your goal", body: "Car, home, renovation or another financial commitment." },
  { n: "03", title: "Understand your situation", body: "Income, spending, existing borrowing, savings and commitments." },
  { n: "04", title: "Tell us what’s coming", body: "Bonus, pay rise, loan ending, rent increase or another future change." },
  { n: "05", title: "See the potential impact", body: "Explore the commitment over time before signing." },
];

/**
 * The product story as a short animated conversation beside the five stages, built from our own UI and fictional
 * data. Every figure (including the credit estimate) is calculated by our code on the server and passed in.
 */
export function StoryDemo({ n }: { n: DemoNumbers }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const frames: { stage: number; say: string; show: React.ReactNode }[] = [
    { stage: 0, say: "Let’s start with my credit.", show: <div className="demo-providers"><span>Repay on time? <b>Mostly</b></span><span>Cards: <b>£1,000 of £5,000</b></span><span>Recent applications: <b>2</b></span><span>Credit for <b>3–6 years</b></span></div> },
    { stage: 0, say: "My Before You Sign Credit Estimate.", show: (
      <div className="demo-credit">
        <div className="demo-score"><b>{n.credit.total}</b><span>/ 100</span></div>
        <div className="stack" style={{ gap: 4 }}>
          <span className="small"><b>{n.credit.band}</b></span>
          {n.credit.parts.map((p) => <span key={p.label} className="demo-part"><span>{p.label}</span><i><i style={{ width: `${(p.points / p.max) * 100}%` }} /></i><span>{p.points}/{p.max}</span></span>)}
          <span className="small muted">Educational estimate, not an official credit score.</span>
        </div>
      </div>
    ) },
    { stage: 1, say: "That’s one part of the story. What am I thinking about? A car.", show: <div className="demo-fact"><Icon name="car" size={22} /><b>{money(n.price)}</b><span>car</span></div> },
    { stage: 1, say: `I could put down ${money(n.deposit)}.`, show: <div className="demo-sum"><span>{money(n.price)}</span><span>− {money(n.deposit)} deposit</span><b>= {money(n.financed)} potential finance</b></div> },
    { stage: 1, say: "Different providers, different terms.", show: <div className="demo-providers">{n.providers.map((p) => <span key={p.name}><b>{p.name}</b>{p.apr}% · {p.term}m · {money(p.monthly)}/m</span>)}<span className="muted">Fictional examples</span></div> },
    { stage: 2, say: `But what does ${money(n.monthly)} a month mean for me?`, show: <div className="demo-rows"><span>Salary <b>{money(n.salary)}</b></span><span>Rent, bills, food, travel <b>−{money(n.spending)}</b></span><span>Existing loan <b>−{money(n.loan)}</b></span><span>Normal month leaves <b>{money(n.normal)}</b></span><span>With the car <b>{money(n.withCar)}</b></span></div> },
    { stage: 3, say: `I’m getting a ${money(n.bonus)} bonus next month.`, show: <div className="demo-event"><b>+{money(n.bonus)}</b><span className="event-tag">ONE-OFF INCOME</span><span className="small muted">Next month. Never counted as salary.</span></div> },
    { stage: 4, say: "What if I wait and put it towards the deposit?", show: (
      <div className="demo-compare">
        <div><span className="caption">Now</span><span>{money(n.deposit)} deposit</span><span>{money(n.financed)} finance</span><b>{money(n.monthly)}/m</b><span className="small">month leaves {money(n.withCar)}</span></div>
        <Icon name="arrow" size={20} />
        <div className="on"><span className="caption">If I wait</span><span>{money(n.wait.deposit)} deposit</span><span>{money(n.wait.financed)} finance</span><b>{money(n.wait.monthly)}/m</b><span className="small">month leaves {money(n.wait.withCar)}</span></div>
      </div>
    ) },
  ];
  const all = reduced ? frames.length : shown;
  const done = all >= frames.length;
  const stage = done ? STAGES.length : frames[all - 1].stage;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Any visible part counts (above the bottom 15%), so it keeps playing as the story grows taller than the screen.
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "0px 0px -15% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !playing || !inView || shown >= frames.length) return;
    const t = window.setTimeout(() => setShown((s) => s + 1), 2000);
    return () => window.clearTimeout(t);
  }, [reduced, playing, inView, shown, frames.length]);

  return (
    <div className="story-layout" ref={ref}>
      <ol className="stages" aria-label="How it works">
        {STAGES.map((s, i) => (
          <li key={s.n} className={i < stage ? "done" : i === stage ? "now" : undefined}>
            <span className="stage-n">{i < stage ? "✓" : s.n}</span>
            <span><b>{s.title}</b><span className="small">{s.body}</span></span>
          </li>
        ))}
      </ol>
      <div className="story-demo">
        <ol className="demo-frames" aria-live="polite">
          {frames.slice(0, all).map((f, i) => (
            <li key={i} className="demo-frame">
              <p className="demo-say">“{f.say}”</p>
              {f.show}
            </li>
          ))}
        </ol>
        {done && (
          <div className="demo-end">
            <span className="caption">Before You Sign</span>
            <p className="h2">Know before you commit.</p>
            <p className="small muted">Fictional example. Every number above, including the credit estimate, was calculated by our code, not AI.</p>
            <Link href="/check" className="btn btn-dark">Start with my credit <Icon name="arrow" size={18} /></Link>
          </div>
        )}
        {!reduced && (
          <div className="row demo-controls">
            {!done && <button type="button" className="btn btn-light btn-sm" onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button>}
            {!done && <button type="button" className="link small" onClick={() => setShown(frames.length)}>Show it all</button>}
            {done && <button type="button" className="link small" onClick={() => { setShown(1); setPlaying(true); }}>Replay</button>}
          </div>
        )}
      </div>
    </div>
  );
}
