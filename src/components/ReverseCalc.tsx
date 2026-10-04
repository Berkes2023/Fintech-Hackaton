"use client";

import { useState } from "react";
import { reverse } from "@/lib/dna";
import { dur, money } from "@/lib/format";

/** Start from a monthly amount and see what it means over different lengths. Exploration, not a recommendation. */
export function ReverseCalc() {
  const [monthly, setMonthly] = useState("150");
  const [apr, setApr] = useState("19.9");
  const rows = reverse(Number(monthly) || 0, Number(apr) || 0);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="stress-inputs" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", maxWidth: 640 }}>
        <div className="field"><label htmlFor="rv-m">Monthly amount</label><div className="input"><span>£</span><input id="rv-m" type="number" min={0} step={10} inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></div></div>
        <div className="field"><label htmlFor="rv-a">Interest rate (APR)</label><div className="input"><input id="rv-a" type="number" min={0} step={0.1} inputMode="decimal" value={apr} onChange={(e) => setApr(e.target.value)} /><span>%</span></div></div>
      </div>
      <div className="table-wrap">
        <table className="cmp">
          <thead><tr><th scope="col">For</th><th scope="col">Pays off borrowing of about</th><th scope="col">You pay in total</th><th scope="col">Of which interest</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.months}>
                <th scope="row">{dur(r.months)}</th>
                <td>{money(r.principal)}</td>
                <td>{money(r.total)}</td>
                <td>{money(r.interest)} {r.total > 0 && <span className="small muted">({Math.round((r.interest / r.total) * 100)}%)</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">The longer the same monthly payment runs, the more of it goes on interest. These are estimates, not offers or advice.</p>
    </div>
  );
}
