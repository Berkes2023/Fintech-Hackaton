"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { risks, simulate, understandingCheck } from "@/lib/finance";
import { money, pct } from "@/lib/format";
import type { Mark } from "@/lib/highlight";
import {
  applyLevers, BAND_LABEL, carScenarios, DEFAULT_CAR, EXAMPLE_APR, exampleBand, habit, hiddenCost, impact, LEVERS, position,
  recurringIncome, schedule, SCORE_SOURCE, simulateMonths, statements, toFinance,
  type Band, type CarState, type Lever, type Scenario, type ScoreSource,
} from "@/lib/sim";
import { carStore, commitmentsStore, newOptionId, savedStore, thisMonth, MAX_SAVED } from "@/lib/store";
import { CreditExplainer, EventEditor, ItemEditor, SourceBadge, WhyBreakdown } from "./CarParts";
import { Chart } from "./Chart";
import { CommitCheck } from "./CommitCheck";
import { CostScanner } from "./CostScanner";
import { DocumentPanel } from "./DocumentPanel";
import { Icon } from "./Icon";
import { PasteFill, type FillResult } from "./PasteFill";

const STEPS = [
  { group: "The car", title: "The car" },
  { group: "Your financial picture", title: "Income" },
  { group: "Your financial picture", title: "Essential costs" },
  { group: "Your financial picture", title: "Other spending" },
  { group: "Your financial picture", title: "Existing borrowing" },
  { group: "Your financial picture", title: "Savings and pension" },
  { group: "Credit profile", title: "Credit profile" },
  { group: "Coming up", title: "Coming up" },
  { group: "Finance", title: "Explore finance" },
  { group: "Impact", title: "Your month" },
  { group: "Impact", title: "Over time" },
  { group: "Impact", title: "Hidden cost" },
  { group: "What if", title: "What if" },
  { group: "Your offer", title: "Your actual offer" },
  { group: "Summary", title: "Before you sign" },
] as const;
const GROUPS = [...new Set(STEPS.map((s) => s.group))];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CAR_OFFER = `DEMO / FICTIONAL - NOT A REAL FINANCIAL PRODUCT
HIRE PURCHASE AGREEMENT - Provider X Motor Finance (fictional)
DRIVE AWAY TODAY FROM £493 A MONTH!
Cash price: £25,000.00. Deposit: £5,000.00. Amount of credit: £20,000.00.
Duration: 48 months. Representative APR 8.9% (fixed).
48 monthly payments of £493.50. An arrangement fee of £199 is payable with your first payment.
Total amount payable: £23,887.00 plus your deposit. Total charge for credit: £3,887.00.
Late payment fee: £20 for each missed payment.
The vehicle remains the property of Provider X until all payments have been made.
Important: Guaranteed Asset Protection (GAP) insurance at £12.50 per month is added to your agreement unless you decline it before signing.
You may settle early. A settlement charge of up to 58 days' interest may apply.`;

function Money({ id, label, value, onChange, help, step = 100 }: { id: string; label: string; value: number; onChange: (n: number) => void; help?: string; step?: number }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input"><span>£</span><input id={id} type="number" min={0} step={step} inputMode="decimal" value={value || ""} placeholder="0" onChange={(e) => onChange(Number(e.target.value) || 0)} /></div>
      {help && <p className="help">{help}</p>}
    </div>
  );
}

/** The guided car decision: purchase, financial picture, credit profile, future events, finance, impact, what-ifs, the real offer, then a summary. */
export function CarJourney() {
  const params = useSearchParams();
  const st = carStore.use();
  const set = (patch: Partial<CarState>) => carStore.set({ ...st, ...patch });
  const setPicture = (patch: Partial<CarState["picture"]>) => set({ picture: { ...st.picture, ...patch } });
  const [step, setStep] = useState(() => Math.min(STEPS.length - 1, Math.max(0, Number(params.get("step")) || 0)));
  const [levers, setLevers] = useState<Lever[]>([]);
  const [horizon, setHorizon] = useState(12);
  const [habitAmt, setHabitAmt] = useState(8);
  const [habitTimes, setHabitTimes] = useState(4);
  const [doc, setDoc] = useState<Omit<FillResult, "type" | "values"> | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const saved = savedStore.use();
  const commitments = commitmentsStore.use();

  const start = thisMonth();
  const monthName = (m: number) => { const [y, mo] = start.split("-").map(Number); const k = y * 12 + (mo - 1) + m; return `${MONTHS[k % 12]} ${Math.floor(k / 12)}`; };
  const go = (n: number) => { setStep(Math.max(0, Math.min(n, STEPS.length - 1))); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const next = () => go(step + 1), back = () => go(step - 1);

  const p = st.picture;
  const financed = toFinance(st.purchase);
  const pos = position(p);
  const scs = carScenarios(st);
  const chosen: Scenario = scs.find((s) => s.id === st.chosen) ?? scs[0];
  const sch = schedule(chosen);
  const imp = impact(p, chosen);
  const fullTerm = Math.min(84, chosen.startIn + chosen.term);
  const rows = simulateMonths(p, st.events, chosen, Math.max(24, fullTerm));
  const bufferStart = p.reserves.savings + p.reserves.emergency;
  const said = statements(rows.slice(0, Math.max(horizon, 3)), bufferStart, monthName);
  const band = exampleBand(st.credit);
  const income = recurringIncome(p);
  const oneOffs = st.events.filter((e) => e.recurrence === "one_off" && e.direction === "in");
  const show = (k: string) => { setActive(null); requestAnimationFrame(() => setActive(k)); };

  const nav = (label = "Next", disabled = false) => (
    <div className="wizard-nav">
      {step > 0 ? <button type="button" className="btn btn-light" onClick={back}>Back</button> : <span />}
      {step < STEPS.length - 1 && <button type="button" className="btn btn-dark" onClick={next} disabled={disabled}>{label} <Icon name="arrow" size={18} /></button>}
    </div>
  );

  // The position card shown beside the financial-picture questions.
  const positionCard = () => (
    <aside className="card stack position-card" aria-label="Your monthly position">
      <span className="caption">Your normal month, so far</span>
      <b className="h1">{money(pos.value)}</b>
      <p className="small muted">left after regular costs. One-off money isn’t included.</p>
      <WhyBreakdown title="Regular income minus regular costs, from what you’ve told us." result={pos} />
    </aside>
  );

  const onFill = (r: FillResult) => {
    const v = r.values;
    const has = (k: string) => r.filled.includes(k);
    const amount = has("amount") ? Number(v.amount) : has("price") ? Number(v.price) : has("balance") ? Number(v.balance) : financed;
    const apr = has("apr") ? Number(v.apr) : chosen.apr;
    const term = has("term") ? Number(v.term) : has("n") ? Number(v.n) : chosen.term;
    const fee = has("fee") ? Number(v.fee) : 0;
    const assumed = [!(has("amount") || has("price") || has("balance")) && "amount", !has("apr") && "APR", !(has("term") || has("n")) && "term"].filter(Boolean) as string[];
    const scenario: Scenario = {
      id: "offer", label: "Your actual offer", source: "document", amount, apr, term, upfrontFee: fee, monthlyFee: 0, balloon: 0, startIn: 0,
      lateFee: has("lateFee") ? Number(v.lateFee) : undefined,
      fieldSources: {
        amount: assumed.includes("amount") ? "illustrative" : "document_says", apr: assumed.includes("APR") ? "illustrative" : "document_says",
        term: assumed.includes("term") ? "illustrative" : "document_says", upfrontFee: has("fee") ? "document_says" : "illustrative", lateFee: has("lateFee") ? "document_says" : undefined,
      },
    };
    const { type: _t, values: _v, ...rest } = r;
    void _t; void _v;
    setDoc(rest);
    set({ offer: { scenario, assumed }, chosen: "offer" });
  };

  const marks: Mark[] = doc ? [
    ...Object.entries(doc.evidence).map(([id, e]) => ({ key: `f-${id}`, quote: e.quote })),
    ...doc.conditions.map((c, i) => ({ key: `cond-${i}`, quote: c.quote })),
  ].filter((x) => x.quote) : [];

  const loanValues = { amount: chosen.amount, apr: chosen.apr, term: chosen.term, fee: chosen.upfrontFee, lateFee: chosen.lateFee ?? 15 };
  const loanM = simulate("loan", loanValues);

  return (
    <div className="journey car">
      <ol className="journey-steps" aria-label="Progress">
        {GROUPS.map((g) => {
          const first = STEPS.findIndex((s) => s.group === g);
          const last = STEPS.length - 1 - [...STEPS].reverse().findIndex((s) => s.group === g);
          const state = step > last ? "done" : step >= first ? "now" : undefined;
          return (
            <li key={g} className={state}>
              <button type="button" onClick={() => first <= step && go(first)} disabled={first > step} aria-current={state === "now" ? "step" : undefined}>
                <span className="journey-n">{state === "done" ? "✓" : GROUPS.indexOf(g) + 1}</span><span className="journey-t">{g}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="small muted">Step {step + 1} of {STEPS.length} · {STEPS[step].title}{step === 0 && " · Example figures are filled in to start; change any of them."}</p>

      {step === 0 && (
        <section className="stack journey-card">
          <h2 className="h1">Tell us about the car</h2>
          <div className="journey-fields">
            <Money id="c-price" label="Car price" value={st.purchase.price} onChange={(price) => set({ purchase: { ...st.purchase, price } })} />
            <Money id="c-dep" label="Deposit you could put down" value={st.purchase.deposit} onChange={(deposit) => set({ purchase: { ...st.purchase, deposit } })} help="Including any part-exchange." />
            <Money id="c-saved" label="Already saved towards it" value={st.purchase.saved} onChange={(saved) => set({ purchase: { ...st.purchase, saved } })} help="Separate from your emergency savings." />
            <div className="field"><label htmlFor="c-term">How long you’d like to pay (if you know)</label><div className="input"><select id="c-term" value={st.purchase.preferredTerm ?? 0} onChange={(e) => set({ purchase: { ...st.purchase, preferredTerm: Number(e.target.value) || undefined } })}><option value={0}>Not sure</option>{[24, 36, 48, 60].map((t) => <option key={t} value={t}>{t} months</option>)}</select></div></div>
          </div>
          <div className="big-fact"><span className="caption">Potential amount to finance <SourceBadge source="we_calculated" /></span><b>{money(financed)}</b><span className="small">{money(st.purchase.price)} car − {money(st.purchase.deposit)} deposit</span></div>
          {nav()}
        </section>
      )}

      {step >= 1 && step <= 5 && (
        <div className="picture-layout">
          <section className="stack journey-card">
            {step === 1 && (<>
              <h2 className="h1">Your income</h2>
              <p className="muted">What comes in regularly, after tax. Rough is fine. Everything stays in your browser.</p>
              <ItemEditor idPrefix="inc" items={p.income} onChange={(income) => setPicture({ income })} suggestions={["Take-home salary", "Second job", "Benefits", "Other regular income"]} />
              <p className="small muted">Bonuses, refunds and other one-off money come later, so they’re never mistaken for regular income.</p>
            </>)}
            {step === 2 && (<>
              <h2 className="h1">Essential costs</h2>
              <p className="muted">The things you have to pay.</p>
              <ItemEditor idPrefix="ess" items={p.essentials} onChange={(essentials) => setPicture({ essentials })} suggestions={["Rent", "Mortgage", "Utilities and council tax", "Food", "Transport", "Insurance", "Childcare", "Phone and broadband"]} />
            </>)}
            {step === 3 && (<>
              <h2 className="h1">Other regular spending</h2>
              <p className="muted">Things you choose to spend on regularly. No judgement: it just makes the picture realistic.</p>
              <ItemEditor idPrefix="dis" items={p.discretionary} onChange={(discretionary) => setPicture({ discretionary })} suggestions={["Subscriptions", "Eating out and takeaways", "Entertainment", "Shopping", "Gym", "Hobbies"]} />
            </>)}
            {step === 4 && (<>
              <h2 className="h1">Existing borrowing</h2>
              <p className="muted">What you already repay each month, and when each one ends.</p>
              <ItemEditor idPrefix="dbt" debts items={p.debts} onChange={(debts) => setPicture({ debts })} suggestions={["Personal loan", "Car finance", "Credit card", "Overdraft", "Buy Now Pay Later"]} />
            </>)}
            {step === 5 && (<>
              <h2 className="h1">Savings and pension</h2>
              <div className="journey-fields">
                <Money id="r-sav" label="Savings" value={p.reserves.savings} onChange={(savings) => setPicture({ reserves: { ...p.reserves, savings } })} />
                <Money id="r-em" label="Emergency fund" value={p.reserves.emergency} onChange={(emergency) => setPicture({ reserves: { ...p.reserves, emergency } })} />
                <Money id="r-pen" label="Your pension contribution each month" value={p.pension.amount} onChange={(amount) => setPicture({ pension: { ...p.pension, amount } })} step={10} />
                <Money id="r-emp" label="Employer contribution (if known)" value={p.pension.employer ?? 0} onChange={(employer) => setPicture({ pension: { ...p.pension, employer } })} step={10} help="For information only: it isn’t paid from your month." />
              </div>
              <label className="quiz-option"><input type="checkbox" checked={p.pension.alreadyDeducted} onChange={(e) => setPicture({ pension: { ...p.pension, alreadyDeducted: e.target.checked } })} /> My pension is already taken out before my take-home pay</label>
              <p className="small muted">Workplace pensions usually are, so we don’t count them twice. We don’t try to predict retirement outcomes.</p>
              <ItemEditor idPrefix="sav" items={p.otherSaving} onChange={(otherSaving) => setPicture({ otherSaving })} suggestions={["Regular savings", "Investing each month"]} />
            </>)}
            {nav()}
          </section>
          {positionCard()}
        </div>
      )}

      {step === 6 && (
        <section className="stack journey-card">
          <h2 className="h1">Your credit profile</h2>
          <p className="muted">Do you know your credit score or profile? <SourceBadge source="you_told_us" /> Whatever you choose is self-reported. Before You Sign never calculates a credit score.</p>
          <div className="choice-grid">
            {([["score", "Enter my score"], ["band", "Choose an approximate profile"], ["unknown", "I don’t know"]] as const).map(([mode, label]) => (
              <button key={mode} type="button" className={`choice${st.credit.mode === mode ? " on" : ""}`} onClick={() => set({ credit: { ...st.credit, mode } })}><b style={{ fontSize: 20 }}>{label}</b></button>
            ))}
          </div>
          {st.credit.mode === "score" && (
            <div className="journey-fields">
              <div className="field"><label htmlFor="cs-v">Your score</label><div className="input"><input id="cs-v" type="number" min={0} value={st.credit.score?.value ?? ""} onChange={(e) => set({ credit: { ...st.credit, score: { value: Number(e.target.value) || 0, source: st.credit.score?.source ?? "experian" } } })} /></div></div>
              <div className="field"><label htmlFor="cs-s">From</label><div className="input"><select id="cs-s" value={st.credit.score?.source ?? "experian"} onChange={(e) => set({ credit: { ...st.credit, score: { value: st.credit.score?.value ?? 0, source: e.target.value as ScoreSource } } })}>{(Object.keys(SCORE_SOURCE) as ScoreSource[]).map((s) => <option key={s} value={s}>{SCORE_SOURCE[s]}</option>)}</select></div></div>
            </div>
          )}
          {st.credit.mode === "band" && (
            <div className="choice-grid">
              {(Object.keys(BAND_LABEL) as Band[]).map((b) => <button key={b} type="button" className={`choice${st.credit.band === b ? " on" : ""}`} onClick={() => set({ credit: { ...st.credit, band: b } })}><b>{BAND_LABEL[b]}</b></button>)}
            </div>
          )}
          <p className="list small">{band.note} Scores from different agencies use different scales, so we never treat them as interchangeable.</p>
          <CreditExplainer />
          {nav()}
        </section>
      )}

      {step === 7 && (
        <section className="stack journey-card">
          <h2 className="h1">What doesn’t your bank know yet?</h2>
          <p className="muted">Your bank sees your past transactions. Your credit profile reflects your borrowing history. Only you know what’s coming next: a bonus, a pay rise, a loan ending, a rent rise.</p>
          <EventEditor events={st.events} onChange={(events) => set({ events })} monthName={monthName} />
          <p className="small"><b>Your regular income stays {money(income)} a month.</b> One-off money is shown in its own month and never added to your regular income.</p>
          {nav("Explore finance")}
        </section>
      )}

      {step === 8 && (
        <section className="stack" style={{ gap: 20 }}>
          <h2 className="h1">Explore potential finance</h2>
          <p className="muted">Financing {money(financed)}. {band.note}</p>
          <p className="estimate-note small"><b>Example scenarios at illustrative rates.</b> Not offers or market data. Edit any rate, term or fee. When you have a real offer, decode it in step 14.</p>
          <div className="option-grid">
            {scs.map((s) => {
              const sc = schedule(s);
              return (
                <div key={s.id} className={`option${chosen.id === s.id ? " on" : ""}`}>
                  <div className="row" style={{ justifyContent: "space-between" }}><b className="h3">{s.label}</b><SourceBadge source={s.source === "document" ? "document_says" : "illustrative"} /></div>
                  {s.source !== "document" ? (
                    <div className="scenario-edit">
                      <label>APR <input type="number" step={0.1} min={0} value={s.apr} onChange={(e) => set({ edits: { ...st.edits, [s.id]: { ...st.edits[s.id], apr: Number(e.target.value) || 0 } } })} />%</label>
                      <label>Term <select value={s.term} onChange={(e) => set({ edits: { ...st.edits, [s.id]: { ...st.edits[s.id], term: Number(e.target.value) } } })}>{[24, 36, 48, 60, 72].map((t) => <option key={t} value={t}>{t}m</option>)}</select></label>
                      <label>Fee £<input type="number" step={1} min={0} value={s.upfrontFee} onChange={(e) => set({ edits: { ...st.edits, [s.id]: { ...st.edits[s.id], upfrontFee: Number(e.target.value) || 0 } } })} /></label>
                    </div>
                  ) : <p className="small muted">{pct(s.apr)} APR · {s.term} months · fee {money(s.upfrontFee)}</p>}
                  <dl className="option-facts">
                    <div><dt>Each month</dt><dd>{money(sc.regular, true)}</dd></div>
                    <div><dt>Total repaid</dt><dd>{money(sc.total)}</dd></div>
                    <div><dt>Borrowing cost</dt><dd>{money(sc.cost)}</dd></div>
                    <div><dt>Leaves a normal month</dt><dd>{money(pos.value - sc.regular)}</dd></div>
                  </dl>
                  <button type="button" className={chosen.id === s.id ? "btn btn-dark btn-sm" : "btn btn-light btn-sm"} onClick={() => set({ chosen: s.id })}>{chosen.id === s.id ? "Exploring this one" : "Explore this one"}</button>
                </div>
              );
            })}
          </div>
          {(() => {
            const all = scs.map((s) => ({ s, sc: schedule(s) }));
            const lowTotal = all.reduce((a, b) => (b.sc.total < a.sc.total ? b : a));
            const lowMonthly = all.reduce((a, b) => (b.sc.regular < a.sc.regular ? b : a));
            return lowTotal.s.id !== lowMonthly.s.id ? <p className="list small">{lowTotal.s.label} has the lowest total repayment but a higher monthly payment. {lowMonthly.s.label} has the lowest monthly payment, but you’d repay {money(lowMonthly.sc.total - lowTotal.sc.total)} more overall. Which matters more is your call.</p> : null;
          })()}
          {band.band === null && <p className="small muted">Example rates by profile: Excellent {EXAMPLE_APR.excellent}%, Good {EXAMPLE_APR.good}%, Fair {EXAMPLE_APR.fair}%, Needs work {EXAMPLE_APR.needs_work}%.</p>}
          {nav("See it in my month")}
        </section>
      )}

      {step === 9 && (
        <section className="stack" style={{ gap: 20 }}>
          <h2 className="h1">{chosen.label} in your monthly life</h2>
          <div className="before-after">
            <div className="card stack"><span className="caption">Before the car</span><b className="h1">{money(imp.before.value)}</b><span className="small muted">left in a normal month</span></div>
            <div className="ba-arrow" aria-hidden="true"><Icon name="arrow" size={28} /></div>
            <div className="card stack emph-card"><span className="caption">After the car</span><b className="h1">{money(imp.after)}</b><span className="small">left in a normal month</span></div>
            <div className="card stack"><span className="caption">Difference</span><b className="h1">−{money(imp.payment, true)}</b><span className="small muted">a month</span></div>
          </div>
          <div className="tiles">
            <div className="tile"><span className="caption">Payment <SourceBadge source="we_calculated" /></span><span className="v">{money(imp.payment, true)}</span><span className="small muted">a month</span></div>
            <div className="tile"><span className="caption">Share of take-home pay</span><span className="v">{pct(imp.pctOfIncome)}</span><span className="small muted">of {money(income)}</span></div>
            <div className="tile"><span className="caption">All borrowing repayments</span><span className="v">{money(imp.totalCommitments, true)}</span><span className="small muted">{money(imp.existingDebt)} existing + car</span></div>
            <div className="tile"><span className="caption">Cash buffer now</span><span className="v">{money(imp.bufferNow)}</span><span className="small muted">savings + emergency fund</span></div>
          </div>
          <WhyBreakdown title={`What a normal month leaves after the ${chosen.label.toLowerCase()} payment.`} result={imp.before}
            extra={[{ label: `${chosen.label} payment`, amount: -imp.payment, source: chosen.source === "document" ? "document_says" : "we_calculated" }]}
            note={oneOffs.length ? `${oneOffs.map((o) => o.label).join(", ")} ${oneOffs.length > 1 ? "are" : "is"} excluded from regular monthly income because ${oneOffs.length > 1 ? "they’re" : "it’s"} one-off.` : undefined} />
          {nav("See it over time")}
        </section>
      )}

      {step === 10 && (
        <section className="stack" style={{ gap: 20 }}>
          <h2 className="h1">Over time</h2>
          <div className="segmented" role="group" aria-label="How far ahead">
            {[3, 6, 12, 24, fullTerm].filter((v, i, a) => a.indexOf(v) === i).map((h) => <button key={h} type="button" aria-pressed={horizon === h} onClick={() => setHorizon(h)}>{h === fullTerm && h > 24 ? `Full term (${h}m)` : `${h} months`}</button>)}
          </div>
          <p className="estimate-note small"><b>A simulation, not a prediction.</b> It only knows what you’ve told us.</p>
          {said.map((s) => <p key={s} className="insight">{s}</p>)}
          <section className="card stack">
            <Chart label="Money left in a normal month, cash buffer, and cumulative borrowing cost over time" endLabels={false}
              series={[
                { name: "Normal month leaves", kind: "line", color: "#1f1f1f", pts: rows.slice(0, horizon).map((r) => ({ t: r.m, y: r.normalLeft })) },
                { name: "Cash buffer", kind: "line", color: "#717173", dash: "7 5", pts: rows.slice(0, horizon).map((r) => ({ t: r.m, y: r.buffer })) },
                { name: "Borrowing cost so far", kind: "line", color: "#a1a1a6", dash: "2 4", pts: rows.slice(0, horizon).map((r) => ({ t: r.m, y: r.cumulativeCost })) },
              ]} tipLabel={(t) => monthName(Math.round(t))} />
            <div className="legend"><span><i />Normal month leaves</span><span><i style={{ borderTopStyle: "dashed", borderColor: "#717173" }} />Cash buffer</span><span><i style={{ borderTopStyle: "dotted", borderColor: "#a1a1a6" }} />Borrowing cost so far</span></div>
          </section>
          <div className="month-cards">
            {rows.slice(0, Math.min(horizon, 12)).map((r) => (
              <div key={r.m} className={`month-card${r.left < 0 ? " short" : ""}${r.oneOffIn || r.oneOffOut ? " oneoff" : ""}`}>
                <b>{monthName(r.m)}</b>
                <span className="small">Income +{money(r.recurringIn)}</span>
                <span className="small">Regular costs −{money(r.recurringOut)}</span>
                <span className="small">Car −{money(r.newPayment)}</span>
                {r.oneOffIn > 0 && <span className="small"><b>One-off +{money(r.oneOffIn)}</b></span>}
                {r.oneOffOut > 0 && <span className="small"><b>One-off −{money(r.oneOffOut)}</b></span>}
                <span className="month-left">{r.left < 0 ? `Short ${money(-r.left)}` : `${money(r.left)} left`}</span>
                {r.notes.length > 0 && <span className="small muted">{r.notes.join(" · ")}</span>}
              </div>
            ))}
          </div>
          {horizon > 12 && <p className="small muted">Month cards show the first year; the chart shows all {horizon} months.</p>}
          {nav("See the hidden cost")}
        </section>
      )}

      {step === 11 && (() => {
        const h = hiddenCost(p, st.events, chosen);
        const hb = habit(habitAmt, habitTimes);
        return (
          <section className="stack" style={{ gap: 20 }}>
            <h2 className="h1">The hidden cost</h2>
            <p className="muted">It’s more than the fees. Here’s what this commitment costs in the contract, in your month, and over time.</p>
            <div className="grid-3">
              <div className="card stack"><span className="caption">Contract cost</span>
                <dl className="mlabel-rows">
                  <div><dt>Interest</dt><dd>{money(h.contract.interest)}</dd></div>
                  <div><dt>Fees</dt><dd>{money(h.contract.fees)}</dd></div>
                  <div><dt>Late payment fee</dt><dd>{h.contract.lateFee ? money(h.contract.lateFee) : "Not stated"}</dd></div>
                  <div className="strong"><dt>Total borrowing cost</dt><dd>{money(h.contract.totalCost)}</dd></div>
                  <div><dt>APR</dt><dd>{pct(h.contract.apr)}</dd></div>
                </dl>
              </div>
              <div className="card stack"><span className="caption">Cash-flow cost</span>
                <dl className="mlabel-rows">
                  <div><dt>Less each month</dt><dd>{money(h.cashflow.monthlyReduction, true)}</dd></div>
                  <div><dt>Of take-home pay</dt><dd>{pct(h.cashflow.pctOfIncome)}</dd></div>
                  <div className="strong"><dt>Buffer after 12 months</dt><dd>{money(h.cashflow.bufferAfter12)}</dd></div>
                  <div><dt>…without the car</dt><dd>{money(h.cashflow.bufferAfter12Without)}</dd></div>
                </dl>
              </div>
              <div className="card stack"><span className="caption">Cumulative impact</span>
                <dl className="mlabel-rows">
                  <div><dt>Committed in 12 months</dt><dd>{money(h.cumulative.at12)}</dd></div>
                  <div><dt>In 24 months</dt><dd>{money(h.cumulative.at24)}</dd></div>
                  <div className="strong"><dt>Over the full term</dt><dd>{money(h.cumulative.atTerm)}</dd></div>
                  <div><dt>Plus existing repayments, 12 months</dt><dd>{money(h.cumulative.existingAt12)}</dd></div>
                </dl>
              </div>
            </div>
            <section className="card stack">
              <h3 className="h3">How small repeated spending adds up</h3>
              <div className="journey-fields" style={{ maxWidth: 520 }}>
                <Money id="hb-a" label="Each time" value={habitAmt} onChange={setHabitAmt} step={1} />
                <div className="field"><label htmlFor="hb-t">Times a week</label><div className="input"><input id="hb-t" type="number" min={0} max={21} value={habitTimes} onChange={(e) => setHabitTimes(Number(e.target.value) || 0)} /></div></div>
              </div>
              <p className="lead">{money(habitAmt, true)} × {habitTimes} a week → about <b>{money(hb.week, true)}</b> a week → <b>{money(hb.month)}</b> a month → <b>{money(hb.year)}</b> a year.</p>
              <p className="small muted">Alongside the car payment, that’s {imp.after > 0 ? `${Math.round((hb.month / imp.after) * 100)}% of what a normal month would leave` : "on top of a month that’s already short"}. Just the arithmetic, not a judgement.</p>
            </section>
            {nav("Try what-ifs")}
          </section>
        );
      })()}

      {step === 12 && (() => {
        const base = { picture: p, events: st.events, scenario: chosen };
        const alt = applyLevers(base, levers);
        const H = Math.max(24, Math.min(84, alt.scenario.startIn + alt.scenario.term));
        const baseRows = simulateMonths(p, st.events, chosen, H);
        const altRows = simulateMonths(alt.picture, alt.events, alt.scenario, H);
        const bs = schedule(chosen), as = schedule(alt.scenario);
        const typical = (rs: typeof baseRows, from: number) => { const v = rs.slice(from, from + 12).map((r) => r.normalLeft).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] ?? 0; };
        const row = (label: string, a: string, b: string) => <tr key={label} className={a !== b ? "priority" : undefined}><th scope="row">{label}</th><td>{a}</td><td>{b}</td></tr>;
        const altSaid = statements(altRows.slice(0, 24), bufferStart, monthName);
        return (
          <section className="stack" style={{ gap: 20 }}>
            <h2 className="h1">What if…?</h2>
            <p className="muted">Turn on any combination. Our code recalculates everything; nothing here is a prediction or advice.</p>
            <div className="chips" role="group" aria-label="What ifs">
              {(Object.keys(LEVERS) as Lever[]).filter((l) => !(l === "waitBonus" && !oneOffs.length) && !(l === "loanEnds" && !p.debts.length)).map((l) => (
                <button key={l} type="button" className="chip" aria-pressed={levers.includes(l)} onClick={() => setLevers((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))}>{LEVERS[l]}</button>
              ))}
            </div>
            <div className="table-wrap">
              <table className="cmp">
                <thead><tr><th scope="col"></th><th scope="col">As explored</th><th scope="col">With your what-ifs</th></tr></thead>
                <tbody>
                  {row("Borrowing", money(chosen.amount), money(alt.scenario.amount))}
                  {row("APR and term", `${pct(chosen.apr)} · ${chosen.term}m`, `${pct(alt.scenario.apr)} · ${alt.scenario.term}m${alt.scenario.startIn ? `, from ${monthName(alt.scenario.startIn + 1)}` : ""}`)}
                  {row("Each month", money(bs.regular, true), money(as.regular, true))}
                  {row("Total repaid", money(bs.total), money(as.total))}
                  {row("Borrowing cost", money(bs.cost), money(as.cost))}
                  {row("A normal month leaves", money(typical(baseRows, chosen.startIn)), money(typical(altRows, alt.scenario.startIn)))}
                  {row("Buffer after 12 months", money(baseRows[11].buffer), money(altRows[11].buffer))}
                  {row("Months short (first 24)", String(baseRows.slice(0, 24).filter((r) => r.left < 0).length), String(altRows.slice(0, 24).filter((r) => r.left < 0).length))}
                </tbody>
              </table>
            </div>
            {levers.length > 0 && altSaid.map((s) => <p key={s} className="insight small">{s}</p>)}
            {nav("Decode your actual offer")}
          </section>
        );
      })()}

      {step === 13 && (
        <section className="stack" style={{ gap: 20 }}>
          <h2 className="h1">Got a real offer? Decode it into your simulation</h2>
          <p className="muted">Upload or paste the finance offer. AI reads it; our code puts its terms into everything you’ve just seen. Values not in the document are filled from your example and clearly labelled.</p>
          <div className="grid-2 doc-row">
            <PasteFill idPrefix="car-offer" title="Upload or paste your offer" samples={[{ label: "Example: car finance offer", text: CAR_OFFER }]} onFill={onFill} />
            {st.offer ? (
              <section className="card stack">
                <div className="row" style={{ justifyContent: "space-between" }}><h3 className="h3">Your actual offer</h3><SourceBadge source="document_says" /></div>
                <dl className="mlabel-rows">
                  <div><dt>Amount <SourceBadge source={st.offer.scenario.fieldSources.amount ?? "document_says"} /></dt><dd>{money(st.offer.scenario.amount)}</dd></div>
                  <div><dt>APR <SourceBadge source={st.offer.scenario.fieldSources.apr ?? "document_says"} /></dt><dd>{pct(st.offer.scenario.apr)}</dd></div>
                  <div><dt>Term <SourceBadge source={st.offer.scenario.fieldSources.term ?? "document_says"} /></dt><dd>{st.offer.scenario.term} months</dd></div>
                  <div><dt>Fee <SourceBadge source={st.offer.scenario.fieldSources.upfrontFee ?? "illustrative"} /></dt><dd>{money(st.offer.scenario.upfrontFee)}</dd></div>
                  <div className="strong"><dt>Each month <SourceBadge source="we_calculated" /></dt><dd>{money(schedule(st.offer.scenario).regular, true)}</dd></div>
                </dl>
                {st.offer.assumed.length > 0 && <p className="missing-banner small"><b>Not in the document:</b> {st.offer.assumed.join(", ")}. Example values are used, so the results are estimates.</p>}
                <div className="row">
                  <button type="button" className={st.chosen === "offer" ? "btn btn-dark btn-sm" : "btn btn-light btn-sm"} onClick={() => set({ chosen: "offer" })}>{st.chosen === "offer" ? "Your simulation uses this offer" : "Use this offer in my simulation"}</button>
                  <button type="button" className="link small" onClick={() => go(9)}>See it in my month</button>
                </div>
              </section>
            ) : <p className="list small">No offer decoded yet. Try the example car finance offer to see how it works.</p>}
          </div>
          {doc && (doc.conditions.length > 0 || doc.source) && (
            <div className="grid-2 doc-row">
              <CostScanner conditions={doc.conditions} onShow={show} />
              <DocumentPanel source={doc.source} marks={marks} active={active} redactions={doc.redactions} />
            </div>
          )}
          {nav("Before you sign")}
        </section>
      )}

      {step === 14 && (
        <section className="stack" style={{ gap: 20 }}>
          <h2 className="h1">Before you sign: the full picture</h2>
          <div className="summary-grid">
            <div className="card stack"><span className="caption">The decision you’re exploring</span><p className="h3">A {money(st.purchase.price)} car</p><p className="small">{money(st.purchase.deposit)} deposit <SourceBadge source="you_told_us" /></p></div>
            <div className="card stack"><span className="caption">Potential financing</span><p className="h3">{money(chosen.amount)} financed</p><p className="small">{chosen.term} months · {pct(chosen.apr)} APR <SourceBadge source={chosen.source === "document" ? "document_says" : "illustrative"} /></p></div>
            <div className="card stack"><span className="caption">Cost <SourceBadge source="we_calculated" /></span><p className="h3">{money(sch.regular, true)} a month</p><p className="small">{money(sch.total)} total repayment · {money(sch.cost)} borrowing cost</p></div>
            <div className="card stack"><span className="caption">Your financial picture <SourceBadge source="you_told_us" /></span><p className="small">{money(income)} regular income · {money(imp.existingDebt)} existing repayments</p><p className="h3">{money(imp.after)} left in a normal month after the car</p></div>
            <div className="card stack"><span className="caption">Looking ahead <SourceBadge source="you_told_us" /></span>
              {st.events.length ? <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{st.events.map((e) => <li key={e.id}>{e.label}: {money(e.amount)}, {monthName(e.month)} ({e.recurrence === "one_off" ? "one-off" : e.recurrence === "recurring_from" ? "every month from then" : "stops from then"})</li>)}</ul> : <p className="small muted">Nothing added.</p>}
            </div>
            <div className="card stack"><span className="caption">Your actual offer</span>
              {st.offer ? (<>
                <p className="small">{doc?.conditions.length ? `${doc.conditions.length} conditions found, including: ${doc.conditions.slice(0, 3).map((c) => c.title).join(", ")}.` : "Decoded."} <SourceBadge source="document_says" /></p>
                {st.offer.assumed.length > 0 && <p className="small">Not stated in the document: {st.offer.assumed.join(", ")}.</p>}
              </>) : <p className="small muted">Not decoded yet. <button type="button" className="link small" onClick={() => go(13)}>Decode an offer</button></p>}
            </div>
          </div>
          {statements(rows.slice(0, 24), bufferStart, monthName).map((s) => <p key={s} className="insight small">{s}</p>)}
          <CommitCheck type="loan" m={loanM} risks={risks("loan", loanValues, loanM)} check={understandingCheck("loan", loanValues, loanM)} perLabel="a month" onSave={() => {
            if (saved.length < MAX_SAVED) savedStore.set([...saved, { id: newOptionId(), name: `Car: ${chosen.label}`, type: "loan", values: loanValues }]);
          }} />
          <p className="lead closing">We’ve shown how the numbers change under the information and assumptions you’ve provided. The decision remains yours.</p>
          <div className="done-grid">
            <button type="button" className="done-card" onClick={() => { if (saved.length >= MAX_SAVED) { setMsg(`Compare holds up to ${MAX_SAVED}.`); return; } savedStore.set([...saved, { id: newOptionId(), name: `Car: ${chosen.label}`, type: "loan", values: loanValues }]); setMsg("Added to Compare."); }}><Icon name="compare" /><b>Add to Compare</b><span className="small muted">Line it up with other options</span></button>
            <button type="button" className="done-card" onClick={() => { commitmentsStore.set([...commitments, { id: newOptionId(), name: `Car (${chosen.label})`, type: "loan", values: loanValues }]); setMsg("Added to your commitment map."); }}><Icon name="chart" /><b>Add to my commitments</b><span className="small muted">See it next to what you already pay</span></button>
            <Link href="/" className="done-card"><Icon name="spark" /><b>Explore something else</b><span className="small muted">Back to the start</span></Link>
          </div>
          {msg && <p className="small" role="status">{msg}</p>}
          <button type="button" className="link small" onClick={() => { carStore.set(DEFAULT_CAR); setDoc(null); setLevers([]); go(0); }}>Clear my answers and start again</button>
          {nav()}
        </section>
      )}
    </div>
  );
}
