"use client";

import Link from "next/link";
import { useState } from "react";
import { gbp, savingsConsequence, snapshot, stressScenarios, type StressInput } from "@/lib/consequence";
import { nextDebtEnding } from "@/lib/insight";
import { carScenario, position, schedule } from "@/lib/sim";
import { carStore } from "@/lib/store";
import { SourceBadge, WhyBreakdown } from "./CarParts";
import { Icon } from "./Icon";

/**
 * Stress test your month, using the SAME situation the person entered in Plan (stored on this device).
 * Each scenario is a plain shock; before vs after comes from the consequence engine.
 */
export function StressMonth() {
  const st = carStore.use();
  const s0 = snapshot(st.picture);
  const hasCar = st.purchase.price > 0;
  const payment = hasCar ? schedule(carScenario(st)).regular : 0;
  const [withCar, setWithCar] = useState(true);
  // With the car included, savings start from what the deposit leaves (if it comes from savings), as in Plan.
  const deposit = hasCar && withCar && st.depositFromSavings !== false ? Math.min(st.purchase.deposit, s0.buffer) : 0;
  const s = deposit ? { ...s0, buffer: savingsConsequence(s0.buffer, deposit).after } : s0;
  const [amt, setAmt] = useState({ bills: 100, income: 300, rent: 100, unexpected: 500, overtime: 200 });
  const loan = nextDebtEnding(st.picture);

  if (s0.income <= 0) {
    return (
      <div className="notice stack">
        <p className="lead"><b>Tell us about your month first.</b></p>
        <p className="small">Stress testing uses the income, costs, borrowing and savings you enter in Plan, so you never type them twice. It takes about two minutes, and it all stays on this device.</p>
        <Link href="/plan" className="btn btn-dark" style={{ justifySelf: "start" }}>Tell us about my situation <Icon name="arrow" size={18} /></Link>
      </div>
    );
  }

  const inputs: StressInput[] = [
    { id: "bills", label: `Bills rise by ${gbp(amt.bills)} a month`, monthly: -amt.bills, oneOff: 0 },
    { id: "income", label: `Income falls by ${gbp(amt.income)} for 3 months`, monthly: -amt.income, oneOff: 0, months: 3 },
    { id: "rent", label: `Rent rises by ${gbp(amt.rent)} a month`, monthly: -amt.rent, oneOff: 0 },
    { id: "unexpected", label: `An unexpected ${gbp(amt.unexpected)} expense`, monthly: 0, oneOff: -amt.unexpected },
    { id: "overtime", label: `Overtime of ${gbp(amt.overtime)} a month stops for 3 months`, monthly: -amt.overtime, oneOff: 0, months: 3 },
    ...(loan ? [{ id: "loan", label: `Your ${loan.debt.label.toLowerCase()} end${/s$/i.test(loan.debt.label) ? "" : "s"}`, monthly: loan.monthly, oneOff: 0 }] : []),
  ];
  const rows = stressScenarios(s, hasCar && withCar ? payment : 0, inputs);
  const field = (k: keyof typeof amt, label: string) => (
    <div className="field" key={k}><label htmlFor={`stm-${k}`}>{label}</label><div className="input"><span>£</span><input id={`stm-${k}`} type="number" min={0} step={50} value={amt[k] || ""} placeholder="0" onChange={(e) => setAmt({ ...amt, [k]: Math.max(0, Number(e.target.value) || 0) })} /></div></div>
  );

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}><span className="caption">Your month today</span><SourceBadge source="you_told_us" /></div>
        <p className="h2" style={{ margin: 0 }}>{gbp(rows[0]?.remainingBefore ?? s.remaining)} <span className="small muted">estimated left each month{hasCar && withCar ? `, including the ${gbp(payment)} car payment you’re exploring` : ""}</span></p>
        <p className="small">Savings and cash buffer: <b>{gbp(s.buffer)}</b>{deposit ? ` (after the ${gbp(deposit)} deposit)` : ""}</p>
        {hasCar && (
          <label className="quiz-option small"><input type="checkbox" checked={withCar} onChange={(e) => setWithCar(e.target.checked)} /> Include the car payment I’m exploring in Plan</label>
        )}
        <WhyBreakdown title="From the situation you entered in Plan." result={position(st.picture)} />
      </div>

      <div className="stress-grid">
        {rows.map((r) => (
          <section key={r.id} className="stress-card" aria-label={r.label}>
            <b className="h3">{r.label}</b>
            <dl className="conseq-changes">
              <div><dt>Monthly remaining</dt><dd><span className="was">{gbp(r.remainingBefore)}</span><Icon name="arrow" size={16} /><b>{gbp(r.remainingAfter)}</b></dd></div>
              <div><dt>Savings{r.months ? ` after ${r.months} months` : ""}</dt><dd><span className="was">{gbp(r.bufferBefore)}</span><Icon name="arrow" size={16} /><b>{gbp(r.bufferAfter)}</b></dd></div>
            </dl>
            <p className="small">{r.sentence}</p>
          </section>
        ))}
      </div>

      <details className="why">
        <summary>Change the amounts</summary>
        <div className="journey-fields" style={{ marginTop: 12 }}>
          {field("bills", "Bills rise by (a month)")}{field("income", "Income falls by (a month)")}{field("rent", "Rent rises by (a month)")}{field("unexpected", "Unexpected expense")}{field("overtime", "Overtime lost (a month)")}
        </div>
      </details>
      <details className="why">
        <summary>What assumptions are we using?</summary>
        <p className="small">Each scenario changes one thing and keeps everything else as you entered it. Savings are only drawn on when a month goes short. These are illustrations, not predictions.</p>
      </details>
      <p className="small muted">Want to change your situation? <Link href="/plan" className="link">Update it in Plan</Link>. It’s the same information, kept on this device.</p>
    </div>
  );
}
