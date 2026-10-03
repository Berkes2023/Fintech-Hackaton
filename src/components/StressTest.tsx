"use client";

import { money } from "@/lib/format";
import { stressTest } from "@/lib/finance";

export interface Budget { income: string; essentials: string; existing: string }

/** Shows what would be left each month, including if things get tighter. Consequences, not a verdict. */
export function StressTest({ budget, onChange, payment, perLabel }: { budget: Budget; onChange: (b: Budget) => void; payment: number; perLabel: string }) {
  const income = Number(budget.income) || 0;
  const rows = income > 0 ? stressTest({ income, essentials: Number(budget.essentials) || 0, existing: Number(budget.existing) || 0, payment }) : [];
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.left)));
  const field = (id: keyof Budget, label: string, placeholder: string) => (
    <div className="field">
      <label htmlFor={`st-${id}`}>{label}</label>
      <div className="input"><span>£</span><input id={`st-${id}`} type="number" min={0} step={10} inputMode="decimal" placeholder={placeholder} value={budget[id]} onChange={(e) => onChange({ ...budget, [id]: e.target.value })} /></div>
    </div>
  );

  return (
    <section className="card stack anchor-target" id="afford" aria-labelledby="stress-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="stress-title" className="h3">Stress test your month</h2>
        <span className="small muted">Stays in your browser</span>
      </div>
      <p className="small muted">Add rough monthly figures to see what this payment ({money(payment, true)} {perLabel}) leaves you with, now and if things get tighter.</p>
      <div className="stress-inputs">
        {field("income", "Take-home pay", "e.g. 2000")}
        {field("essentials", "Essential bills", "e.g. 1250")}
        {field("existing", "Other repayments", "e.g. 300")}
      </div>
      {rows.length > 0 && (
        <ul className="stress-rows">
          {rows.map((r, i) => (
            <li key={r.label} className={i === 0 ? "base" : undefined}>
              <span className="stress-label">{r.label}</span>
              <span className="stress-bar" aria-hidden="true">
                <span className={r.left < 0 ? "neg" : "pos"} style={{ width: `${(Math.abs(r.left) / max) * 100}%` }} />
              </span>
              <span className="stress-value">{r.left < 0 ? `Short by ${money(-r.left)}` : `${money(r.left)} left`}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
