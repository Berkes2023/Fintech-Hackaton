"use client";

import { useState } from "react";
import { productDNA, type ProductDNA } from "@/lib/dna";
import { dur, money, pct } from "@/lib/format";
import { fieldLabel, PRODUCTS, simulate } from "@/lib/finance";
import { PasteFill, type FillResult, type Sample } from "./PasteFill";

const OFFER_A = `Personal Loan - Offer A
Borrow £5,000 over 36 months. Representative 12.9% APR fixed for the full term.
Monthly repayment £166.54. Total amount payable £5,995.33.
Late payment fee: £15. You can repay early at any time with no charge.`;

const OFFER_B = `Flexi Loan - Offer B
LOWER MONTHLY PAYMENTS! Borrow £5,000 over 48 months at 10.9% APR (variable).
Monthly repayment £127.75. Total amount payable £6,132.14.
A £25 fee applies to each missed payment. Early settlement: a charge of up to 58 days' interest applies.
The rate may change if the Bank of England base rate changes.`;

interface Side { r: FillResult; dna: ProductDNA }
const NAMES = ["Offer A", "Offer B"];

function build(r: FillResult): Side {
  const m = simulate(r.type, r.values);
  return { r, dna: productDNA(r.type, r.values, m, r.conditions.map((c) => c.kind), r.missing.map((id) => fieldLabel(r.type, id))) };
}

type Row = [label: string, get: (s: Side) => string];
const ROWS: Row[] = [
  ["Product", (s) => PRODUCTS[s.r.type].label],
  ["Regular payment", (s) => `${money(s.dna.regular_payment, true)} ${s.dna.frequency}`],
  ["Length", (s) => (s.dna.term_months === null ? "Never cleared" : dur(s.dna.term_months))],
  ["Interest rate", (s) => (s.dna.rate.measure ? `${pct(s.dna.rate.value ?? 0)} ${s.dna.rate.measure}` : "None")],
  ["Rate type", (s) => s.dna.rate.kind],
  ["Upfront fee", (s) => money(s.dna.fees.upfront)],
  ["Late payment fee", (s) => money(s.dna.fees.late)],
  ["Early repayment", (s) => s.dna.early_repayment],
  ["Total payable", (s) => (s.dna.total_payable === null ? "Never cleared" : money(s.dna.total_payable))],
  ["Cost above the price", (s) => (s.dna.cost_above_price === null ? "—" : money(s.dna.cost_above_price))],
];

function differences(a: Side, b: Side): string[] {
  const out: string[] = [];
  const ta = a.dna.total_payable, tb = b.dna.total_payable;
  if (ta !== null && tb !== null && Math.abs(ta - tb) >= 1) out.push(`Total: ${NAMES[ta < tb ? 1 : 0]} costs ${money(Math.abs(ta - tb))} more overall.`);
  const ma = a.dna.regular_payment, mb = b.dna.regular_payment;
  if (Math.abs(ma - mb) >= 1) out.push(`Monthly: ${NAMES[ma < mb ? 0 : 1]} has the lower payment, by ${money(Math.abs(ma - mb), true)}.`);
  if (a.dna.term_months !== b.dna.term_months && a.dna.term_months && b.dna.term_months) out.push(`Length: ${NAMES[a.dna.term_months > b.dna.term_months ? 0 : 1]} ties you in for ${dur(Math.abs(a.dna.term_months - b.dna.term_months))} longer.`);
  if (a.dna.rate.kind !== b.dna.rate.kind) out.push(`Rate: ${NAMES[a.dna.rate.kind === "variable" ? 0 : 1]} has a variable rate, so its payments could change.`);
  if (a.dna.fees.late !== b.dna.fees.late) out.push(`Missed payments: ${NAMES[a.dna.fees.late > b.dna.fees.late ? 0 : 1]} charges more (${money(Math.max(a.dna.fees.late, b.dna.fees.late))} vs ${money(Math.min(a.dna.fees.late, b.dna.fees.late))}).`);
  if (a.dna.early_repayment !== b.dna.early_repayment) out.push(`Paying early: ${NAMES[0]} is “${a.dna.early_repayment}”, ${NAMES[1]} is “${b.dna.early_repayment}”.`);
  return out;
}

/** Decode two offers and compare them clause by clause. States the differences, never picks a winner. */
export function ContractDiff() {
  const [a, setA] = useState<Side | null>(null);
  const [b, setB] = useState<Side | null>(null);
  const samplesA: Sample[] = [{ label: "Example: Offer A", text: OFFER_A }];
  const samplesB: Sample[] = [{ label: "Example: Offer B", text: OFFER_B }];

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="grid-2">
        <div className="stack"><p className="h3">Offer A {a && <span className="pill-label">Decoded</span>}</p><PasteFill idPrefix="offer-a" title="Upload or paste Offer A" samples={samplesA} onFill={(r) => setA(build(r))} /></div>
        <div className="stack"><p className="h3">Offer B {b && <span className="pill-label">Decoded</span>}</p><PasteFill idPrefix="offer-b" title="Upload or paste Offer B" samples={samplesB} onFill={(r) => setB(build(r))} /></div>
      </div>

      {a && b ? (
        <>
          <section className="card stack" aria-labelledby="diff-big">
            <h2 id="diff-big" className="h3">The biggest differences</h2>
            <ul className="questions" style={{ listStyle: "disc", paddingLeft: 20 }}>
              {differences(a, b).map((d) => <li key={d}>{d}</li>)}
            </ul>
            <p className="small muted">These are the facts side by side. Which matters most depends on you, so we don’t pick one.</p>
          </section>
          <div className="table-wrap">
            <table className="cmp">
              <thead><tr><th scope="col"><span className="caption">Clause</span></th><th scope="col">Offer A</th><th scope="col">Offer B</th></tr></thead>
              <tbody>
                {ROWS.map(([label, get]) => {
                  const va = get(a), vb = get(b);
                  return <tr key={label} className={va !== vb ? "priority" : undefined}><th scope="row">{label}{va !== vb && <span className="small"> · differs</span>}</th><td>{va}</td><td>{vb}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="grid-2">
            {[a, b].map((s, i) => (
              <section key={i} className="card stack">
                <h3 className="h3">{NAMES[i]}: conditions found</h3>
                {s.r.conditions.length ? (
                  <ul className="risks">
                    {s.r.conditions.map((c, j) => <li key={j} className="risk"><b>{c.title}</b><p>{c.plain}</p><p className="quote">“{c.quote}”</p></li>)}
                  </ul>
                ) : <p className="small muted">None found.</p>}
              </section>
            ))}
          </div>
        </>
      ) : (
        <p className="list small">Decode both offers to see them side by side. Use the example buttons to try it with two sample loans.</p>
      )}
    </div>
  );
}
