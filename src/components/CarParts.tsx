"use client";

import { money } from "@/lib/format";
import { newOptionId } from "@/lib/store";
import { SOURCE_LABEL, type Debt, type DebtKind, type Explained, type Line, type Freq, type FutureEvent, type Item, type Recurrence, type Source } from "@/lib/sim";

/** Labels where a number came from, so the categories never blur. */
export function SourceBadge({ source }: { source: Source }) {
  return <span className={`src src-${source}`}>{SOURCE_LABEL[source]}</span>;
}

/** "Why am I seeing this?": every line behind a calculated number. */
export function WhyBreakdown({ title, result, extra = [], note }: { title: string; result: Explained; extra?: Line[]; note?: string }) {
  const lines = [...result.lines, ...extra];
  const total = lines.reduce((a, l) => a + l.amount, 0);
  return (
    <details className="why">
      <summary>Why am I seeing this?</summary>
      <p className="small muted" style={{ margin: "8px 0" }}>{title}</p>
      <table className="why-table">
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}><td>{l.label}{l.note ? <span className="small muted"> · {l.note}</span> : null}</td><td><SourceBadge source={l.source} /></td><td className="num">{l.amount >= 0 ? "+" : "−"}{money(Math.abs(l.amount), true)}</td></tr>
          ))}
          <tr className="why-total"><td>= Total</td><td><SourceBadge source="we_calculated" /></td><td className="num">{money(total, true)}</td></tr>
        </tbody>
      </table>
      {note && <p className="small" style={{ marginTop: 8 }}>{note}</p>}
    </details>
  );
}

const FREQ: Record<Freq, string> = { weekly: "a week", monthly: "a month", yearly: "a year" };
const DEBT_KIND: Record<DebtKind, string> = { loan: "Personal loan", car: "Car finance", card: "Credit card", overdraft: "Overdraft", bnpl: "Buy Now Pay Later", other: "Other" };

/** A list of money items, with quick-add suggestions. Weekly and yearly amounts are converted to monthly by code. */
export function ItemEditor<T extends Item>({ items, onChange, suggestions, debts = false, idPrefix }: {
  items: T[]; onChange: (items: T[]) => void; suggestions: string[]; debts?: boolean; idPrefix: string;
}) {
  const update = (id: string, patch: Partial<T>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const add = (label: string) => {
    const base: Item = { id: newOptionId(), label, amount: 0, freq: "monthly", origin: "manual" };
    onChange([...items, (debts ? { ...base, kind: "loan" } : base) as T]);
  };
  const unused = suggestions.filter((s) => !items.some((i) => i.label === s));
  return (
    <div className="stack" style={{ gap: 10 }}>
      <ul className="items">
        {items.map((i) => (
          <li key={i.id}>
            <div className="field"><label htmlFor={`${idPrefix}-l-${i.id}`}>What</label><div className="input"><input id={`${idPrefix}-l-${i.id}`} value={i.label} onChange={(e) => update(i.id, { label: e.target.value } as Partial<T>)} style={{ fontFamily: "inherit" }} /></div></div>
            <div className="field"><label htmlFor={`${idPrefix}-a-${i.id}`}>Amount</label><div className="input"><span>£</span><input id={`${idPrefix}-a-${i.id}`} type="number" min={0} step={5} inputMode="decimal" value={i.amount || ""} placeholder="0" onChange={(e) => update(i.id, { amount: Number(e.target.value) || 0 } as Partial<T>)} /></div></div>
            <div className="field"><label htmlFor={`${idPrefix}-f-${i.id}`}>How often</label><div className="input"><select id={`${idPrefix}-f-${i.id}`} value={i.freq} onChange={(e) => update(i.id, { freq: e.target.value as Freq } as Partial<T>)}>{(Object.keys(FREQ) as Freq[]).map((f) => <option key={f} value={f}>{FREQ[f]}</option>)}</select></div></div>
            {debts && (
              <>
                <div className="field"><label htmlFor={`${idPrefix}-k-${i.id}`}>Type</label><div className="input"><select id={`${idPrefix}-k-${i.id}`} value={(i as unknown as Debt).kind} onChange={(e) => update(i.id, { kind: e.target.value } as unknown as Partial<T>)}>{(Object.keys(DEBT_KIND) as DebtKind[]).map((k) => <option key={k} value={k}>{DEBT_KIND[k]}</option>)}</select></div></div>
                <div className="field"><label htmlFor={`${idPrefix}-e-${i.id}`}>Ends</label><div className="input"><select id={`${idPrefix}-e-${i.id}`} value={i.endsIn ?? 0} onChange={(e) => update(i.id, { endsIn: Number(e.target.value) || undefined } as Partial<T>)}><option value={0}>Ongoing</option>{Array.from({ length: 60 }, (_, k) => k + 1).map((m) => <option key={m} value={m}>In {m} month{m > 1 ? "s" : ""}</option>)}</select></div></div>
              </>
            )}
            <button type="button" className="link small" onClick={() => onChange(items.filter((x) => x.id !== i.id))}>Remove</button>
          </li>
        ))}
      </ul>
      <div className="chips">
        {unused.map((s) => <button key={s} type="button" className="chip" onClick={() => add(s)}>+ {s}</button>)}
        <button type="button" className="chip" onClick={() => add(debts ? "Another repayment" : "Something else")}>+ Add another</button>
      </div>
    </div>
  );
}

const RECUR: Record<Recurrence, string> = { one_off: "Just once", recurring_from: "Every month from then", stops_from: "Stops from then" };

export const EVENT_TEMPLATES: Omit<FutureEvent, "id">[] = [
  { label: "Bonus", amount: 2000, month: 1, direction: "in", recurrence: "one_off" },
  { label: "Pay rise", amount: 150, month: 3, direction: "in", recurrence: "recurring_from" },
  { label: "Overtime payment", amount: 300, month: 1, direction: "in", recurrence: "one_off" },
  { label: "Existing loan ends", amount: 180, month: 4, direction: "out", recurrence: "stops_from" },
  { label: "Rent goes up", amount: 100, month: 6, direction: "out", recurrence: "recurring_from" },
  { label: "University payment", amount: 1500, month: 2, direction: "in", recurrence: "one_off" },
  { label: "Big planned cost", amount: 800, month: 4, direction: "out", recurrence: "one_off" },
  { label: "Refund", amount: 250, month: 1, direction: "in", recurrence: "one_off" },
  { label: "Pension contribution changes", amount: 50, month: 3, direction: "out", recurrence: "recurring_from" },
];

/** Dated future events: amount, month, money in or out, and once or ongoing. */
export function EventEditor({ events, onChange, monthName }: { events: FutureEvent[]; onChange: (e: FutureEvent[]) => void; monthName: (m: number) => string }) {
  const update = (id: string, patch: Partial<FutureEvent>) => onChange(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  return (
    <div className="stack" style={{ gap: 10 }}>
      <ul className="items events">
        {events.map((e) => (
          <li key={e.id}>
            <div className="field"><label htmlFor={`ev-l-${e.id}`}>What</label><div className="input"><input id={`ev-l-${e.id}`} value={e.label} onChange={(x) => update(e.id, { label: x.target.value })} style={{ fontFamily: "inherit" }} /></div></div>
            <div className="field"><label htmlFor={`ev-a-${e.id}`}>{e.recurrence === "one_off" ? "Amount" : "Amount a month"}</label><div className="input"><span>£</span><input id={`ev-a-${e.id}`} type="number" min={0} step={10} value={e.amount || ""} placeholder="0" onChange={(x) => update(e.id, { amount: Number(x.target.value) || 0 })} /></div></div>
            <div className="field"><label htmlFor={`ev-d-${e.id}`}>Money</label><div className="input"><select id={`ev-d-${e.id}`} value={e.direction} onChange={(x) => update(e.id, { direction: x.target.value as "in" | "out" })}><option value="in">Coming in</option><option value="out">Going out</option></select></div></div>
            <div className="field"><label htmlFor={`ev-r-${e.id}`}>How often</label><div className="input"><select id={`ev-r-${e.id}`} value={e.recurrence} onChange={(x) => update(e.id, { recurrence: x.target.value as Recurrence })}>{(Object.keys(RECUR) as Recurrence[]).map((r) => <option key={r} value={r}>{RECUR[r]}</option>)}</select></div></div>
            <div className="field"><label htmlFor={`ev-m-${e.id}`}>When</label><div className="input"><select id={`ev-m-${e.id}`} value={e.month} onChange={(x) => update(e.id, { month: Number(x.target.value) })}>{Array.from({ length: 36 }, (_, k) => k + 1).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}</select></div></div>
            <button type="button" className="link small" onClick={() => onChange(events.filter((x) => x.id !== e.id))}>Remove</button>
          </li>
        ))}
      </ul>
      <div className="chips">
        {EVENT_TEMPLATES.map((t) => <button key={t.label} type="button" className="chip" onClick={() => onChange([...events, { ...t, id: newOptionId() }])}>+ {t.label}</button>)}
      </div>
    </div>
  );
}

/** Teaches what a credit profile is, and that it isn't the same as affordability. Fixed text, no invented weightings. */
export function CreditExplainer() {
  return (
    <details className="list explainer">
      <summary>How does my credit profile fit into this?</summary>
      <div className="stack" style={{ marginTop: 12 }}>
        <p className="small">There’s no single official UK credit score. Experian, Equifax and TransUnion each use their own scoring, and lenders use their own models too. Before You Sign never calculates a score for you.</p>
        <p className="small"><b>Things that can show on a credit report and affect scoring include:</b></p>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
          <li>Whether you’ve repaid on time</li>
          <li>Missed or late payments</li>
          <li>How much you already borrow</li>
          <li>How much of your credit limits you use</li>
          <li>Recent applications for credit</li>
          <li>How long you’ve had credit accounts</li>
          <li>Public records, such as county court judgments</li>
        </ul>
        <div className="grid-2" style={{ marginTop: 6 }}>
          <div className="card stack" style={{ padding: 18 }}><span className="caption">Credit profile</span><p className="small">Your history of borrowing and repaying. It helps a lender decide whether to offer credit, and at what rate.</p></div>
          <div className="card stack" style={{ padding: 18 }}><span className="caption">Affordability</span><p className="small">Whether a new payment fits your income, spending and plans. That’s what the rest of this journey shows.</p></div>
        </div>
        <p className="small"><b>A strong credit profile doesn’t automatically mean a new commitment is affordable.</b> They’re different questions.</p>
      </div>
    </details>
  );
}
