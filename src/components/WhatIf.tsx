"use client";

import { useState } from "react";
import { dur, money } from "@/lib/format";
import { canOverpay, simulate, whatIfKnob, type Metrics, type ProductType, type Values } from "@/lib/finance";

function Delta({ now, then, unit = "money", better = "lower" }: { now: number; then: number; unit?: "money" | "months"; better?: "lower" | "higher" }) {
  const d = then - now;
  if (Math.abs(d) < (unit === "months" ? 0.5 : 0.5)) return <span className="delta">no change</span>;
  const text = unit === "months" ? `${dur(Math.abs(d))} ${d < 0 ? "sooner" : "longer"}` : `${money(Math.abs(d))} ${d < 0 ? "less" : "more"}`;
  const good = better === "lower" ? d < 0 : d > 0;
  return <span className={`delta ${good ? "down" : "up"}`}>{d < 0 ? "▼" : "▲"} {text}</span>;
}

/** Drag a dial and see the monthly cost, total and time in debt change together. */
export function WhatIf({ type, v, base, onApply }: { type: ProductType; v: Values; base: Metrics; onApply: (id: string, value: number) => void }) {
  const knob = whatIfKnob(type, v);
  const [dial, setDial] = useState<number | null>(null);
  const [extra, setExtra] = useState(0);
  if (!knob && !canOverpay(type)) return null;

  const current = knob ? Number(v[knob.id]) || knob.min : 0;
  const value = dial ?? current;
  const scenario = simulate(type, knob ? { ...v, [knob.id]: value } : v, extra);

  return (
    <section className="card stack" aria-labelledby="whatif-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="whatif-title" className="h3">What if…?</h2>
        <span className="small muted">A simulation, not a recommendation</span>
      </div>

      {knob && (
        <div className="slider">
          <label htmlFor="whatif-dial">{knob.label}: <b>{knob.unit(value)}</b></label>
          <input id="whatif-dial" type="range" min={knob.min} max={Math.max(knob.max, current)} step={knob.step} value={value}
            onChange={(e) => setDial(Number(e.target.value))} />
          <div className="slider-ends small muted"><span>{knob.unit(knob.min)}</span><span>{knob.unit(Math.max(knob.max, current))}</span></div>
        </div>
      )}
      {canOverpay(type) && (
        <div className="slider">
          <label htmlFor="whatif-extra">Pay extra each month: <b>{money(extra)}</b></label>
          <input id="whatif-extra" type="range" min={0} max={300} step={10} value={extra} onChange={(e) => setExtra(Number(e.target.value))} />
          <div className="slider-ends small muted"><span>£0</span><span>£300</span></div>
        </div>
      )}

      <div className="whatif-grid">
        <div><span className="caption">Monthly</span><b>{money(scenario.regular, true)}</b><Delta now={base.regular} then={scenario.regular} /></div>
        <div><span className="caption">Total you pay</span><b>{scenario.never ? "Never ends" : money(scenario.total)}</b>{!scenario.never && !base.never && <Delta now={base.total} then={scenario.total} />}</div>
        <div><span className="caption">Time to finish</span><b>{scenario.never ? "30+ years" : dur(scenario.end)}</b>{!scenario.never && !base.never && <Delta now={base.end} then={scenario.end} unit="months" />}</div>
      </div>

      {!scenario.never && !base.never && Math.abs(scenario.regular - base.regular) > 0.5 && Math.sign(scenario.regular - base.regular) !== Math.sign(scenario.total - base.total) && (
        <p className="small list">
          {scenario.regular < base.regular
            ? `Lower monthly payments, but you pay ${money(scenario.total - base.total)} more overall and stay in debt longer.`
            : `Higher monthly payments, but you pay ${money(base.total - scenario.total)} less overall and finish sooner.`}
        </p>
      )}

      <div className="row">
        {knob && dial !== null && dial !== current && (
          <button type="button" className="btn btn-light btn-sm" onClick={() => { onApply(knob.id, dial); setDial(null); }}>Use {knob.unit(dial)} in my figures</button>
        )}
        {(dial !== null || extra > 0) && <button type="button" className="link small quiet" onClick={() => { setDial(null); setExtra(0); }}>Reset</button>}
      </div>
    </section>
  );
}
