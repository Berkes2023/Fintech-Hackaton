"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { money } from "@/lib/format";
import { Icon } from "./Icon";

interface Line { t: number; y: number }
interface Props {
  fixed: { total: number; interest: number; months: number; pts: Line[] };
  minOnly: { total: number; interest: number; months: number; pts: Line[] };
}

/** Builds an SVG path for cumulative payments, scaled to a shared box. */
function path(pts: Line[], tMax: number, yMax: number, w: number, h: number) {
  return pts.map((p, i) => `${i ? "L" : "M"}${((p.t / tMax) * w).toFixed(1)},${(h - (p.y / yMax) * h).toFixed(1)}`).join(" ");
}

export function HeroCard({ fixed, minOnly }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Scroll-linked rise: the card grows and lifts as it travels up the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (vh * 0.8 - top) / (vh * 0.55)));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const W = 480, H = 120;
  const tMax = Math.max(fixed.months, minOnly.months);
  const yMax = Math.max(fixed.total, minOnly.total) * 1.08;

  return (
    <div className="hero-card" ref={ref}>
      <div className="hero-card-row row" style={{ justifyContent: "space-between" }}>
        <span className="pill-label">Credit card</span>
        <span className="small muted">£1,200 at 24.9% APR</span>
      </div>
      <div className="hero-card-row">
        <p className="h3">Paying £50 a month, you pay back {money(fixed.total)}.</p>
        <p className="small muted" style={{ marginTop: 6 }}>
          Paying only the minimum, it takes {Math.round(minOnly.months / 12)} years and costs {money(minOnly.interest)} in interest.
        </p>
      </div>

      <div className="tiles hero-card-row">
        <div className="tile"><span className="caption">Monthly</span><span className="v">£50</span></div>
        <div className="tile"><span className="caption">Interest</span><span className="v">{money(fixed.interest)}</span></div>
        <div className="tile emph"><span className="caption">Total</span><span className="v">{money(fixed.total)}</span></div>
        <div className="tile"><span className="caption">Months</span><span className="v">{fixed.months}</span></div>
      </div>

      <div className="hero-card-row hero-mini">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="caption">Total paid over time</span>
          <span className="legend">
            <span><i />£50 a month</span>
            <span><i style={{ borderTopStyle: "dashed" }} />Minimum only</span>
          </span>
        </div>
        <svg viewBox={`-4 -14 ${W + 8} ${H + 30}`} role="img" aria-label={`Paying £50 a month totals ${money(fixed.total)}; minimum payments total ${money(minOnly.total)}`}>
          <line x1="0" x2={W} y1={H} y2={H} stroke="#c9c9cd" />
          <path d={path(minOnly.pts, tMax, yMax, W, H)} fill="none" stroke="#717173" strokeWidth="2" strokeDasharray="6 5" />
          <path d={path(fixed.pts, tMax, yMax, W, H)} fill="none" stroke="#1f1f1f" strokeWidth="2.5" />
          <circle cx={(fixed.months / tMax) * W} cy={H - (fixed.total / yMax) * H} r="4" fill="#1f1f1f" />
          <circle cx={(minOnly.months / tMax) * W} cy={H - (minOnly.total / yMax) * H} r="4" fill="#717173" />
          <text x={(fixed.months / tMax) * W} y={H - (fixed.total / yMax) * H - 10} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1f1f1f">{money(fixed.total)}</text>
          <text x={W} y={H - (minOnly.total / yMax) * H - 10} textAnchor="end" fontSize="12" fontWeight="600" fill="#717173">{money(minOnly.total)}</text>
          <text x="0" y={H + 14} fontSize="11" fill="#717173">Today</text>
          <text x={W} y={H + 14} textAnchor="end" fontSize="11" fill="#717173">{Math.round(tMax / 12)} years</text>
        </svg>
      </div>

      <div className="hero-card-row risk">
        <span className="sev high">Watch out</span>
        <b>Minimum payments only</b>
        <p>It takes {Math.round(minOnly.months / 12)} years and costs {money(minOnly.interest - fixed.interest)} more in interest than paying £50 a month.</p>
      </div>

      <Link href="/cost-checker?type=card" className="btn btn-dark hero-card-row" style={{ width: "100%" }}>
        Try it with your own numbers <Icon name="arrow" size={18} />
      </Link>
    </div>
  );
}
