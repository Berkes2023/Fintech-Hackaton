"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { money } from "@/lib/format";
import { Icon } from "./Icon";

export interface DemoNumbers {
  price: number; deposit: number; financed: number;
  providers: { name: string; apr: number; term: number; monthly: number }[];
  monthly: number; salary: number; spending: number; loan: number; savings: number;
  normal: number; withCar: number; bonus: number;
  wait: { deposit: number; financed: number; monthly: number; withCar: number; costBefore: number; costAfter: number };
}

const reduceQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => { const m = window.matchMedia(reduceQuery); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(reduceQuery).matches, () => false);

/**
 * The product story as a short animated conversation, built from our own UI and fictional data.
 * Every figure is calculated by sim.ts on the server and passed in. Respects prefers-reduced-motion.
 */
export function StoryDemo({ n }: { n: DemoNumbers }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const frames: { say: string; show: React.ReactNode }[] = [
    { say: "I want the car.", show: <div className="demo-fact"><Icon name="car" size={22} /><b>{money(n.price)}</b><span>car</span></div> },
    { say: `I could put down ${money(n.deposit)}. So I’ll need finance.`, show: <div className="demo-sum"><span>{money(n.price)}</span><span>− {money(n.deposit)} deposit</span><b>= {money(n.financed)} to finance</b></div> },
    { say: "Here’s my credit context.", show: <div className="demo-scale"><span className="small">Experian · score I entered myself</span><div className="demo-bar"><i style={{ left: "76%" }} /></div><span className="small muted">Shown on Experian’s own scale. Not an affordability check.</span></div> },
    { say: "Different providers, different terms.", show: <div className="demo-providers">{n.providers.map((p) => <span key={p.name}><b>{p.name}</b>{p.apr}% · {p.term}m · {money(p.monthly)}/m</span>)}</div> },
    { say: `But what does ${money(n.monthly)} a month mean for me?`, show: <div className="demo-rows"><span>Salary <b>{money(n.salary)}</b></span><span>Rent, bills, food, travel <b>−{money(n.spending)}</b></span><span>Savings <b>{money(n.savings)}</b></span></div> },
    { say: `I’m already paying ${money(n.loan)} a month on another loan.`, show: <div className="demo-rows"><span>Normal month leaves <b>{money(n.normal)}</b></span><span>With the car <b>{money(n.withCar)}</b></span></div> },
    { say: `Wait. I’m receiving a ${money(n.bonus)} bonus next month.`, show: <div className="demo-event"><b>+{money(n.bonus)}</b><span className="event-tag">ONE-OFF INCOME</span><span className="small muted">Never counted as salary</span></div> },
    { say: "What if I wait and add it to my deposit?", show: (
      <div className="demo-compare">
        <div><span className="caption">Now</span><span>{money(n.deposit)} down</span><span>{money(n.financed)} financed</span><b>{money(n.monthly)}/m</b><span className="small">month leaves {money(n.withCar)}</span></div>
        <Icon name="arrow" size={20} />
        <div className="on"><span className="caption">If I wait</span><span>{money(n.wait.deposit)} down</span><span>{money(n.wait.financed)} financed</span><b>{money(n.wait.monthly)}/m</b><span className="small">month leaves {money(n.wait.withCar)}</span></div>
      </div>
    ) },
  ];
  const all = reduced ? frames.length : shown;

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
    const t = window.setTimeout(() => setShown((s) => s + 1), 1900);
    return () => window.clearTimeout(t);
  }, [reduced, playing, inView, shown, frames.length]);

  const done = all >= frames.length;
  return (
    <div className="story-demo" ref={ref}>
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
          <p className="h3">See what changes before you commit.</p>
          <p className="small muted">Fictional example. Every number above was calculated by our code, not AI.</p>
          <Link href="/check" className="btn btn-dark">Understand my situation <Icon name="arrow" size={18} /></Link>
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
  );
}
