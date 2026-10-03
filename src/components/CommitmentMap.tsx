"use client";

import Link from "next/link";
import { commitmentMap } from "@/lib/dna";
import { dur, money } from "@/lib/format";
import { PRODUCTS, type SavedOption } from "@/lib/finance";
import { commitmentsStore, newOptionId, thisMonth } from "@/lib/store";
import { Chart } from "./Chart";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const endDate = (start: string, months: number) => { const [y, m] = start.split("-").map(Number); const k = y * 12 + (m - 1) + months; return `${MONTHS[k % 12]} ${Math.floor(k / 12)}`; };

const EXAMPLE: Omit<SavedOption, "id">[] = [
  { name: "Phone contract", type: "household", values: { monthly: 32, upfront: 0, term: 24, riseAmt: 3, exitFee: 180 } },
  { name: "Laptop (Pay in 3)", type: "bnpl", values: { price: 900, n: 3, interval: "month", apr: 0, lateFee: 5, missed: 0 } },
  { name: "Car loan", type: "loan", values: { amount: 6000, apr: 9.9, term: 48, fee: 0, lateFee: 15 } },
  { name: "Streaming", type: "subscription", values: { monthly: 10.99, introPrice: 10.99, introMonths: 0, rise: 5, years: 3, cancelFee: 0 } },
];

/** Everything someone already pays, on one timeline: monthly outgoings now, and what's still to come. */
export function CommitmentMap() {
  const list = commitmentsStore.use();
  const start = thisMonth();

  if (!list.length) {
    return (
      <div className="list stack" style={{ justifyItems: "start" }}>
        <p>Your map is empty. Add things you already pay from the cost checker (“I already pay this”), or load an example.</p>
        <div className="row">
          <Link href="/cost-checker" className="btn btn-dark">Open the cost checker</Link>
          <button type="button" className="btn btn-light" onClick={() => commitmentsStore.set(EXAMPLE.map((e) => ({ ...e, id: newOptionId() })))}>Load an example</button>
        </div>
      </div>
    );
  }

  const map = commitmentMap(list);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="tiles" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="tile"><span className="caption">Going out each month now</span><span className="v">{money(map.monthlyNow, true)}</span></div>
        <div className="tile emph"><span className="caption">Still to pay, in total</span><span className="v">{money(map.futureTotal)}{map.anyNever ? "+" : ""}</span></div>
        <div className="tile"><span className="caption">Commitments</span><span className="v">{list.length}</span></div>
      </div>

      <section className="card stack" aria-labelledby="map-title">
        <h2 id="map-title" className="h3">Your commitment timeline</h2>
        <ul className="gantt">
          {map.items.map((i) => (
            <li key={i.c.id}>
              <span className="gantt-name"><b>{i.c.name}</b><span className="small muted">{PRODUCTS[i.c.type].label} · {money(i.monthly, true)} a month</span></span>
              <span className="gantt-track" aria-hidden="true">
                <span className={`gantt-bar${i.ongoing ? " ongoing" : ""}`} style={{ width: `${Math.max(2, ((i.months ?? map.horizon) / map.horizon) * 100)}%` }} />
              </span>
              <span className="gantt-end small">{i.ongoing && i.c.type === "subscription" ? "Ongoing" : i.months === null ? "Never cleared" : `Ends ${endDate(start, i.months)} · ${dur(i.months)}`}</span>
              <button type="button" className="link small" onClick={() => commitmentsStore.set(list.filter((x) => x.id !== i.c.id))}>Remove</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack" aria-labelledby="out-title">
        <h2 id="out-title" className="h3">What goes out each month, over time</h2>
        <Chart label="Total monthly outgoings on commitments over time" endLabels={false} series={[{ name: "Each month", kind: "line", color: "#1f1f1f", pts: map.byMonth.map((y, t) => ({ t, y })) }]} />
        <p className="small muted">The line steps down as each commitment ends. Subscriptions are shown for the time you said you might keep them.</p>
      </section>
    </div>
  );
}
