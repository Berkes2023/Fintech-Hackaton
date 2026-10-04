"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { creditEstablished, creditLine, type Cra } from "@/lib/credit";
import { DECISIONS, STAGES, type DecisionKind, type Stage } from "@/lib/decision";
import { risks, simulate, understandingCheck } from "@/lib/finance";
import { money, pct } from "@/lib/format";
import type { Mark } from "@/lib/highlight";
import { GOALS, type Goal } from "@/lib/journey";
import {
  amountOf, applyLevers, carScenario, debtPayments, EMPTY_CAR, eventAmount, eventLine, eventTag, exampleCar,
  hiddenCost, illustrativeProviders, impact, LEVERS, position, recurringIncome, schedule, simulateMonths, statements, toFinance, toMonthly,
  type CarState, type Item, type Lever, type Picture, type Scenario,
} from "@/lib/sim";
import { carStore, commitmentsStore, journeyStore, newOptionId, savedStore, thisMonth, MAX_SAVED } from "@/lib/store";
import { EventEditor, SourceBadge, WhyBreakdown } from "./CarParts";
import { Chart } from "./Chart";
import { CommitCheck } from "./CommitCheck";
import { CostScanner } from "./CostScanner";
import { CreditResult, CreditStart } from "./CreditContext";
import { DocumentPanel } from "./DocumentPanel";
import { Icon } from "./Icon";
import { startGoal } from "./Journey";
import { PasteFill, type FillResult } from "./PasteFill";

// One natural question per screen, in the order a person thinks a decision through.
const STEPS: { stage: Stage; title: string }[] = [
  { stage: "Credit context", title: "Understand your credit" },
  { stage: "Credit context", title: "Your credit context" },
  { stage: "Goal", title: "What are you thinking about?" },
  { stage: "Purchase", title: "The car" },
  { stage: "Purchase", title: "How it could be funded" },
  { stage: "Finance", title: "Finance scenarios" },
  { stage: "My situation", title: "Monthly income" },
  { stage: "My situation", title: "Existing spending" },
  { stage: "My situation", title: "Existing borrowing" },
  { stage: "My situation", title: "Financial buffer" },
  { stage: "My situation", title: "Longer-term contributions" },
  { stage: "Future", title: "What’s changing" },
  { stage: "Simulation", title: "What this could mean" },
  { stage: "Simulation", title: "Over time" },
  { stage: "What if", title: "What if" },
  { stage: "Decode It", title: "Decode the real agreement" },
  { stage: "Before you sign", title: "Before you sign" },
];
const S = {
  credit: 0, result: 1, goal: 2, price: 3, deposit: 4, finance: 5, income: 6, spending: 7, borrowing: 8, buffer: 9, longterm: 10,
  future: 11, impact: 12, timeline: 13, whatif: 14, decode: 15, summary: 16,
} as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GOAL_ORDER: { kind: DecisionKind; icon: string }[] = [
  { kind: "car", icon: "car" }, { kind: "home", icon: "household" }, { kind: "improve", icon: "tool" }, { kind: "purchase", icon: "wallet" },
  { kind: "borrowing", icon: "card" }, { kind: "education", icon: "book" }, { kind: "other", icon: "spark" },
];
const TO_PLAN: Partial<Record<DecisionKind, Goal>> = { home: "home", improve: "improve", purchase: "purchase", education: "education" };

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

function Money({ id, label, value, onChange, help, step = 10 }: { id: string; label: string; value: number; onChange: (n: number) => void; help?: string; step?: number }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input"><span>£</span><input id={id} type="number" min={0} step={step} inputMode="decimal" value={value || ""} placeholder="0" onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} /></div>
      {help && <p className="help">{help}</p>}
    </div>
  );
}

type ListKey = "income" | "essentials" | "discretionary" | "debts" | "otherSaving";
const sumList = (l: Item[]) => l.reduce((a, i) => a + toMonthly(i.amount, i.freq), 0);

/**
 * The car decision as a story: credit context, the goal, the purchase, how it could be funded, the person's
 * situation, what they know about their future, then a simulation, what-ifs, the real agreement and a summary.
 * CODE CALCULATES (sim.ts). AI only reads the agreement (Decode It) and never produces these numbers.
 */
export function CarJourney({ startAt = 0 }: { startAt?: number }) {
  const params = useSearchParams();
  const router = useRouter();
  const st = carStore.use();
  const set = (patch: Partial<CarState>) => carStore.set({ ...st, ...patch });
  const setPicture = (patch: Partial<Picture>) => set({ picture: { ...st.picture, ...patch } });
  const setAmt = (k: ListKey, id: string, v: number) => setPicture({ [k]: st.picture[k].map((i: Item) => (i.id === id ? { ...i, amount: v, freq: "monthly", origin: "manual" } : i)) } as Partial<Picture>);
  const [rawStep, setStep] = useState(() => { const q = Number(params.get("step")); return q >= 1 && q <= STEPS.length ? q - 1 : startAt; });
  const established = creditEstablished(st.credit);
  // A goal picked on the home page is remembered, but only offered after the credit context is done.
  const [wanted] = useState(() => params.get("goal") as Goal | null);
  // Which agency to open when someone chooses "Enter my Experian score" etc. from the result screen.
  const [craIntent, setCraIntent] = useState<Cra | null>(null);
  // Credit is the gateway: without a credit result, every step (including deep links) shows the credit step.
  const step = established ? rawStep : 0;
  const [levers, setLevers] = useState<Lever[]>([]);
  const [amounts, setAmounts] = useState({ rent: 100, salary: 150 });
  const [horizon, setHorizon] = useState(12);
  const [full, setFull] = useState(false);
  const [doc, setDoc] = useState<Omit<FillResult, "type" | "values"> | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const saved = savedStore.use();
  const commitments = commitmentsStore.use();

  const start = thisMonth();
  const monthName = (m: number) => { const [y, mo] = start.split("-").map(Number); const k = y * 12 + (mo - 1) + m; return `${MONTHS[k % 12]} ${Math.floor(k / 12)}`; };
  const go = (n: number) => { setStep(Math.max(0, Math.min(n, STEPS.length - 1))); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goFromCredit = () => { setStep(S.result); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const next = () => go(step + 1), back = () => go(step - 1);

  const p = st.picture;
  const copy = DECISIONS.car;
  const financed = toFinance(st.purchase);
  const sc: Scenario = carScenario(st);
  const sch = schedule(sc);
  const pos = position(p);
  const imp = impact(p, sc);
  const income = recurringIncome(p);
  const spending = sumList(p.essentials) + sumList(p.discretionary);
  const borrowing = debtPayments(p);
  const longTerm = (p.pension.alreadyDeducted ? 0 : p.pension.amount) + sumList(p.otherSaving);
  const bufferStart = p.reserves.savings + p.reserves.emergency;
  const loan = p.debts.find((d) => d.id === "loan");
  const rows = simulateMonths(p, st.events, sc, Math.max(24, Math.min(84, sc.startIn + sc.term)));
  const without = simulateMonths(p, st.events, null, 12);
  const oneOffIns = st.events.filter((e) => e.recurrence === "one_off" && e.direction === "in");
  const firstBonus = [...oneOffIns].sort((a, b) => a.month - b.month)[0];
  const show = (k: string) => { setActive(null); requestAnimationFrame(() => setActive(k)); };
  const paySource = sc.source === "document" ? "document_says" : "we_calculated";
  const termsSource = sc.source === "document" ? "document_says" : sc.fieldSources.apr === "illustrative" ? "illustrative" : "you_told_us";

  const nav = (label = "Next", disabled = false) => (
    <div className="wizard-nav">
      {step > 0 ? <button type="button" className="btn btn-light" onClick={back}>Back</button> : <span />}
      {step < STEPS.length - 1 && <button type="button" className="btn btn-dark" onClick={next} disabled={disabled}>{label} <Icon name="arrow" size={18} /></button>}
    </div>
  );

  // The person's own train of thought, rebuilt from what they've told us so far.
  const story = () => {
    const lines: string[] = [];
    if (step > S.price && st.purchase.price) lines.push(`I want this ${money(st.purchase.price)} car.`);
    if (step > S.deposit) lines.push(`I could put down ${money(st.purchase.deposit)}, so I may need about ${money(financed)} of finance.`);
    if (step > S.finance) lines.push(`At ${pct(sc.apr)} APR over ${sc.term} months, that’s about ${money(sch.regular, true)} a month.`);
    if (step > S.income && income) lines.push(`I take home about ${money(income)} a month.`);
    if (step > S.spending && spending) lines.push(`My normal spending is about ${money(spending)} a month.`);
    if (step > S.borrowing && borrowing) lines.push(`I already repay ${money(borrowing)} a month${loan?.endsIn && loan.amount > 0 ? `, and my loan’s last payment is in ${monthName(loan.endsIn - 1)}` : ""}.`);
    if (step > S.buffer && bufferStart) lines.push(`I have ${money(bufferStart)} as a buffer.`);
    if (step > S.future) for (const e of st.events.slice(0, 3)) lines.push(`${eventLine(e, monthName)}.`);
    if (!lines.length) return null;
    return <ol className="story" aria-label="What you’ve told us so far">{lines.map((l) => <li key={l}>{l}</li>)}</ol>;
  };

  const situationCard = () => (
    <aside className="card stack position-card" aria-label="Your situation so far">
      <span className="caption">Your normal month, so far</span>
      <b className="h1">{money(pos.value)}</b>
      <p className="small muted">left after regular costs, before the car. One-off money isn’t included.</p>
      <WhyBreakdown title="Regular income minus regular costs, from what you’ve told us." result={pos} />
    </aside>
  );

  const fields = (k: ListKey, list: [string, string, string?][]) => (
    <div className="journey-fields">
      {list.map(([id, label, help]) => <Money key={id} id={`f-${id}`} label={label} help={help} value={amountOf(p[k], id)} onChange={(v) => setAmt(k, id, v)} />)}
    </div>
  );

  const onFill = (r: FillResult) => {
    const v = r.values;
    const has = (k: string) => r.filled.includes(k);
    const mine = carScenario({ ...st, use: "mine" });
    const amount = has("amount") ? Number(v.amount) : has("balance") ? Number(v.balance) : mine.amount;
    const assumed = [!(has("amount") || has("balance")) && "amount", !has("apr") && "APR", !(has("term") || has("n")) && "term"].filter(Boolean) as string[];
    const scenario: Scenario = {
      id: "offer", label: "Your agreement", source: "document", amount,
      apr: has("apr") ? Number(v.apr) : mine.apr, term: has("term") ? Number(v.term) : has("n") ? Number(v.n) : mine.term,
      upfrontFee: has("fee") ? Number(v.fee) : 0, monthlyFee: 0, balloon: 0, startIn: 0, lateFee: has("lateFee") ? Number(v.lateFee) : undefined,
      fieldSources: {
        amount: assumed.includes("amount") ? "you_told_us" : "document_says", apr: assumed.includes("APR") ? "you_told_us" : "document_says",
        term: assumed.includes("term") ? "you_told_us" : "document_says", upfrontFee: has("fee") ? "document_says" : "you_told_us", lateFee: has("lateFee") ? "document_says" : undefined,
      },
    };
    const { type: _t, values: _v, ...rest } = r;
    void _t; void _v;
    setDoc(rest);
    set({ offer: { scenario, assumed, terms: r.conditions.map((c) => ({ title: c.title, quote: c.quote })) }, use: "offer" });
  };

  const marks: Mark[] = doc ? [
    ...Object.entries(doc.evidence).map(([id, e]) => ({ key: `f-${id}`, quote: e.quote })),
    ...doc.conditions.map((c, i) => ({ key: `cond-${i}`, quote: c.quote })),
  ].filter((x) => x.quote) : [];

  const loanValues = { amount: sc.amount, apr: sc.apr, term: sc.term, fee: sc.upfrontFee, lateFee: sc.lateFee ?? 0 };
  const loanM = simulate("loan", loanValues);
  const stageIdx = STAGES.indexOf(STEPS[step].stage);

  return (
    <div className="journey car">
      <ol className="journey-steps" aria-label="Progress">
        {STAGES.map((g, gi) => {
          const first = STEPS.findIndex((s) => s.stage === g);
          const state = gi < stageIdx ? "done" : gi === stageIdx ? "now" : undefined;
          return (
            <li key={g} className={state}>
              <button type="button" onClick={() => first <= step && go(first)} disabled={first > step} aria-current={state === "now" ? "step" : undefined}>
                <span className="journey-n">{state === "done" ? "✓" : gi + 1}</span><span className="journey-t">{g}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="small muted">Step {step + 1} of {STEPS.length} · {STEPS[step].title}</p>
      {step > S.price && step < S.impact && story()}

      {step === S.credit && (
        <section className="stack journey-card" aria-labelledby="q-credit">
          <span className="caption">Before You Sign · Step 1</span>
          <h2 id="q-credit" className="display">Let’s understand your credit</h2>
          <p className="lead muted">In the UK, you don’t have one universal credit score. Experian, Equifax and TransUnion use different scoring systems. Enter any you know, or none.</p>
          <CreditStart key={craIntent ?? "start"} initial={craIntent} credit={st.credit} onChange={(credit) => set({ credit })} onResult={goFromCredit} />
        </section>
      )}

      {step === S.result && (
        <section className="stack journey-card" aria-labelledby="q-result">
          <span className="caption">Before You Sign · Step 2</span>
          <h2 id="q-result" className="display">{st.credit.calculated ? "Your estimated credit scores" : "Your credit context"}</h2>
          <CreditResult credit={st.credit} onEnter={(c) => { setCraIntent(c); go(S.credit); }} />
          <div className="credit-story stack">
            <p className="display" style={{ fontSize: "clamp(30px, 4.4vw, 46px)" }}>Your credit is where we start, not where we stop.</p>
            <p className="lead muted">Credit can tell us part of the story. Now let’s understand the decision you’re actually considering.</p>
          </div>
          <div className="wizard-nav">
            <button type="button" className="btn btn-light" onClick={() => { setCraIntent(null); go(S.credit); }}>Change my answers</button>
            <button type="button" className="btn btn-dark" onClick={next}>Continue <Icon name="arrow" size={18} /></button>
          </div>
        </section>
      )}

      {step === S.goal && (
        <section className="stack journey-card" aria-labelledby="q-goal">
          <span className="caption">✓ Credit context done · {creditLine(st.credit)}</span>
          <h2 id="q-goal" className="display">What are you thinking about?</h2>
          {wanted && wanted !== "car" && wanted !== "invest" && (
            <div className="notice row" style={{ justifyContent: "space-between" }}>
              <span>You picked <b>{GOALS[wanted].label}</b> on the home page.</span>
              <button type="button" className="btn btn-dark btn-sm" onClick={() => { journeyStore.set(startGoal(journeyStore.get(), wanted)); router.push("/plan?step=1"); }}>Continue with it <Icon name="arrow" size={16} /></button>
            </div>
          )}
          <div className="goal-grid">
            {GOAL_ORDER.map(({ kind, icon }) => {
              const d = DECISIONS[kind];
              const pick = () => {
                if (kind === "car") { set({ goal: "car" }); go(S.price); return; }
                const plan = TO_PLAN[kind];
                if (plan) { journeyStore.set(startGoal(journeyStore.get(), plan)); router.push("/plan?step=1"); return; }
                router.push(kind === "borrowing" ? "/commitments" : "/start");
              };
              return (
                <button key={kind} type="button" className={`goal${st.goal === kind || (kind === "car" && wanted === "car") ? " on" : ""}${kind === "car" ? " featured" : ""}`} onClick={pick}>
                  <span className="goal-icon" aria-hidden="true"><Icon name={icon} size={28} /></span>
                  <b>{d.label}</b>
                  <span className="small muted">{d.status === "full" ? "Full story journey" : d.status === "simplified" ? "Simplified for now" : "We’ll point you somewhere useful"}</span>
                </button>
              );
            })}
          </div>
          {nav()}
        </section>
      )}

      {step === S.price && (
        <section className="stack journey-card" aria-labelledby="q-price">
          <span className="caption">The thing you want</span>
          <h2 id="q-price" className="h1">{copy.cost}</h2>
          <div className="journey-fields">
            <Money id="c-price" label="Car price" step={500} value={st.purchase.price} onChange={(price) => set({ purchase: { ...st.purchase, price } })} />
          </div>
          <div className="row">
            <button type="button" className="link small" onClick={() => { carStore.set({ ...exampleCar(), credit: st.credit }); setDoc(null); }}>Use example figures (a £25,000 car)</button>
            <span className="small muted">Fills every step with a fictional example you can change.</span>
          </div>
          {nav("Next", st.purchase.price <= 0)}
        </section>
      )}

      {step === S.deposit && (
        <section className="stack journey-card" aria-labelledby="q-dep">
          <span className="caption">How could it be funded?</span>
          <h2 id="q-dep" className="h1">{copy.upfront}</h2>
          <div className="journey-fields">
            <Money id="c-dep" label="Deposit" step={500} value={st.purchase.deposit} onChange={(deposit) => set({ purchase: { ...st.purchase, deposit: Math.min(deposit, st.purchase.price), saved: deposit } })} help="Including any part-exchange." />
          </div>
          <div className="big-fact" aria-live="polite">
            <span className="caption">Potentially requiring finance <SourceBadge source="we_calculated" /></span>
            <span className="small">{money(st.purchase.price)} car</span>
            <span className="small">− {money(st.purchase.deposit)} deposit</span>
            <b>= {money(financed)}</b>
          </div>
          {nav("How might I finance it?")}
        </section>
      )}

      {step === S.finance && (() => {
        const providers = illustrativeProviders(st.purchase);
        const f = st.finance;
        const mine = carScenario({ ...st, use: "mine" });
        const mineSch = schedule(mine);
        return (
          <section className="stack" style={{ gap: 20 }} aria-labelledby="q-fin">
            <h2 id="q-fin" className="h1">{copy.financeQuestion}</h2>
            <p className="muted">Different finance providers can offer different APRs, fees, terms and conditions. Your credit profile may influence what you’re offered, but only a lender can tell you its rate. These three are <b>fictional</b>, to show how the differences play out. None of them is “best”.</p>
            <div className="option-grid">
              {providers.map((x) => {
                const xs = schedule(x);
                const on = st.use === "mine" && mine.apr === x.apr && mine.term === x.term && mine.upfrontFee === x.upfrontFee;
                return (
                  <div key={x.id} className={`option${on ? " on" : ""}`}>
                    <div className="row" style={{ justifyContent: "space-between" }}><b className="h3">{x.provider}</b><SourceBadge source="illustrative" /></div>
                    <p className="small">{pct(x.apr)} APR · {x.term} months · {x.upfrontFee ? `${money(x.upfrontFee)} fee` : "no fee"}</p>
                    <dl className="option-facts">
                      <div><dt>Each month</dt><dd>{money(xs.regular, true)}</dd></div>
                      <div><dt>Total repaid</dt><dd>{money(xs.total)}</dd></div>
                      <div><dt>Borrowing cost</dt><dd>{money(xs.cost)}</dd></div>
                    </dl>
                    {x.conditions && <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>{x.conditions.map((c) => <li key={c}>{c}</li>)}</ul>}
                    <button type="button" className={on ? "btn btn-dark btn-sm" : "btn btn-light btn-sm"} onClick={() => set({ finance: { ...f, apr: x.apr, term: x.term, fee: x.upfrontFee }, use: "mine" })}>{on ? "Exploring this scenario" : "Explore this scenario"}</button>
                  </div>
                );
              })}
            </div>
            <section className="card stack">
              <h3 className="h3">The scenario you’re exploring</h3>
              <div className="journey-fields">
                <Money id="fin-amt" label="Amount financed" step={500} value={mine.amount} onChange={(amount) => set({ finance: { ...f, amount }, use: "mine" })} help={f.amount === null ? "Worked out from price minus deposit." : undefined} />
                <div className="field"><label htmlFor="fin-apr">APR</label><div className="input"><input id="fin-apr" type="number" min={0} step={0.1} value={mine.apr} onChange={(e) => set({ finance: { ...f, apr: Math.max(0, Number(e.target.value) || 0) }, use: "mine" })} /><span>%</span></div>{f.apr === null && <p className="help">Starts at fictional Provider B’s rate. Change it to any rate you’ve seen.</p>}</div>
                <div className="field"><label htmlFor="fin-term">Term</label><div className="input"><select id="fin-term" value={mine.term} onChange={(e) => set({ finance: { ...f, term: Number(e.target.value) }, use: "mine" })}>{[24, 36, 48, 60, 72].map((t) => <option key={t} value={t}>{t} months</option>)}</select></div></div>
                <Money id="fin-fee" label="Fees (one-off)" step={10} value={f.fee} onChange={(fee) => set({ finance: { ...f, fee }, use: "mine" })} />
              </div>
              <div className="big-fact"><span className="caption">Monthly payment <SourceBadge source="we_calculated" /></span><b>{money(mineSch.regular, true)}</b><span className="small">{money(mineSch.total)} repaid in total · {money(mineSch.cost)} borrowing cost</span></div>
            </section>
            <p className="small muted">Already have a real agreement? You’ll decode it later in the story, or <button type="button" className="link small" onClick={() => go(S.decode)}>jump to Decode It now</button>.</p>
            {nav("Now, my situation")}
          </section>
        );
      })()}

      {step >= S.income && step <= S.longterm && (
        <div className="picture-layout">
          <section className="stack journey-card">
            {step === S.income && (<>
              <p className="insight lead">Your credit profile is only part of the story. {money(sch.regular, true)} a month is only one number: what would it mean in your situation?</p>
              <h2 className="h1">What money regularly comes in?</h2>
              <p className="muted">After tax, each month. Rough is fine, and everything stays in your browser.</p>
              {fields("income", [["salary", "Take-home salary"], ["other", "Other recurring income", "Only money that arrives every month."]])}
              <p className="small muted">Bonuses and other one-off money come later, so they’re never counted as regular income.</p>
            </>)}
            {step === S.spending && (<>
              <h2 className="h1">What does a normal month cost you?</h2>
              <p className="muted">The regular things. No judgement: it just makes the simulation realistic.</p>
              {fields("essentials", [["rent", "Rent or mortgage"], ["bills", "Bills (energy, water, council tax, phone)"], ["food", "Food"], ["transport", "Transport"], ["insurance", "Insurance"]])}
              {fields("discretionary", [["subs", "Subscriptions"], ["fun", "Shopping, eating out and entertainment"], ["otherSpend", "Other recurring spending"]])}
            </>)}
            {step === S.borrowing && (<>
              <h2 className="h1">What are you already paying back?</h2>
              <p className="muted">Monthly repayments on borrowing you already have.</p>
              {fields("debts", [["loan", "Existing loans"], ["card", "Credit-card repayments"], ["carfin", "Existing car finance"], ["bnpl", "Buy Now Pay Later"], ["overdraft", "Overdraft or other commitments"]])}
              {loan && loan.amount > 0 && (
                <div className="field" style={{ maxWidth: 360 }}>
                  <label htmlFor="loan-end">When is your loan’s last payment?</label>
                  <div className="input"><select id="loan-end" value={loan.endsIn ?? 0} onChange={(e) => setPicture({ debts: p.debts.map((d) => (d.id === "loan" ? { ...d, endsIn: Number(e.target.value) || undefined } : d)) })}><option value={0}>Not soon / not sure</option>{Array.from({ length: 60 }, (_, k) => k + 1).map((m) => <option key={m} value={m}>{m === 1 ? `This month (${monthName(0)})` : monthName(m - 1)}</option>)}</select></div>
                </div>
              )}
            </>)}
            {step === S.buffer && (<>
              <h2 className="h1">What do you have to fall back on?</h2>
              <p className="muted">Cash you could use if a month goes wrong. Keep the car deposit out of this.</p>
              <div className="journey-fields">
                <Money id="r-sav" label="Savings" step={100} value={p.reserves.savings} onChange={(savings) => setPicture({ reserves: { ...p.reserves, savings } })} />
                <Money id="r-em" label="Emergency fund" step={100} value={p.reserves.emergency} onChange={(emergency) => setPicture({ reserves: { ...p.reserves, emergency } })} />
              </div>
            </>)}
            {step === S.longterm && (<>
              <h2 className="h1">Anything you put aside regularly?</h2>
              <p className="muted">Pension and regular saving matter too. We don’t try to predict retirement outcomes.</p>
              <div className="journey-fields">
                <Money id="r-pen" label="Your pension contribution a month" value={p.pension.amount} onChange={(amount) => setPicture({ pension: { ...p.pension, amount } })} />
                <Money id="r-emp" label="Employer pension contribution a month" value={p.pension.employer ?? 0} onChange={(employer) => setPicture({ pension: { ...p.pension, employer } })} help="For information only: it isn’t paid from your month." />
              </div>
              <label className="quiz-option"><input type="checkbox" checked={p.pension.alreadyDeducted} onChange={(e) => setPicture({ pension: { ...p.pension, alreadyDeducted: e.target.checked } })} /> My pension is already taken out before my take-home pay</label>
              <p className="small muted">Workplace pensions usually are. If so, we don’t count it twice.</p>
              {fields("otherSaving", [["regular", "Regular savings or investments a month"], ["otherCommit", "Other regular commitments", "e.g. childcare or support payments."]])}
            </>)}
            {nav(step === S.longterm ? "What’s changing?" : "Next")}
          </section>
          {situationCard()}
        </div>
      )}

      {step === S.future && (
        <section className="stack journey-card" aria-labelledby="q-future">
          <h2 id="q-future" className="display">What do you know about your future that your financial history doesn’t?</h2>
          <p className="lead muted">Your past transactions tell part of the story. But you may already know something is about to change.</p>
          <EventEditor events={st.events} onChange={(events) => set({ events })} monthName={monthName}
            onAdd={(t) => {
              if (t.label !== "Existing loan ending" || !loan || loan.amount <= 0) return false;
              setPicture({ debts: p.debts.map((d) => (d.id === "loan" ? { ...d, endsIn: d.endsIn ?? 5 } : d)) });
              return true;
            }} />
          {loan && loan.amount > 0 && loan.endsIn && (
            <div className="event-line list">
              <b className="event-amt">−{money(loan.amount)} a month</b><span className="event-tag">RECURRING EXPENSE STOPS</span>
              <span className="small muted">Your existing loan’s last payment is in {monthName(loan.endsIn - 1)}. <button type="button" className="link small" onClick={() => go(S.borrowing)}>Change</button></span>
            </div>
          )}
          <p className="small"><b>Your regular income stays {money(income)} a month.</b> One-off money appears only in its own month and is never added to your regular income.</p>
          {nav("Show me what this could mean")}
        </section>
      )}

      {step === S.impact && (() => {
        const h = hiddenCost(p, st.events, sc);
        return (
          <section className="stack" style={{ gap: 20 }} aria-labelledby="q-impact">
            <span className="caption">The simulation</span>
            <h2 id="q-impact" className="display">Here’s what this decision could mean in your situation.</h2>
            <div className="reveal-grid">
              <div className="card stack reveal" style={{ ["--i" as string]: 0 }}><span className="caption">The goal</span><p className="h3">{money(st.purchase.price)} car</p></div>
              <div className="card stack reveal" style={{ ["--i" as string]: 1 }}><span className="caption">The funding</span><p className="small">{money(st.purchase.deposit)} deposit</p><p className="h3">{money(sc.amount)} financed</p></div>
              <div className="card stack reveal" style={{ ["--i" as string]: 2 }}><span className="caption">The credit context <SourceBadge source="you_told_us" /></span><p className="small">{creditLine(st.credit)}</p></div>
              <div className="card stack reveal" style={{ ["--i" as string]: 3 }}><span className="caption">The finance scenario <SourceBadge source={termsSource} /></span>
                <dl className="mlabel-rows"><div><dt>APR · term</dt><dd>{pct(sc.apr)} · {sc.term}m</dd></div><div><dt>Monthly</dt><dd>{money(sch.regular, true)}</dd></div><div><dt>Total repaid</dt><dd>{money(sch.total)}</dd></div><div><dt>Borrowing cost</dt><dd>{money(sch.cost)}</dd></div></dl>
              </div>
            </div>
            <div className="grid-2">
              <div className="card stack reveal" style={{ ["--i" as string]: 4 }}>
                <span className="caption">Your normal month <SourceBadge source="you_told_us" /></span>
                <dl className="mlabel-rows">
                  <div><dt>Income</dt><dd>{money(income)}</dd></div>
                  <div><dt>− Spending</dt><dd>{money(spending)}</dd></div>
                  <div><dt>− Existing borrowing</dt><dd>{money(borrowing)}</dd></div>
                  <div><dt>− Pension and savings</dt><dd>{money(longTerm)}</dd></div>
                  <div className="strong"><dt>= Estimated remaining</dt><dd>{money(pos.value)}</dd></div>
                </dl>
              </div>
              <div className="card stack emph-card reveal" style={{ ["--i" as string]: 5 }}>
                <span className="caption">With the car <SourceBadge source="we_calculated" /></span>
                <dl className="mlabel-rows">
                  <div><dt>Normal month remaining</dt><dd>{money(pos.value)}</dd></div>
                  <div><dt>− New repayment <SourceBadge source={paySource} /></dt><dd>{money(imp.payment, true)}</dd></div>
                  <div className="strong"><dt>= Estimated remaining</dt><dd>{money(imp.after)}</dd></div>
                  <div><dt>Difference</dt><dd>−{money(imp.payment, true)} a month</dd></div>
                </dl>
              </div>
            </div>
            {(st.events.length > 0 || (loan && loan.amount > 0 && loan.endsIn)) && (
              <div className="list stack reveal" style={{ ["--i" as string]: 6 }}>
                <span className="caption">What you know is coming · kept separate from your normal month</span>
                {st.events.map((e) => <p key={e.id} className="small event-line"><b className="event-amt">{eventAmount(e)}</b><span className="event-tag">{eventTag(e)}</span><span className="muted">{eventLine(e, monthName)}</span></p>)}
                {loan && loan.amount > 0 && loan.endsIn && <p className="small event-line"><b className="event-amt">−{money(loan.amount)} a month</b><span className="event-tag">RECURRING EXPENSE STOPS</span><span className="muted">Existing loan’s last payment in {monthName(loan.endsIn - 1)}</span></p>}
              </div>
            )}
            <p className="insight">Under the information you’ve entered, this scenario would make your regular monthly outgoings approximately {money(imp.payment)} higher.</p>
            <div className="view-switch row">
              <div className="segmented" role="group" aria-label="How much detail">
                <button type="button" aria-pressed={!full} onClick={() => setFull(false)}>Quick view</button>
                <button type="button" aria-pressed={full} onClick={() => setFull(true)}>Full breakdown</button>
              </div>
              <span className="small muted">Same numbers either way.</span>
            </div>
            {full && (<>
              <div className="tiles">
                <div className="tile"><span className="caption">Share of take-home pay</span><span className="v">{pct(imp.pctOfIncome)}</span><span className="small muted">of {money(income)}</span></div>
                <div className="tile"><span className="caption">All recurring commitments</span><span className="v">{money(spending + borrowing + longTerm + imp.payment)}</span><span className="small muted">a month, including the car</span></div>
                <div className="tile"><span className="caption">Borrowing cost</span><span className="v">{money(sch.cost)}</span><span className="small muted">interest and fees</span></div>
                <div className="tile"><span className="caption">Cash buffer in 12 months</span><span className="v">{money(rows[11].buffer)}</span><span className="small muted">vs {money(without[11].buffer)} without the car (from {money(bufferStart)} now)</span></div>
              </div>
              <WhyBreakdown title="Every line behind the position after the car payment." result={imp.before}
                extra={[{ label: "Car payment", amount: -imp.payment, source: paySource }]}
                note={oneOffIns.length ? `${oneOffIns.map((o) => o.label).join(", ")} ${oneOffIns.length > 1 ? "are" : "is"} one-off, so ${oneOffIns.length > 1 ? "they’re" : "it’s"} not included in regular monthly income.` : undefined} />
              <div className="grid-3">
                <div className="card stack"><span className="caption">Hidden cost · contract</span>
                  <dl className="mlabel-rows">
                    <div><dt>Interest</dt><dd>{money(h.contract.interest)}</dd></div>
                    <div><dt>Fees</dt><dd>{money(h.contract.fees)}</dd></div>
                    <div><dt>Late payment fee</dt><dd>{h.contract.lateFee ? money(h.contract.lateFee) : "Not stated"}</dd></div>
                    <div className="strong"><dt>Total borrowing cost</dt><dd>{money(h.contract.totalCost)}</dd></div>
                  </dl>
                </div>
                <div className="card stack"><span className="caption">Hidden cost · cash flow</span>
                  <dl className="mlabel-rows">
                    <div><dt>Less each month</dt><dd>{money(h.cashflow.monthlyReduction, true)}</dd></div>
                    <div className="strong"><dt>Buffer after 12 months</dt><dd>{money(h.cashflow.bufferAfter12)}</dd></div>
                    <div><dt>…without the car</dt><dd>{money(h.cashflow.bufferAfter12Without)}</dd></div>
                  </dl>
                </div>
                <div className="card stack"><span className="caption">Hidden cost · cumulative</span>
                  <dl className="mlabel-rows">
                    <div><dt>Paid in 12 months</dt><dd>{money(h.cumulative.at12)}</dd></div>
                    <div><dt>In 24 months</dt><dd>{money(h.cumulative.at24)}</dd></div>
                    <div className="strong"><dt>Over the full term</dt><dd>{money(h.cumulative.atTerm)}</dd></div>
                  </dl>
                </div>
              </div>
            </>)}
            {nav("See how it could change over time")}
          </section>
        );
      })()}

      {step === S.timeline && (() => {
        const said = statements(rows.slice(0, horizon), bufferStart, monthName);
        const saving = sumList(p.otherSaving) + (p.pension.alreadyDeducted ? 0 : p.pension.amount);
        return (
          <section className="stack" style={{ gap: 20 }} aria-labelledby="q-time">
            <h2 id="q-time" className="h1">See how your situation could change over time</h2>
            <div className="segmented" role="group" aria-label="How far ahead">
              {[3, 6, 12, 24].map((hz) => <button key={hz} type="button" aria-pressed={horizon === hz} onClick={() => setHorizon(hz)}>{hz} months</button>)}
            </div>
            <p className="estimate-note small"><b>A simulation based on the assumptions you’ve entered, not a prediction.</b></p>
            {said.map((s) => <p key={s} className="insight">{s}</p>)}
            <section className="card stack">
              <Chart label="Money left each month and cash buffer over time" endLabels={false}
                series={[
                  { name: "Left each month", kind: "line", color: "#1f1f1f", pts: rows.slice(0, horizon).map((r) => ({ t: r.m, y: r.left })) },
                  { name: "Cash buffer", kind: "line", color: "#717173", dash: "7 5", pts: rows.slice(0, horizon).map((r) => ({ t: r.m, y: r.buffer })) },
                ]} tipLabel={(t) => monthName(Math.round(t))} />
              <div className="legend"><span><i />Left each month</span><span><i style={{ borderTopStyle: "dashed", borderColor: "#717173" }} />Cash buffer</span></div>
            </section>
            <div className="month-cards">
              {rows.slice(0, horizon).map((r) => (
                <div key={r.m} className={`month-card${r.left < 0 ? " short" : ""}${r.oneOffs.length ? " oneoff" : ""}`}>
                  <b>{monthName(r.m)}</b>
                  <span className="small">Salary and regular income +{money(r.recurringIn)}</span>
                  <span className="small">Normal spending −{money(r.recurringOut - r.existingDebt - saving)}</span>
                  {r.existingDebt > 0 && <span className="small">Existing borrowing −{money(r.existingDebt)}</span>}
                  {saving > 0 && <span className="small">Pension and savings −{money(saving)}</span>}
                  <span className="small">Car −{money(r.newPayment)}</span>
                  {r.oneOffs.map((o) => <span key={o.label} className="small"><b>{o.label} {o.amount >= 0 ? "+" : "−"}{money(Math.abs(o.amount))}</b> <span className="event-tag">ONE-OFF</span></span>)}
                  <span className="month-left">{r.left < 0 ? `Short ${money(-r.left)}` : `${money(r.left)} left`}</span>
                  {r.notes.filter((n) => !n.includes("(one-off)")).map((n) => <span key={n} className="small muted">{n}</span>)}
                </div>
              ))}
            </div>
            {nav("Try what-ifs")}
          </section>
        );
      })()}

      {step === S.whatif && (() => {
        const base = { picture: p, events: st.events, scenario: sc };
        const alt = applyLevers(base, levers, amounts);
        const H = Math.max(24, Math.min(84, alt.scenario.startIn + alt.scenario.term));
        const baseRows = simulateMonths(p, st.events, sc, H);
        const altRows = simulateMonths(alt.picture, alt.events, alt.scenario, H);
        const bs = schedule(sc), as = schedule(alt.scenario);
        const typical = (rs: typeof baseRows, from: number) => { const v = rs.slice(from, from + 12).map((r) => r.normalLeft).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] ?? 0; };
        const row = (label: string, a: string, b: string) => <tr key={label} className={a !== b ? "priority" : undefined}><th scope="row">{label}</th><td>{a}</td><td>{b}</td></tr>;
        const altSaid = statements(altRows.slice(0, 24), bufferStart, monthName);
        const extraDeposit = sc.amount - alt.scenario.amount;
        const toggle = (l: Lever) => setLevers((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]));
        const shown = (Object.keys(LEVERS) as Lever[]).filter((l) => !(l === "waitBonus" && !oneOffIns.length) && !(l === "loanEnds" && borrowing <= 0));
        const changed: string[] = [];
        if (levers.length) {
          if (alt.scenario.amount !== sc.amount) changed.push(`Finance goes from ${money(sc.amount)} to ${money(alt.scenario.amount)}.`);
          if (Math.abs(as.regular - bs.regular) > 0.5) changed.push(`The monthly payment goes from ${money(bs.regular, true)} to ${money(as.regular, true)}.`);
          if (Math.abs(as.cost - bs.cost) > 0.5) changed.push(`The borrowing cost goes from ${money(bs.cost)} to ${money(as.cost)}.`);
          if (alt.scenario.startIn) changed.push(`The first payment moves to ${monthName(alt.scenario.startIn + 1)}.`);
          const bb = baseRows[11].buffer, ab = altRows[11].buffer;
          if (Math.abs(ab - bb) > 0.5) changed.push(`Your cash buffer after 12 months would be ${money(ab)} instead of ${money(bb)}.`);
        }
        return (
          <section className="stack" style={{ gap: 20 }} aria-labelledby="q-whatif">
            <h2 id="q-whatif" className="h1">What if…?</h2>
            {firstBonus && (
              <div className="notice stack">
                <p className="lead"><b>You told us you’re receiving {money(firstBonus.amount)} {firstBonus.month === 1 ? "next month" : `in ${monthName(firstBonus.month)}`}.</b></p>
                <p className="small">You decide whether that money goes towards the car. Nothing is assumed.</p>
                <button type="button" className={levers.includes("waitBonus") ? "btn btn-dark btn-sm" : "btn btn-light btn-sm"} aria-pressed={levers.includes("waitBonus")} onClick={() => toggle("waitBonus")} style={{ justifySelf: "start" }}>
                  {levers.includes("waitBonus") ? "Showing: wait and add it to the deposit" : "What if I waited for the bonus?"}
                </button>
              </div>
            )}
            <p className="muted">Or try any combination. Our code reruns the whole simulation; nothing here is a prediction or advice.</p>
            <div className="chips" role="group" aria-label="What ifs">
              {shown.filter((l) => l !== "waitBonus").map((l) => (
                <button key={l} type="button" className="chip" aria-pressed={levers.includes(l)} onClick={() => toggle(l)}>
                  {l === "rentUp" ? `Rent increases by ${money(amounts.rent)}` : l === "salaryUp" ? `My salary changes by ${amounts.salary >= 0 ? "+" : "−"}${money(Math.abs(amounts.salary))}` : LEVERS[l]}
                </button>
              ))}
            </div>
            {(levers.includes("rentUp") || levers.includes("salaryUp")) && (
              <div className="journey-fields" style={{ maxWidth: 560 }}>
                {levers.includes("rentUp") && <Money id="w-rent" label="Rent increase a month" value={amounts.rent} onChange={(rent) => setAmounts({ ...amounts, rent })} />}
                {levers.includes("salaryUp") && <div className="field"><label htmlFor="w-sal">Salary change a month (negative for a cut)</label><div className="input"><span>£</span><input id="w-sal" type="number" step={50} value={amounts.salary} onChange={(e) => setAmounts({ ...amounts, salary: Number(e.target.value) || 0 })} /></div></div>}
              </div>
            )}
            {extraDeposit > 0 && (
              <div className="grid-2">
                <div className="card stack"><span className="caption">Original</span><p className="small">{money(st.purchase.price)} car</p><p className="small">{money(st.purchase.deposit)} deposit</p><p className="h3">{money(sc.amount)} finance</p></div>
                <div className="card stack emph-card"><span className="caption">Scenario</span><p className="small">{money(st.purchase.price)} car</p><p className="small">{money(st.purchase.deposit + extraDeposit)} deposit</p><p className="h3">{money(alt.scenario.amount)} finance</p></div>
              </div>
            )}
            {changed.length > 0 && (
              <div className="list stack"><span className="caption">What changed <SourceBadge source="we_calculated" /></span><ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>{changed.map((c) => <li key={c}>{c}</li>)}</ul></div>
            )}
            <div className="table-wrap">
              <table className="cmp">
                <thead><tr><th scope="col"></th><th scope="col">As entered</th><th scope="col">With your what-ifs</th></tr></thead>
                <tbody>
                  {row("Finance", money(sc.amount), money(alt.scenario.amount))}
                  {row("APR and term", `${pct(sc.apr)} · ${sc.term}m`, `${pct(alt.scenario.apr)} · ${alt.scenario.term}m`)}
                  {row("Each month", money(bs.regular, true), money(as.regular, true))}
                  {row("Total repaid", money(bs.total), money(as.total))}
                  {row("Borrowing cost", money(bs.cost), money(as.cost))}
                  {row("A normal month leaves", money(typical(baseRows, sc.startIn)), money(typical(altRows, alt.scenario.startIn)))}
                  {row("Buffer after 12 months", money(baseRows[11].buffer), money(altRows[11].buffer))}
                  {row("Months short (first 24)", String(baseRows.slice(0, 24).filter((r) => r.left < 0).length), String(altRows.slice(0, 24).filter((r) => r.left < 0).length))}
                </tbody>
              </table>
            </div>
            {levers.length > 0 && altSaid.map((s) => <p key={s} className="insight small">{s}</p>)}
            {nav("Decode the real agreement")}
          </section>
        );
      })()}

      {step === S.decode && (
        <section className="stack" style={{ gap: 20 }} aria-labelledby="q-decode">
          <span className="caption">Decode It</span>
          <h2 id="q-decode" className="h1">Got the real agreement? See it in your story.</h2>
          <p className="muted">Upload or paste the finance agreement or quote. AI reads it and quotes the exact words behind each term; our code puts those terms through everything you’ve just seen. Skip this if you don’t have one yet.</p>
          <div className="grid-2 doc-row">
            <PasteFill idPrefix="car-offer" title="Upload or paste your agreement" samples={[{ label: "Example: fictional car finance offer", text: CAR_OFFER }]} onFill={onFill} />
            {st.offer ? (
              <section className="card stack">
                <div className="row" style={{ justifyContent: "space-between" }}><h3 className="h3">Your agreement</h3><SourceBadge source="document_says" /></div>
                <dl className="mlabel-rows">
                  <div><dt>Amount <SourceBadge source={st.offer.scenario.fieldSources.amount ?? "document_says"} /></dt><dd>{money(st.offer.scenario.amount)}</dd></div>
                  <div><dt>APR <SourceBadge source={st.offer.scenario.fieldSources.apr ?? "document_says"} /></dt><dd>{pct(st.offer.scenario.apr)}</dd></div>
                  <div><dt>Term <SourceBadge source={st.offer.scenario.fieldSources.term ?? "document_says"} /></dt><dd>{st.offer.scenario.term} months</dd></div>
                  <div><dt>Fee <SourceBadge source={st.offer.scenario.fieldSources.upfrontFee ?? "you_told_us"} /></dt><dd>{money(st.offer.scenario.upfrontFee)}</dd></div>
                  <div className="strong"><dt>Each month <SourceBadge source="we_calculated" /></dt><dd>{money(schedule(st.offer.scenario).regular, true)}</dd></div>
                </dl>
                {st.offer.assumed.length > 0 && <p className="missing-banner small"><b>Not in the document:</b> {st.offer.assumed.join(", ")}. Your scenario’s values are used for these.</p>}
                <div className="segmented" role="group" aria-label="Which terms to simulate">
                  <button type="button" aria-pressed={st.use === "offer"} onClick={() => set({ use: "offer" })}>Simulate this agreement</button>
                  <button type="button" aria-pressed={st.use === "mine"} onClick={() => set({ use: "mine" })}>Simulate my scenario</button>
                </div>
                <button type="button" className="link small" onClick={() => go(S.impact)}>See it in my situation</button>
              </section>
            ) : <p className="list small">No agreement decoded yet. Try the fictional example to see how it works.</p>}
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

      {step === S.summary && (
        <section className="stack" style={{ gap: 20 }} aria-labelledby="q-sum">
          <h2 id="q-sum" className="display">Before you sign</h2>
          <p className="lead muted">The whole picture, in one place.</p>
          <div className="summary-grid">
            <div className="card stack"><span className="caption">The goal <SourceBadge source="you_told_us" /></span>
              <dl className="mlabel-rows"><div><dt>Car price</dt><dd>{money(st.purchase.price)}</dd></div><div><dt>Deposit</dt><dd>{money(st.purchase.deposit)}</dd></div><div className="strong"><dt>Financed</dt><dd>{money(sc.amount)}</dd></div></dl>
            </div>
            <div className="card stack"><span className="caption">The finance <SourceBadge source={termsSource} /></span>
              <dl className="mlabel-rows"><div><dt>APR</dt><dd>{pct(sc.apr)}</dd></div><div><dt>Term</dt><dd>{sc.term} months</dd></div><div><dt>Monthly</dt><dd>{money(sch.regular, true)}</dd></div><div><dt>Total repaid</dt><dd>{money(sch.total)}</dd></div><div className="strong"><dt>Borrowing cost</dt><dd>{money(sch.cost)}</dd></div></dl>
            </div>
            <div className="card stack"><span className="caption">Credit context <SourceBadge source="you_told_us" /></span><p className="small">{creditLine(st.credit)}</p><p className="small muted">Not an affordability check, and not a prediction of what a lender would offer.</p></div>
            <div className="card stack"><span className="caption">Your situation <SourceBadge source="you_told_us" /></span>
              <dl className="mlabel-rows"><div><dt>Recurring income</dt><dd>{money(income)}</dd></div><div><dt>Normal commitments</dt><dd>{money(spending + longTerm)}</dd></div><div><dt>Existing borrowing</dt><dd>{money(borrowing)}</dd></div><div><dt>Remaining before the car</dt><dd>{money(pos.value)}</dd></div><div className="strong"><dt>Remaining after the car</dt><dd>{money(imp.after)}</dd></div></dl>
            </div>
            <div className="card stack"><span className="caption">Coming up <SourceBadge source="you_told_us" /></span>
              {st.events.length || (loan && loan.amount > 0 && loan.endsIn) ? (
                <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                  {st.events.map((e) => <li key={e.id}>{eventLine(e, monthName)}</li>)}
                  {loan && loan.amount > 0 && loan.endsIn && <li>Existing loan ({money(loan.amount)} a month) has its last payment in {monthName(loan.endsIn - 1)}</li>}
                </ul>
              ) : <p className="small muted">Nothing added.</p>}
            </div>
            <div className="card stack"><span className="caption">Important terms <SourceBadge source="document_says" /></span>
              {st.offer?.terms?.length ? (
                <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                  {st.offer.terms.map((t) => <li key={t.title}><b>{t.title}</b>{t.quote && <span className="muted"> · “{t.quote}”</span>}</li>)}
                </ul>
              ) : <p className="small muted">No agreement decoded yet. <button type="button" className="link small" onClick={() => go(S.decode)}>Decode It</button></p>}
            </div>
          </div>
          {statements(rows.slice(0, 24), bufferStart, monthName).map((s) => <p key={s} className="insight small">{s}</p>)}
          <CommitCheck type="loan" m={loanM} risks={risks("loan", loanValues, loanM)} check={understandingCheck("loan", loanValues, loanM)} perLabel="a month" onSave={() => {
            if (saved.length < MAX_SAVED) savedStore.set([...saved, { id: newOptionId(), name: `Car: ${sc.label}`, type: "loan", values: loanValues }]);
          }} />
          <div className="done-grid">
            <button type="button" className="done-card" onClick={() => { if (saved.length >= MAX_SAVED) { setMsg(`Compare holds up to ${MAX_SAVED}.`); return; } savedStore.set([...saved, { id: newOptionId(), name: `Car: ${sc.label}`, type: "loan", values: loanValues }]); setMsg("Added to Compare."); }}><Icon name="compare" /><b>Add to Compare</b><span className="small muted">Line it up with other options</span></button>
            <button type="button" className="done-card" onClick={() => { commitmentsStore.set([...commitments, { id: newOptionId(), name: `Car (${sc.label})`, type: "loan", values: loanValues }]); setMsg("Added to your commitment map."); }}><Icon name="chart" /><b>Add to my commitments</b><span className="small muted">See it next to what you already pay</span></button>
            <Link href="/cost-checker?type=loan#afford" className="done-card"><Icon name="calc" /><b>Stress test it</b><span className="small muted">Cost checker, stress test and reverse calculator</span></Link>
          </div>
          {msg && <p className="small" role="status">{msg}</p>}
          <button type="button" className="link small" onClick={() => { carStore.set(EMPTY_CAR); setDoc(null); setLevers([]); go(0); }}>Clear my answers and start again</button>
          {nav()}
          <p className="lead closing">We’ve shown how the numbers change under the information and assumptions you’ve provided. The decision remains yours.</p>
        </section>
      )}
    </div>
  );
}
