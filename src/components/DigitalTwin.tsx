"use client";

import { useState } from "react";
import { dur, money } from "@/lib/format";
import { scenarios, type ProductType, type Values } from "@/lib/finance";
import { Chart } from "./Chart";

const STYLE: Record<string, { color: string; dash?: string }> = {
  normal: { color: "#1f1f1f" },
  missed: { color: "#4c4c4c", dash: "8 5" },
  break: { color: "#717173", dash: "2 4" },
  rate: { color: "#4c4c4c", dash: "14 4 2 4" },
  extra: { color: "#a1a1a6" },
};

/** The commitment's “digital twin”: the same product replayed under things that happen in real life. */
export function DigitalTwin({ type, v }: { type: ProductType; v: Values }) {
  const all = scenarios(type, v);
  const [shown, setShown] = useState<string[]>(["normal", "missed", "break"]);
  if (!all.length) return null;
  const base = all[0].res;
  const visible = all.filter((s) => shown.includes(s.id));
  const toggle = (id: string) => setShown((x) => (x.includes(id) ? (x.length > 1 ? x.filter((y) => y !== id) : x) : [...x, id]));

  return (
    <section className="card stack" aria-labelledby="twin-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="twin-title" className="h3">Digital twin: test it against real life</h2>
        <span className="small muted">Simulated, month by month</span>
      </div>
      <p className="small muted">Before you commit in the real world, see how this behaves when life happens. Choose the stories to compare.</p>
      <div className="chips" role="group" aria-label="Scenarios">
        {all.map((s) => (
          <button key={s.id} type="button" className="chip" aria-pressed={shown.includes(s.id)} onClick={() => toggle(s.id)}>
            <i className="chip-line" style={{ borderTopColor: STYLE[s.id].color, borderTopStyle: STYLE[s.id].dash ? "dashed" : "solid" }} />
            {s.label}
          </button>
        ))}
      </div>
      <Chart
        label="Balance still owed each month under each scenario"
        endLabels={false}
        series={visible.map((s) => ({ name: s.label, kind: "line" as const, color: STYLE[s.id].color, dash: STYLE[s.id].dash, pts: s.res.pts.map((p) => ({ t: p.t, y: p.bal })) }))}
      />
      <p className="small muted" style={{ marginTop: -8 }}>Lines show what you still owe each month.</p>
      <div className="table-wrap">
        <table className="cmp">
          <thead>
            <tr><th scope="col">What happens</th><th scope="col">Total you pay</th><th scope="col">Compared with on time</th><th scope="col">Finished after</th></tr>
          </thead>
          <tbody>
            {all.map((s) => {
              const d = s.res.total - base.total;
              return (
                <tr key={s.id}>
                  <th scope="row"><span style={{ color: "var(--color-ink)" }}>{s.label}</span><br /><span className="small muted" style={{ fontWeight: 400 }}>{s.detail}</span></th>
                  <td>{s.res.never ? "Never cleared" : money(s.res.total)}</td>
                  <td>{s.id === "normal" ? "—" : s.res.never ? "Never cleared" : Math.abs(d) < 0.5 ? "No change" : `${d > 0 ? "▲" : "▼"} ${money(Math.abs(d))} ${d > 0 ? "more" : "less"}`}</td>
                  <td>{s.res.never ? "30+ years" : dur(s.res.end)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
