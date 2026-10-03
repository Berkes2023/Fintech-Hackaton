"use client";

import { useEffect, useId, useRef, useState } from "react";
import { dur, money } from "@/lib/format";

export interface Series {
  name: string;
  pts: { t: number; y: number }[];
  /** "step" draws payments as they land; "line" joins points (balances). */
  kind?: "step" | "line";
  dash?: string;
  /** Stroke colour for line series (defaults to slate). */
  color?: string;
  /** Shade under the line; with `refLine`, the part above it is shaded darker. */
  fill?: boolean;
  /** Leave out of the tooltip. */
  quiet?: boolean;
}

interface Props {
  series: Series[];
  refLine?: { y: number; label: string };
  height?: number;
  label: string;
  endLabels?: boolean;
  /** Value formatter for the axis and tooltip (defaults to money). */
  format?: (v: number) => string;
  /** Label for an x tick, given the x value (defaults to months/years). */
  xTick?: (t: number) => string;
  /** Tick spacing on the x axis, in x units. */
  xStep?: number;
  /** Tooltip heading for an x value (defaults to "After 2 years"). */
  tipLabel?: (t: number) => string;
  /** Include 0 on the y axis even for line-only charts. */
  yMin?: number;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}
const valueAt = (pts: Series["pts"], t: number) => {
  let v = 0;
  for (const p of pts) { if (p.t <= t + 1e-9) v = p.y; else break; }
  return v;
};

export function Chart({ series, refLine, height = 280, label, endLabels = true, format = money, xTick, xStep, tipLabel, yMin = 0 }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId().replace(/:/g, "");

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = height, L = 64, R = 20, T = 18, B = 36;
  const tMax = Math.max(1, ...series.map((s) => (s.pts.length ? s.pts[s.pts.length - 1].t : 1)));
  // Round tick spacing (1, 2, 2.5, 5 × 10ⁿ) so axis labels read as whole numbers.
  const values = series.flatMap((s) => s.pts.map((p) => p.y));
  const dataLo = Math.min(yMin, ...values);
  const dataHi = Math.max(refLine?.y ?? 0, ...values) * 1.04;
  const yStep = niceMax((dataHi - dataLo) / 5 || 1);
  const yLo = Math.floor(dataLo / yStep) * yStep;
  const yMax = Math.max(yLo + yStep, Math.ceil(dataHi / yStep) * yStep);
  const x = (t: number) => L + ((W - L - R) * t) / tMax;
  const y = (v: number) => T + (H - T - B) * (1 - (v - yLo) / (yMax - yLo));
  const yTicks: number[] = [];
  for (let v = yLo; v <= yMax + yStep / 1e6; v += yStep) yTicks.push(Math.abs(v) < yStep / 1e6 ? 0 : v);
  const step = xStep ?? (tMax <= 6 ? 1 : tMax <= 24 ? 3 : tMax <= 60 ? 12 : tMax <= 180 ? 24 : 60);
  const xTicks: number[] = [];
  for (let t = 0; t <= tMax + 1e-9; t += step) xTicks.push(t);
  const xLabel = xTick ?? ((t: number) => (step >= 12 ? `${t / 12}y` : `${t}m`));

  const stepPath = (pts: Series["pts"]) => {
    let d = `M${x(0)},${y(yLo)}`, prev = yLo;
    for (const p of pts) { d += ` L${x(p.t)},${y(prev)} L${x(p.t)},${y(p.y)}`; prev = p.y; }
    return d;
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) * W) / r.width;
    setHover(Math.round(Math.max(0, Math.min(tMax, ((px - L) / (W - L - R)) * tMax))));
  };

  return (
    <div className="chart-wrap" ref={wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#ececee" />
            <text x={L - 10} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#717173">{format(v)}</text>
          </g>
        ))}
        {xTicks.map((t) => <text key={t} x={x(t)} y={H - 12} textAnchor="middle" fontSize="12" fill="#717173">{xLabel(t)}</text>)}

        {series.map((s, i) => {
          if (!s.pts.length) return null;
          const last = s.pts[s.pts.length - 1];
          if (s.kind === "line") {
            const d = s.pts.map((p, j) => `${j ? "L" : "M"}${x(p.t)},${y(p.y)}`).join(" ");
            return <path key={s.name} d={d} fill="none" stroke={s.color ?? "#717173"} strokeWidth="2" strokeDasharray={s.dash} />;
          }
          const d = stepPath(s.pts);
          const area = `${d} L${x(last.t)},${y(0)} Z`;
          return (
            <g key={s.name}>
              {s.fill && <path d={area} fill="#f2f2f3" />}
              {s.fill && refLine && (
                <>
                  <clipPath id={`${clipId}-${i}`}><rect x={L} y={T} width={W} height={Math.max(0, y(refLine.y) - T)} /></clipPath>
                  <path d={area} fill="#c9c9cd" clipPath={`url(#${clipId}-${i})`} />
                </>
              )}
              <path d={d} fill="none" stroke="#1f1f1f" strokeWidth="2.25" strokeLinejoin="round" strokeDasharray={s.dash} />
              <circle cx={x(last.t)} cy={y(last.y)} r="4.5" fill="#1f1f1f" />
              {endLabels && (
                <text x={Math.min(x(last.t), W - R)} y={y(last.y) - 12} textAnchor="end" fontSize="13" fontWeight="600" fill="#1f1f1f">{money(last.y)}</text>
              )}
            </g>
          );
        })}

        {refLine && refLine.y > 0 && (
          <g>
            <line x1={L} x2={W - R} y1={y(refLine.y)} y2={y(refLine.y)} stroke="#1f1f1f" strokeDasharray="2 4" strokeWidth="1.5" />
            <text x={L + 8} y={y(refLine.y) - 8} fontSize="12.5" fontWeight="600" fill="#1f1f1f">{refLine.label}: {money(refLine.y)}</text>
          </g>
        )}

        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#717173" strokeWidth="1" />}
        <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent" />
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: T }}>
          <b>{tipLabel ? tipLabel(hover) : hover === 0 ? "At the start" : `After ${dur(hover)}`}</b>
          {series.filter((s) => !s.quiet).map((s) => <div key={s.name}>{s.name}: {format(valueAt(s.pts, hover))}</div>)}
        </div>
      )}
    </div>
  );
}
