"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dur, money } from "@/lib/format";
import { EXAMPLES, PRODUCTS, risks, simulate, type Metrics, type Risk, type SavedOption } from "@/lib/finance";
import { draftStore, savedStore } from "@/lib/store";
import { Chart } from "./Chart";

const DASHES = [undefined, "8 5", "2 4", "12 4 2 4"];

interface Row { o: SavedOption; m: Metrics; r: Risk[] }
type Line = [label: string, fmt: (r: Row) => string, key?: (r: Row) => number];

const PRIORITIES: { id: string; label: string; line: string }[] = [
  { id: "monthly", label: "Monthly affordability", line: "Regular payment" },
  { id: "total", label: "Total cost", line: "Total you pay" },
  { id: "length", label: "How long I’m tied in", line: "Time to finish" },
  { id: "extra", label: "Interest and fees", line: "Cost on top" },
  { id: "soon", label: "Cost in the next 3 months", line: "First 3 months" },
];

const LINES: Line[] = [
  ["Type", (r) => PRODUCTS[r.o.type].label],
  ["Regular payment", (r) => `${money(r.m.regular, true)} ${r.o.type === "bnpl" && r.o.values.interval === "fortnight" ? "/ 2 weeks" : "/ month"}`, (r) => r.m.regular],
  ["First 3 months", (r) => money(r.m.next3), (r) => r.m.next3],
  ["Total you pay", (r) => (r.m.never ? "Never ends" : money(r.m.total)), (r) => (r.m.never ? Infinity : r.m.total)],
  ["Cost on top", (r) => (r.m.never ? "—" : money(Math.max(0, r.m.onTop))), (r) => (r.m.never ? Infinity : r.m.onTop)],
  ["Time to finish", (r) => (r.m.never ? "Never" : dur(r.m.end)), (r) => (r.m.never ? Infinity : r.m.end)],
  ["Warnings", (r) => `${r.r.filter((x) => x.lvl === "high").length} watch out · ${r.r.filter((x) => x.lvl === "watch").length} check`],
];

export function ComparePanel() {
  const saved = savedStore.use();
  const router = useRouter();
  const [priorities, setPriorities] = useState<string[]>([]);
  const togglePriority = (id: string) => setPriorities((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const wanted = PRIORITIES.filter((p) => priorities.includes(p.id)).map((p) => p.line);
  const lines = [...LINES.filter(([l]) => wanted.includes(l)), ...LINES.filter(([l]) => !wanted.includes(l))];
  const rows: Row[] = saved.map((o) => { const m = simulate(o.type, o.values); return { o, m, r: risks(o.type, o.values, m) }; });

  const edit = (o: SavedOption) => {
    draftStore.set({ type: o.type, values: { ...o.values }, example: !!o.example });
    router.push(`/check?type=${o.type}`);
  };
  const remove = (id: string) => savedStore.set(saved.filter((o) => o.id !== id));

  if (!rows.length) {
    return (
      <div className="list stack" style={{ justifyItems: "start" }}>
        <p>Nothing saved yet. Use “Add to comparison” in the cost checker to line up to four options.</p>
        <div className="row">
          <Link href="/check" className="btn btn-dark">Open the cost checker</Link>
          <button type="button" className="btn btn-light" onClick={() => savedStore.set(EXAMPLES)}>Load the laptop example</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="list stack" style={{ gap: 12 }}>
        <p style={{ fontWeight: 600 }}>What do you most want to understand?</p>
        <div className="chips" role="group" aria-label="Your priorities">
          {PRIORITIES.map((p) => <button key={p.id} type="button" className="chip" aria-pressed={priorities.includes(p.id)} onClick={() => togglePriority(p.id)}>{p.label}</button>)}
        </div>
        {wanted.length > 0 && rows.length > 1 && (
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            {LINES.filter(([l, , key]) => wanted.includes(l) && key).map(([l, fmt, key]) => {
              const vals = rows.map(key!);
              const lo = Math.min(...vals);
              const who = rows.filter((_, i) => vals[i] === lo);
              return <li key={l}><b>{l}:</b> lowest is {who.map((r) => r.o.name).join(" and ")} ({fmt(who[0])}).</li>;
            })}
            <li className="muted">These are facts about each option, sorted by what you picked. They’re not a recommendation.</li>
          </ul>
        )}
      </div>
      <div className="table-wrap">
        <table className="cmp">
          <thead>
            <tr>
              <th scope="col"><span className="caption">Option</span></th>
              {rows.map((r, i) => (
                <th scope="col" key={r.o.id}>
                  <span className="swatch" style={{ borderTopStyle: i === 2 ? "dotted" : i ? "dashed" : "solid" }} />
                  {r.o.name}
                  {r.o.example && <span className="pill-label" style={{ marginLeft: 8 }}>Example</span>}
                  <div className="row" style={{ marginTop: 8 }}>
                    <button type="button" className="btn btn-light btn-sm" onClick={() => edit(r.o)}>Edit</button>
                    <button type="button" className="link small" onClick={() => remove(r.o.id)}>Remove</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map(([label, fmt, key]) => {
              const vals = key ? rows.map(key) : null;
              const min = vals ? Math.min(...vals) : null;
              const markLow = vals && rows.length > 1 && vals.filter((x) => x === min).length === 1;
              return (
                <tr key={label} className={wanted.includes(label) ? "priority" : undefined}>
                  <th scope="row">{label}</th>
                  {rows.map((r, i) => <td key={r.o.id} className={markLow && vals[i] === min ? "lo" : undefined}>{fmt(r)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="card stack" aria-labelledby="cmp-chart">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 id="cmp-chart" className="h3">Total paid over time</h2>
          <div className="legend">
            {rows.map((r, i) => <span key={r.o.id}><i style={{ borderTopStyle: i === 2 ? "dotted" : i ? "dashed" : "solid" }} />{r.o.name}</span>)}
          </div>
        </div>
        <Chart
          label="Total paid over time for each saved option"
          height={300}
          series={rows.map((r, i) => ({ name: r.o.name, dash: DASHES[i % DASHES.length], pts: r.m.s.map((p) => ({ t: p.t, y: p.cum })) }))}
        />
      </section>
    </div>
  );
}
