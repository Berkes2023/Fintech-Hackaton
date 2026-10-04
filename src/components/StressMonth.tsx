"use client";

import Link from "next/link";
import { useState } from "react";
import { gbp, snapshot, stressScenarios, stressStart, type StressInput, type StressRow } from "@/lib/consequence";
import { nextDebtEnding } from "@/lib/insight";
import { carScenario, exampleCar, hasEnteredPicture, position, schedule, toMonthly, type Line } from "@/lib/sim";
import { carStore } from "@/lib/store";
import { SourceBadge, WhyBreakdown } from "./CarParts";
import { Icon } from "./Icon";

const r2 = (x: number) => Math.round(x * 100) / 100;
const months = (n: number) => `${n} month${n === 1 ? "" : "s"}`;
/** "Loan repayments end", "Overdraft ends". */
const ends = (label: string) => `${label.toLowerCase()} ${/s$/i.test(label.trim()) ? "end" : "ends"}`;
/** Distance from the buffer the person chose, e.g. "£50 below". */
const gap = (g: number) => (g < 0 ? `${gbp(-g)} below` : `${gbp(g)} above`);

/** One before → after line on a scenario card. */
function Change({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd><span className="was">{before}</span><Icon name="arrow" size={16} /><span className="sr-only"> to </span><b>{after}</b></dd>
    </div>
  );
}

/**
 * Stress test your month, using the SAME situation the person entered in Plan (stored on this device).
 * Each scenario is a plain shock; before vs after comes from the consequence engine.
 */
export function StressMonth() {
  const st = carStore.use();
  const s0 = snapshot(st.picture);
  // A decision is "in play" when Plan has a car price, or a decoded agreement is being used instead.
  const offerInUse = st.use === "offer" && !!st.offer;
  const hasCar = st.purchase.price > 0 || offerInUse;
  const payment = hasCar ? schedule(carScenario(st)).regular : 0;
  const [withCar, setWithCar] = useState(true);
  const [amt, setAmt] = useState({ bills: 100, income: 300, rent: 100, unexpected: 500, overtime: 200 });

  const tryExample = () => {
    if (hasEnteredPicture(st.picture) && !window.confirm("Replace the figures you’ve entered with a fictional example?")) return;
    carStore.set({ ...exampleCar(), credit: st.credit });
  };

  if (s0.income <= 0) {
    return (
      <div className="notice stack">
        <p className="lead"><b>Tell us about your month first.</b></p>
        <p className="small">Stress testing uses the income, costs, borrowing and savings you enter in Plan, so you never type them twice. It takes about two minutes, and it all stays on this device.</p>
        <div className="row">
          <Link href="/plan" className="btn btn-dark">Tell us about my situation <Icon name="arrow" size={18} /></Link>
          <button type="button" className="btn btn-light" onClick={tryExample}>Try it with example figures</button>
        </div>
      </div>
    );
  }

  const included = hasCar && withCar;
  // With the decision included, savings start from what the deposit leaves (if it comes from savings), as in Plan.
  const fromSavings = included && st.depositFromSavings !== false;
  const s = stressStart(s0, { deposit: st.purchase.deposit, fromSavings });
  const depositUsed = fromSavings && st.purchase.deposit > 0;
  const example = st.picture.income.some((i) => i.origin === "mock" && i.amount > 0);

  const regularItem = st.picture.otherSaving.find((i) => i.id === "regular");
  const regular = regularItem ? r2(toMonthly(regularItem.amount, regularItem.freq)) : 0;

  // A loan that ends is something they told us; with no end date, show what it would change if one ended.
  const ending = nextDebtEnding(st.picture);
  const other = ending ? undefined : st.picture.debts.find((d) => d.amount > 0 && (d.endsIn === undefined || d.endsIn > 1));
  const loan = ending
    ? { label: `Your ${ends(ending.debt.label)}`, monthly: ending.monthly }
    : other ? { label: `If your ${other.label.toLowerCase()} ended`, monthly: r2(toMonthly(other.amount, other.freq)) } : null;

  const inputs: StressInput[] = [
    { id: "bills", label: `Bills rise by ${gbp(amt.bills)} a month`, monthly: -amt.bills, oneOff: 0 },
    { id: "income", label: `Income falls by ${gbp(amt.income)} a month for 3 months`, monthly: -amt.income, oneOff: 0, months: 3 },
    { id: "rent", label: `Rent rises by ${gbp(amt.rent)} a month`, monthly: -amt.rent, oneOff: 0 },
    { id: "unexpected", label: `An unexpected ${gbp(amt.unexpected)} expense`, monthly: 0, oneOff: -amt.unexpected },
    { id: "overtime", label: `If you lost ${gbp(amt.overtime)} a month of overtime for 3 months`, monthly: -amt.overtime, oneOff: 0, months: 3 },
    ...(included ? [{ id: "wait", label: "You buy one month later", monthly: 0, oneOff: regular }] : []),
    ...(loan ? [{ id: "loan", label: loan.label, monthly: loan.monthly, oneOff: 0, commitments: -loan.monthly }] : []),
  ];
  const rows = stressScenarios(s, included ? payment : 0, inputs, { preferredBuffer: st.preferredBuffer });
  const base = rows[0].remainingBefore;
  const paymentLabel = offerInUse ? "payment on the agreement you decoded" : "car payment you’re exploring";
  const extra: Line[] = included ? [{ label: offerInUse ? "Payment on the agreement you decoded" : "Car payment you’re exploring", amount: -payment, source: "we_calculated" }] : [];

  const sentence = (r: StressRow) => {
    if (r.id !== "wait") return r.sentence;
    return regular > 0
      ? `${r.sentence} The first payment would also move a month later.`
      : "You haven’t told us about regular saving, so waiting a month doesn’t change your savings in this illustration. The first payment would move a month later.";
  };
  const savingsLabel = (r: StressRow) => (r.id === "wait" ? "Cash savings when you buy" : r.drawMonths ? `Cash savings after ${months(r.drawMonths)}` : "Cash savings");
  const field = (k: keyof typeof amt, label: string) => (
    <div className="field" key={k}><label htmlFor={`stm-${k}`}>{label}</label><div className="input"><span>£</span><input id={`stm-${k}`} type="number" min={0} step={50} value={amt[k] || ""} placeholder="0" onChange={(e) => setAmt({ ...amt, [k]: Math.max(0, Number(e.target.value) || 0) })} /></div></div>
  );

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="caption">Your month today</span>
          <span>{example && <span className="pill-label">Example figures</span>}<SourceBadge source="we_calculated" /></span>
        </div>
        <p className="h2" style={{ margin: 0 }}>{gbp(base)} <span className="small muted">estimated left each month{included ? `, including the ${gbp(payment)} ${paymentLabel}` : ""}</span></p>
        <p className="small">Cash savings: <b>{gbp(s.buffer)}</b>{depositUsed ? ` (after the ${gbp(st.purchase.deposit)} deposit)` : ""}</p>
        {hasCar && (
          <label className="quiz-option small"><input type="checkbox" checked={withCar} onChange={(e) => setWithCar(e.target.checked)} /> {offerInUse ? "Include the agreement I decoded in Plan" : "Include the car payment I’m exploring in Plan"}</label>
        )}
        <WhyBreakdown title={included ? "From the situation you entered in Plan, plus the payment you’re exploring." : "From the situation you entered in Plan."} result={position(st.picture)} extra={extra} />
      </div>

      <div className="stress-grid">
        {rows.map((r) => (
          <section key={r.id} className="stress-card" aria-label={r.label}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "start" }}><b className="h3">{r.label}</b><SourceBadge source="illustrative" /></div>
            <dl className="conseq-changes">
              <Change label="Monthly remaining" before={gbp(r.remainingBefore)} after={gbp(r.remainingAfter)} />
              <Change label={savingsLabel(r)} before={gbp(r.bufferBefore)} after={gbp(r.bufferAfter)} />
              {r.commitmentsAfter !== r.commitmentsBefore && <Change label="Monthly commitments" before={gbp(r.commitmentsBefore)} after={gbp(r.commitmentsAfter)} />}
              {r.bufferGapBefore !== null && r.bufferGapAfter !== null
                ? <Change label={`Against the ${gbp(st.preferredBuffer ?? 0)} buffer you chose`} before={gap(r.bufferGapBefore)} after={gap(r.bufferGapAfter)} />
                : r.monthsCoveredBefore !== null && r.monthsCoveredAfter !== null && r.monthsCoveredAfter !== r.monthsCoveredBefore && <Change label="Months of essential costs covered" before={months(r.monthsCoveredBefore)} after={months(r.monthsCoveredAfter)} />}
            </dl>
            <p className="small">{sentence(r)}</p>
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
        <p className="small">Each scenario changes one thing and keeps everything else as you entered it. With the payment included, savings start from what’s left after the deposit, if it comes from your savings. Savings are only drawn on when a month goes short: for as long as the change lasts, or for 12 months if it carries on. They never go below £0; anything beyond them is shown as a shortfall. Overtime isn’t something you’ve entered, so its amount is an example you can change. Buying a month later adds only the regular saving you told us about. These are illustrations, not predictions.</p>
      </details>
      <p className="small muted">Want to change your situation? <Link href="/plan" className="link">Update it in Plan</Link>. It’s the same information, kept on this device.</p>
    </div>
  );
}
