"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { creditEstablished, creditLine, displayedScores, type Cra } from "@/lib/credit";
import {
  changePoints, compareRows, decisionChanges, depositConsequence, keyMoments, paymentConsequence, paymentFigures, savingsConsequence,
  scenarioRow, snapshot, termConsequence, termSentence, waitScenarios, type DecisionFigures,
} from "@/lib/consequence";
import { DECISIONS, SIMPLE_GOAL, simplePlanHref, STAGES, type DecisionKind, type Stage } from "@/lib/decision";
import { LENDER_QUESTIONS, offerFromExtraction } from "@/lib/offer";
import { aprComparison, insightsFor, nextDebtEnding, otherTerm, repeatedPurchase, spendingChange, type Moment, type SuggestionAction } from "@/lib/insight";
import { risks, simulate, understandingCheck } from "@/lib/finance";
import { money, pct } from "@/lib/format";
import type { Mark } from "@/lib/highlight";
import { changesFromPlan, GOALS, situationFromPicture, type Goal } from "@/lib/journey";
import { scrollMotion } from "@/lib/motion";
import {
  amountOf, applyLevers, carScenario, debtPayments, eventAmount, eventLine, eventTag, exampleCar, hasEnteredPicture,
  hiddenCost, illustrativeProviders, impact, LEVERS, position, recurringIncome, schedule, simulateMonths, statements, toFinance, toMonthly,
  type CarState, type Debt, type Item, type Lever, type LeverAmounts, type Picture, type Scenario,
} from "@/lib/sim";
import { carStore, commitmentsStore, decisionStore, journeyStore, newOptionId, savedStore, thisMonth, MAX_COMMITMENTS, MAX_SAVED } from "@/lib/store";
import { EventEditor, SourceBadge, WhyBreakdown } from "./CarParts";
import { Chart } from "./Chart";
import { CommitCheck } from "./CommitCheck";
import { CostScanner } from "./CostScanner";
import { Consequence } from "./Consequence";
import { InsightPanel, LiveMini, LivePicture } from "./Insights";
import { CreditResult, CreditStart } from "./CreditContext";
import { DocumentPanel } from "./DocumentPanel";
import { Icon } from "./Icon";
import { startGoal } from "./Journey";
import { PasteFill, type FillResult } from "./PasteFill";
import { Questions } from "./Questions";
import { useSettled } from "./StoryKit";

// One natural question per screen, in the order a person thinks a decision through.
const STEPS: { stage: Stage; title: string }[] = [
  { stage: "My situation", title: "Monthly income" },
  { stage: "My situation", title: "Monthly spending" },
  { stage: "My situation", title: "Existing borrowing" },
  { stage: "My situation", title: "Savings and buffer" },
  { stage: "My situation", title: "Longer-term contributions" },
  { stage: "My situation", title: "Your situation today" },
  { stage: "Credit context", title: "Understand your credit" },
  { stage: "Credit context", title: "Your credit context" },
  { stage: "Goal", title: "What are you considering?" },
  { stage: "Purchase", title: "The car" },
  { stage: "Purchase", title: "How it could be funded" },
  { stage: "Finance", title: "Finance and its consequences" },
  { stage: "Future", title: "What’s changing" },
  { stage: "Consequences", title: "What this changes for you" },
  { stage: "Consequences", title: "Over time" },
  { stage: "What if", title: "What if" },
  { stage: "Small print", title: "Read the small print" },
  { stage: "Before you sign", title: "Before you sign" },
];
const S = {
  income: 0, spending: 1, borrowing: 2, buffer: 3, longterm: 4, snapshot: 5, credit: 6, result: 7, goal: 8, price: 9, deposit: 10, finance: 11,
  future: 12, impact: 13, timeline: 14, whatif: 15, decode: 16, summary: 17,
} as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GOAL_ORDER: { kind: DecisionKind; icon: string }[] = [
  { kind: "car", icon: "car" }, { kind: "home", icon: "household" }, { kind: "improve", icon: "tool" }, { kind: "purchase", icon: "wallet" },
  { kind: "borrowing", icon: "loan" }, { kind: "education", icon: "book" }, { kind: "invest", icon: "chart" }, { kind: "other", icon: "spark" },
];
/** Contextual labels for the situation screens' Next button, so the questions read as one conversation. */
const SITUATION_NEXT: Partial<Record<number, string>> = {
  [S.income]: "Now, regular costs", [S.spending]: "Now, what I already repay", [S.borrowing]: "Now, my savings", [S.buffer]: "Now, regular saving and pension", [S.longterm]: "See my situation",
};
/** What-ifs that set the same thing (the term or the APR): switching one on switches the others in its group off. */
const LEVER_GROUP: Partial<Record<Lever, "term" | "apr">> = { term36: "term", term48: "term", term60: "term", apr12: "apr", aprUp: "apr", aprDown: "apr" };
/** The term a term what-if chooses, so the chip for the term already in use isn't offered. */
const LEVER_TERM: Partial<Record<Lever, number>> = { term36: 36, term48: 48, term60: 60 };
/** A short name for a debt in sentences like “your £180/month loan’s last payment”. */
const debtName = (d: Debt) => (d.kind === "loan" ? "loan" : d.kind === "car" ? "car finance" : d.label.toLowerCase());
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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
 * The car decision as a story: the person’s situation, credit context, the goal, the purchase, how it could be funded,
 * finance, what they know about their future, then consequences, what-ifs, the small print and a summary.
 * CODE CALCULATES (sim.ts). AI only reads the agreement (Read the small print) and never produces these numbers.
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
  // A goal passed in ?goal= is remembered, but only offered after the credit context is done.
  const [wanted] = useState(() => params.get("goal") as Goal | null);
  // Which agency to open when someone chooses "Enter my Experian score" etc. from the result screen.
  const [craIntent, setCraIntent] = useState<Cra | "unknown" | null>(null);
  // Your situation comes first. After it, credit is the gateway: nothing beyond the credit step until there's a credit result.
  const step = rawStep <= S.credit || established ? rawStep : S.credit;
  const [levers, setLevers] = useState<Lever[]>([]);
  // Nothing of a bonus is assumed to go towards the deposit until the person chooses; a cheaper car starts £2,000 cheaper.
  const [amounts, setAmounts] = useState<LeverAmounts>({ rent: 100, salary: 150, priceCut: 2000, bonus: 0 });
  // "What if I kept £1,000?": a deposit to compare with, shown side by side. Nothing is overwritten until the person chooses it.
  const [keptDeposit, setKeptDeposit] = useState<number | null>(null);
  const [horizon, setHorizon] = useState(12);
  // A repeated purchase the person is curious about, and whether they opened the spending what-if.
  const [repeated, setRepeated] = useState({ amount: 0, timesPerWeek: 0 });
  const [showCut, setShowCut] = useState(false);
  // Buy now vs wait: how much of the extra savings to explore putting towards the deposit (none by default).
  const [waitShare, setWaitShare] = useState(0);
  const [full, setFull] = useState(false);
  const [doc, setDoc] = useState<Omit<FillResult, "type" | "values"> | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // Where a what-if jump came from, so Back can return there instead of to the step before What if.
  const [returnTo, setReturnTo] = useState<number | null>(null);
  const saved = savedStore.use();
  const decisions = decisionStore.use();
  const commitments = commitmentsStore.use();

  const start = thisMonth();
  const monthName = (m: number) => { const [y, mo] = start.split("-").map(Number); const k = y * 12 + (mo - 1) + m; return `${MONTHS[k % 12]} ${Math.floor(k / 12)}`; };
  // Counts the person's own moves between steps, so focus follows them (and not when saved answers load on arrival).
  const [moves, setMoves] = useState(0);
  const go = (n: number) => { if (n !== S.whatif) setReturnTo(null); setMoves((x) => x + 1); setStep(Math.max(0, Math.min(n, STEPS.length - 1))); window.scrollTo({ top: 0, behavior: scrollMotion() }); };
  const goFromCredit = () => { setMoves((x) => x + 1); setStep(S.result); window.scrollTo({ top: 0, behavior: scrollMotion() }); };
  const backTo = step === S.whatif ? returnTo : null;
  const next = () => go(step + 1), back = () => go(backTo ?? step - 1);
  // Move focus to the new step's question, so keyboard and screen-reader users start there.
  useEffect(() => {
    if (!moves) return;
    const h = document.querySelector<HTMLElement>(".journey.car section h2");
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }, [moves]);

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
  // The consequence engine (lib/consequence.ts): every figure below is calculated, never typed in.
  const snap = snapshot(p);
  const fromSavings = st.depositFromSavings !== false;
  const sav = savingsConsequence(snap.buffer, fromSavings ? st.purchase.deposit : 0);
  // If the deposit comes from savings, the simulation starts from the savings left afterwards.
  const pSim: Picture = fromSavings ? { ...p, reserves: { savings: sav.after, emergency: 0 } } : p;
  // One calm announcement once the deposit figures settle, not one per keystroke.
  const depositSaid = useSettled(`Finance required ${money(financed)}. ${fromSavings ? `Cash savings left after the deposit ${money(sav.after)}` : `Cash savings ${money(sav.before)}`}.`);
  const rows = simulateMonths(pSim, st.events, sc, Math.max(24, Math.min(84, sc.startIn + sc.term)));
  const pay = paymentConsequence(snap, sch.regular, st.preferredBuffer);
  const changes = changePoints(p, st.events, sc, rows, monthName);
  const without = simulateMonths(p, st.events, null, 12);
  const oneOffIns = st.events.filter((e) => e.recurrence === "one_off" && e.direction === "in");
  const firstBonus = [...oneOffIns].sort((a, b) => a.month - b.month)[0];
  const show = (k: string) => { setActive(null); requestAnimationFrame(() => setActive(k)); };
  const paySource = sc.source === "document" ? "document_says" : "we_calculated";
  const termsSource = sc.source === "document" ? "document_says" : sc.fieldSources.apr === "illustrative" ? "illustrative" : "you_told_us";
  const moments = keyMoments(p, st.events, sc, st.purchase.deposit, monthName);
  const exploreTo = (l: Lever) => { setLevers([l]); if (step !== S.whatif) setReturnTo(step); go(S.whatif); };
  // The one-off income is called what the person called it ("bonus", "overtime"…), and none of it is assumed to go to the deposit.
  const bonusName = firstBonus ? (firstBonus.label.trim() ? firstBonus.label.trim().toLowerCase() : "one-off income") : "bonus";
  const exploreBonus = () => { setAmounts((a) => ({ ...a, bonus: 0 })); exploreTo("waitBonus"); };
  const debtEnd = nextDebtEnding(p);
  const lastPayment = debtEnd ? monthName(debtEnd.month - 1) : "";
  // Term what-ifs always switch to the OTHER term (48 ↔ 60), so the button never re-runs the term already chosen.
  const termLever = (term: number): Lever => (otherTerm(term) === 48 ? "term48" : "term60");
  const waitExplore = [
    ...(firstBonus ? [{ label: `Wait for my ${bonusName}`, onClick: exploreBonus }] : []),
    ...(debtEnd ? [{ label: `What if I wait until ${lastPayment}?`, onClick: () => exploreTo("waitLoan") }] : []),
  ];
  const insightCtx = {
    picture: p, events: st.events, monthName, preferredBuffer: st.preferredBuffer, repeated,
    car: st.purchase.price > 0 ? { price: st.purchase.price, deposit: st.purchase.deposit, scenario: carScenario({ ...st, use: "mine" }), depositFromSavings: fromSavings } : undefined,
  };
  // Suggestions run a what-if when the person chooses one. They never decide anything.
  const onAction = (a: SuggestionAction) => {
    if (a === "waitBonus") exploreBonus();
    if (a === "waitLoan" || a === "term48" || a === "term60") exploreTo(a);
    if (a === "cheaperCar") { setAmounts((x) => ({ ...x, priceCut: 2000 })); exploreTo("carCheaper"); }
    if (a === "smallerDeposit") { const d = Math.max(0, Math.round(Math.min(snap.buffer, st.purchase.deposit) / 2 / 500) * 500); set({ purchase: { ...st.purchase, deposit: d, saved: d } }); }
    if (a === "spendingCut") setShowCut(true);
    if (a === "aprDown") exploreTo("aprDown");
    // Keep £1,000 of the savings: shown side by side with the current deposit. Nothing changes until the person picks it.
    if (a === "keepCash") setKeptDeposit(Math.max(0, Math.min(st.purchase.deposit, snap.buffer - 1000)));
  };
  // Example figures: the whole situation on the first step (asking first if anything was entered), only the car later.
  const useExample = () => {
    if (hasEnteredPicture(p) && !window.confirm("Replace the figures you’ve entered with a fictional example?")) return;
    const ex = exampleCar();
    // The person's own credit context is kept, so an example score is never shown as one they entered.
    carStore.set({ ...ex, credit: st.credit, preferredBuffer: st.preferredBuffer });
    setDoc(null); setLevers([]); setKeptDeposit(null);
  };
  // Other goals continue in the simplified wizard, starting from the situation already entered here (never asked twice).
  const toSimple = (g: Goal) => {
    // Their own dated changes come too (events and loan end), never the wizard's example changes.
    journeyStore.set({ ...startGoal(journeyStore.get(), g), ...(hasEnteredPicture(p) ? { ...situationFromPicture(p), changes: changesFromPlan(p, st.events) } : {}) });
    router.push(simplePlanHref(g));
  };
  const exampleCarOnly = () => { set({ goal: "car", purchase: exampleCar().purchase }); setKeptDeposit(null); };
  // Last time vs now: what was remembered on this device, against the same figures today.
  const lastDecision = decisions[decisions.length - 1];
  const nowDecision: DecisionFigures = { price: st.purchase.price, deposit: st.purchase.deposit, monthly: sch.regular, remainingBefore: pay.before, remainingAfter: pay.after, buffer: snap.buffer, apr: sc.apr, term: sc.term };
  // Provenance follows what is displayed: scores the person entered, and estimates we calculated.
  const credKinds = new Set(displayedScores(st.credit).map((d) => d.kind));
  const credBadges = <>{credKinds.has("entered") && <SourceBadge source="you_told_us" />}{credKinds.has("estimate") && <SourceBadge source="we_calculated" />}</>;
  const insights = (m: Moment) => <InsightPanel items={insightsFor(m, insightCtx)} onAction={onAction} />;
  const MOMENT: Partial<Record<number, Moment>> = { [S.income]: "income", [S.spending]: "spending", [S.borrowing]: "borrowing", [S.buffer]: "buffer", [S.longterm]: "longterm" };
  const why = (text: string) => <details className="why"><summary>Why am I seeing this?</summary><p className="small" style={{ margin: "8px 0 0" }}>{text}</p></details>;
  /** A small "Change" link that jumps back to the screen where a figure was entered. */
  const change = (to: number, what: string) => <button type="button" className="link small" onClick={() => go(to)} aria-label={`Change ${what}`}>Change</button>;

  const nav = (label = "Next", disabled = false) => (
    <div className="wizard-nav">
      {step > 0 ? <button type="button" className="btn btn-light" onClick={back}>{backTo !== null ? `Back to ${STEPS[backTo].title.toLowerCase()}` : "Back"}</button> : <span />}
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

  const fields = (k: ListKey, list: [string, string, string?][]) => (
    <div className="journey-fields">
      {list.map(([id, label, help]) => <Money key={id} id={`f-${id}`} label={label} help={help} value={amountOf(p[k], id)} onChange={(v) => setAmt(k, id, v)} />)}
    </div>
  );

  const onFill = (r: FillResult) => {
    // The shared mapping (lib/offer.ts): document terms where stated, your scenario’s values where not.
    const offer = offerFromExtraction(r, carScenario({ ...st, use: "mine" }));
    const { type: _t, values: _v, ...rest } = r;
    void _t; void _v;
    setDoc(rest);
    set({ offer, use: "offer" });
  };

  const marks: Mark[] = doc ? [
    ...Object.entries(doc.evidence).map(([id, e]) => ({ key: `f-${id}`, quote: e.quote })),
    ...doc.conditions.map((c, i) => ({ key: `cond-${i}`, quote: c.quote })),
  ].filter((x) => x.quote) : [];

  const loanValues = { amount: sc.amount, apr: sc.apr, term: sc.term, fee: sc.upfrontFee, lateFee: sc.lateFee ?? 0 };
  const loanM = simulate("loan", loanValues);
  const stageIdx = STAGES.indexOf(STEPS[step].stage);
  // Where you are within the current stage ("My situation · 2 of 6"), not "step 2 of 18".
  const inStage = STEPS.map((s, i) => ({ ...s, i })).filter((s) => s.stage === STEPS[step].stage);
  const stagePos = inStage.findIndex((s) => s.i === step) + 1;

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
      <p className="small muted">{STEPS[step].stage}{inStage.length > 1 ? ` · ${stagePos} of ${inStage.length}` : ""}{STEPS[step].title !== STEPS[step].stage ? ` · ${STEPS[step].title}` : ""}</p>
      {step > S.price && step < S.impact && story()}

      {step === S.snapshot && (
        <section className="stack journey-card" aria-labelledby="q-snap">
          <span className="caption">Before You Sign · Your situation today</span>
          <h2 id="q-snap" className="display">Your situation today</h2>
          <div className="snap">
            <div className="snap-row"><span>Income {change(S.income, "income")}</span><b>{money(snap.income)}</b>{why("Your take-home salary plus any other income that arrives every month. One-off money such as a bonus isn’t included.")}</div>
            <div className="snap-row"><span>Essential costs {change(S.spending, "essential costs")}</span><b>−{money(snap.essentials)}</b>{why("Rent or mortgage, bills, food and living costs, transport and insurance.")}</div>
            <div className="snap-row"><span>Other regular spending {change(S.spending, "other regular spending")}</span><b>−{money(snap.otherSpending)}</b>{why("Subscriptions, shopping, eating out, entertainment and any other regular spending you told us about.")}</div>
            <div className="snap-row"><span>Existing debt payments {change(S.borrowing, "existing debt payments")}</span><b>−{money(snap.debt)}</b>{why("Loans, credit cards, car finance, Buy Now Pay Later and overdraft repayments you told us about.")}</div>
            <div className="snap-row"><span>Regular saving and pension commitments {change(S.longterm, "saving and pension")}</span><b>−{money(snap.commitments)}</b>{why(p.pension.alreadyDeducted ? "Regular saving and other commitments. Your pension is already taken from your pay, so it isn’t counted twice." : "Your pension contribution, regular saving and other regular commitments.")}</div>
            <div className="snap-row total"><span>Estimated monthly remaining</span><b>{money(snap.remaining)}</b><WhyBreakdown title="Regular income minus regular costs, from what you’ve told us." result={pos} /></div>
            <div className="snap-row"><span>Savings and cash buffer {change(S.buffer, "savings")}</span><b>{money(snap.buffer)}</b>{why("Your savings plus emergency fund.")}</div>
            {snap.debtPct !== null && <div className="snap-row"><span>Existing debt payments as a share of income</span><b>{snap.debtPct}%</b>{why(`${money(snap.debt)} ÷ ${money(snap.income)} × 100.`)}</div>}
            {snap.monthsOfEssentials !== null && <div className="snap-row"><span>Your buffer covers about</span><b>{snap.monthsOfEssentials} months</b>{why(`${money(snap.buffer)} ÷ ${money(snap.essentials)} of essential costs a month. A way to picture your buffer, not a target.`)}</div>}
          </div>
          <p className="small muted">An estimate from what you’ve told us. It isn’t an official affordability assessment.</p>
          <section className="card stack">
            <label htmlFor="pref-buffer" className="h3">How much would you personally like to keep uncommitted each month? <span className="small muted">(optional)</span></label>
            <div className="journey-fields" style={{ maxWidth: 320 }}>
              <div className="field"><div className="input"><span>£</span><input id="pref-buffer" type="number" min={0} step={50} placeholder="e.g. 300" value={st.preferredBuffer ?? ""} onChange={(e) => set({ preferredBuffer: e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0) })} /></div></div>
            </div>
            <p className="small muted">Your own number, not a rule. If you set one, we’ll show how each scenario compares with it.</p>
          </section>
          {insights("snapshot")}
          <p className="lead">We’ll use this context to show what changes when you explore a financial decision.</p>
          {nav("Now, my credit context")}
        </section>
      )}

      {step === S.credit && (
        <section className="stack journey-card" aria-labelledby="q-credit">
          <span className="caption">Before You Sign · Credit context</span>
          <h2 id="q-credit" className="display">Now let’s understand your credit context</h2>
          <p className="lead muted">In the UK, you don’t have one universal credit score. Experian, Equifax and TransUnion use different scoring systems. Enter any you know, or none.</p>
          <CreditStart key={craIntent ?? "start"} initial={craIntent} credit={st.credit} onChange={(credit) => set({ credit })} onResult={goFromCredit} />
        </section>
      )}

      {step === S.result && (
        <section className="stack journey-card" aria-labelledby="q-result">
          <span className="caption">Before You Sign · Your credit context</span>
          <h2 id="q-result" className="display">{st.credit.calculated ? "Your estimated credit scores" : "Your credit context"}</h2>
          <CreditResult credit={st.credit} onEnter={(c) => { setCraIntent(c); go(S.credit); }} onChange={(credit) => set({ credit })} onExplore={() => { setCraIntent("unknown"); go(S.credit); }} />
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
          <h2 id="q-goal" className="display">What are you considering?</h2>
          {wanted && wanted !== "car" && GOALS[wanted] && (
            <div className="notice row" style={{ justifyContent: "space-between" }}>
              <span>You picked <b>{GOALS[wanted].label}</b> earlier.</span>
              <button type="button" className="btn btn-dark btn-sm" onClick={() => toSimple(wanted)}>Continue with it <Icon name="arrow" size={16} /></button>
            </div>
          )}
          <div className="goal-grid">
            {GOAL_ORDER.map(({ kind, icon }) => {
              const d = DECISIONS[kind];
              const pick = () => {
                if (kind === "car") { set({ goal: "car" }); go(S.price); return; }
                const plan = SIMPLE_GOAL[kind];
                if (plan) { toSimple(plan); return; }
                router.push("/start");
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
            <button type="button" className="link small" onClick={exampleCarOnly}>Use an example £25,000 car</button>
            <span className="small muted">Fills in the car only; your situation stays as you entered it.</span>
          </div>
          {st.purchase.price > 0 && insights("price")}
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
          <span className="caption">This affects two things</span>
          <span className="sr-only" aria-live="polite">{depositSaid}</span>
          <div className="grid-2">
            <div className="big-fact">
              <span className="caption">Finance required <SourceBadge source="we_calculated" /></span>
              <span className="small">{money(st.purchase.price)} car − {money(st.purchase.deposit)} deposit</span>
              <b>= {money(financed)}</b>
            </div>
            <div className="big-fact">
              <span className="caption">Cash savings <SourceBadge source="we_calculated" /></span>
              {fromSavings ? (<>
                <span className="small">{money(sav.before)} savings − {money(Math.min(st.purchase.deposit, sav.before))} deposit</span>
                <b>= {money(sav.after)}</b>
                {sav.shortfall > 0 && <span className="small">{sav.sentence}</span>}
              </>) : (<>
                <span className="small">The deposit comes from somewhere else</span>
                <b>{money(sav.before)}</b>
              </>)}
            </div>
          </div>
          <label className="quiz-option"><input type="checkbox" checked={fromSavings} onChange={(e) => set({ depositFromSavings: e.target.checked })} /> The deposit comes from the savings I told you about</label>
          {insights("deposit")}
          {keptDeposit !== null && keptDeposit !== st.purchase.deposit && (() => {
            const mine = carScenario({ ...st, use: "mine" });
            const dc = depositConsequence(snap, st.purchase.price, mine.apr, mine.term, keptDeposit, st.purchase.deposit);
            const col = (title: string, x: typeof dc.a) => (
              <div className="card stack">
                <span className="caption">{title}</span>
                <dl className="mlabel-rows">
                  <div><dt>Deposit</dt><dd>{money(x.deposit)}</dd></div>
                  <div><dt>Finance required</dt><dd>{money(x.financed)}</dd></div>
                  <div><dt>Each month</dt><dd>{money(x.monthly, true)}</dd></div>
                  <div><dt>Borrowing cost</dt><dd>{money(x.cost)}</dd></div>
                  {fromSavings && <div><dt>Cash savings after</dt><dd>{money(x.savingsAfter)}</dd></div>}
                  <div className="strong"><dt>Monthly remaining after</dt><dd>{money(x.remainingAfter)}</dd></div>
                </dl>
              </div>
            );
            return (
              <section className="card stack" aria-labelledby="keep-q">
                <span id="keep-q" className="caption">Compare the consequence <SourceBadge source="we_calculated" /></span>
                <div className="grid-2">{col(`Keeping ${money(snap.buffer - keptDeposit)} of savings`, dc.a)}{col("Your deposit now", dc.b)}</div>
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{dc.sentences.map((t) => <li key={t}>{t}</li>)}</ul>
                <p className="small muted">At {pct(mine.apr)} APR over {mine.term} months. Which matters more is your call.</p>
                <div className="row" style={{ gap: 12 }}>
                  <button type="button" className="btn btn-light btn-sm" onClick={() => { set({ purchase: { ...st.purchase, deposit: keptDeposit, saved: keptDeposit } }); setKeptDeposit(null); }}>Explore the {money(keptDeposit)} deposit</button>
                  <button type="button" className="link small quiet" onClick={() => setKeptDeposit(null)}>Close</button>
                </div>
              </section>
            );
          })()}
          <div className="chips" role="group" aria-label="Try another deposit or price">
            {fromSavings && snap.buffer > 0 && [3000, Math.round(snap.buffer / 2 / 100) * 100, snap.buffer].filter((d, i, arr) => d > 0 && d <= st.purchase.price && arr.indexOf(d) === i && d !== st.purchase.deposit).map((d) => (
              <button key={d} type="button" className="chip" onClick={() => set({ purchase: { ...st.purchase, deposit: d, saved: d } })}>What if I use a {money(d)} deposit?</button>
            ))}
            {st.purchase.price > 2000 && <button type="button" className="chip" onClick={() => onAction("cheaperCar")}>What if the car cost {money(st.purchase.price - 2000)}?</button>}
          </div>
          {nav("How might I finance it?")}
        </section>
      )}

      {step === S.finance && (() => {
        const providers = illustrativeProviders(st.purchase);
        const f = st.finance;
        const mine = carScenario({ ...st, use: "mine" });
        const mineSch = schedule(mine);
        const mineC = paymentConsequence(snap, mineSch.regular, st.preferredBuffer);
        // Both comparisons carry the whole scenario (fees included), and the term one compares the term chosen.
        const rates = aprComparison(snap, mine, st.preferredBuffer);
        const [ta, tb] = [mine.term, otherTerm(mine.term)].sort((a, b) => a - b);
        const terms = termConsequence(snap, mine, ta, tb, st.preferredBuffer);
        const mineApr = Math.round(mine.apr * 100) / 100;
        return (
          <section className="stack" style={{ gap: 20 }} aria-labelledby="q-fin">
            <h2 id="q-fin" className="h1">{copy.financeQuestion}</h2>
            <p className="muted">Three <b>fictional</b> providers, to show how differences play out. Only a lender can tell you its rate.</p>
            {insights("finance")}
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
            </section>
            <Consequence label="Monthly payment" result={money(mineSch.regular, true)} sub={`${pct(mine.apr)} APR · ${mine.term} months · ${money(mineSch.total)} in total · ${money(mineSch.cost)} borrowing cost`}
              figures={paymentFigures(mineC)}
              means={mineC.sentences}
              explore={[
                ...waitExplore,
                { label: "Increase my deposit", onClick: () => exploreTo("deposit") },
                { label: `Choose ${otherTerm(mine.term)} months`, onClick: () => exploreTo(termLever(mine.term)) },
                { label: "A lower APR", onClick: () => exploreTo("aprDown") },
                { label: "A higher APR", onClick: () => exploreTo("aprUp") },
                { label: "A cheaper car", onClick: () => { setAmounts((x) => ({ ...x, priceCut: x.priceCut ?? 2000 })); exploreTo("carCheaper"); } },
              ]} />

            <section className="card stack" aria-labelledby="term-q">
              <h3 id="term-q" className="h3">Compare the term</h3>
              <div className="table-wrap">
                <table className="cmp">
                  <thead><tr><th scope="col"></th>{[terms.a, terms.b].map((t) => <th key={t.term} scope="col">{t.term} months{t.term === mine.term ? " (your scenario)" : ""}</th>)}</tr></thead>
                  <tbody>
                    <tr><th scope="row">Each month</th>{[terms.a, terms.b].map((t) => <td key={t.term}>{money(t.monthly, true)}</td>)}</tr>
                    <tr><th scope="row">Borrowing cost</th>{[terms.a, terms.b].map((t) => <td key={t.term}>{money(t.cost)}</td>)}</tr>
                    <tr><th scope="row">Monthly remaining after</th>{[terms.a, terms.b].map((t) => <td key={t.term}>{money(t.remainingAfter)}</td>)}</tr>
                  </tbody>
                </table>
              </div>
              <p className="insight small">{termSentence(terms.a, terms.b)}</p>
            </section>

            <details className="how-calc">
              <summary>See what the rate changes</summary>
              <div className="stack" style={{ gap: 12, marginTop: 12 }}>
                <p className="small">We don’t know what rate a lender would offer you, so here are <b>illustrative</b> rates on {money(mine.amount)} over {mine.term} months. Scenarios, not predicted offers.</p>
                <div className="table-wrap">
                  <table className="cmp">
                    <thead><tr><th scope="col">Illustrative rate</th><th scope="col">Each month</th><th scope="col">Total repaid</th><th scope="col">Borrowing cost</th><th scope="col">Monthly remaining after</th>{st.preferredBuffer != null && <th scope="col">vs your {money(st.preferredBuffer)} buffer</th>}</tr></thead>
                    <tbody>
                      {rates.rows.map((r) => (
                        <tr key={r.apr} className={r.apr === mineApr ? "priority" : undefined}><th scope="row">{r.apr}% APR{r.apr === mineApr ? " (your scenario)" : ""}</th><td>{money(r.monthly, true)}</td><td>{money(r.total)}</td><td>{money(r.cost)}</td><td>{money(r.remainingAfter)}</td>{r.bufferGap !== null && <td>{r.bufferGap < 0 ? `${money(-r.bufferGap)} below` : `${money(r.bufferGap)} above`}</td>}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="insight small">{rates.note}</p>
              </div>
            </details>

            <details className="how-calc">
              <summary>Compare the providers’ consequences</summary>
              <div className="stack" style={{ gap: 12, marginTop: 12 }}>
                {providers.filter((x) => x.id !== providers[0].id).map((x) => {
                  const a = scenarioRow(snap, providers[0], st.preferredBuffer), b = scenarioRow(snap, x, st.preferredBuffer);
                  return (
                    <div key={x.id} className="cmp-pair">
                      <p className="small"><b>{x.provider}</b> compared with <b>{providers[0].provider}</b>:</p>
                      <ul className="small">{compareRows({ ...a, label: providers[0].provider ?? a.label }, { ...b, label: x.provider ?? b.label }).map((t) => <li key={t}>{t}</li>)}</ul>
                    </div>
                  );
                })}
                <p className="small muted">A smaller monthly payment can mean a longer commitment and a higher total cost. Which matters more is your call.</p>
              </div>
            </details>
            <p className="small muted">Speaking to a lender or broker? <button type="button" className="link small" onClick={() => go(S.decode)}>See the questions worth asking</button></p>
            {nav("What’s coming up?")}
          </section>
        );
      })()}

      {step >= S.income && step <= S.longterm && (
        <div className="picture-layout">
          <section className="stack journey-card">
            <LiveMini picture={p} />
            {step === S.income && (<>
              {lastDecision && (
                <p className="list small">
                  You remembered a car decision on {shortDate(lastDecision.savedAt)} on this device. Update anything that’s changed, then compare last time with now.{" "}
                  <button type="button" className="link small" onClick={() => go(S.summary)}>Compare last time with now</button>
                </p>
              )}
              <span className="caption">Before You Sign · Your situation</span>
              <h2 className="display">First, let’s understand your situation.</h2>
              <p className="lead muted">A monthly payment means something different for everyone. Tell us a little about your financial situation so we can put the numbers into context.</p>
              <h2 className="h1">What money regularly comes in?</h2>
              <p className="muted">After tax, each month. Rough is fine, and your figures stay in your browser.</p>
              {fields("income", [["salary", "Take-home salary"], ["other", "Other recurring income", "Only money that arrives every month."]])}
              <p className="small muted">Bonuses and other one-off money come later, so they’re never counted as regular income.</p>
              <p className="small muted"><button type="button" className="link small quiet" onClick={useExample}>Try it with example figures</button> A fictional situation and £25,000 car you can change.</p>
            </>)}
            {step === S.spending && (<>
              <h2 className="h1">What does a normal month cost you?</h2>
              <p className="muted">The regular things. No judgement: it just makes the simulation realistic.</p>
              <h3 className="h3">Essentials</h3>
              {fields("essentials", [["rent", "Rent or mortgage"], ["bills", "Bills (energy, water, council tax, phone)"], ["food", "Food and living costs"], ["transport", "Transport"], ["insurance", "Insurance"]])}
              <h3 className="h3">Other regular spending</h3>
              {fields("discretionary", [["subs", "Subscriptions"], ["fun", "Shopping, eating out and entertainment"], ["otherSpend", "Other recurring spending"]])}
              <details className="list repeat-calc">
                <summary>Something small you buy often? See what it adds up to</summary>
                <div className="journey-fields" style={{ marginTop: 12 }}>
                  <Money id="rp-amt" label="Each time" step={1} value={repeated.amount} onChange={(amount) => setRepeated({ ...repeated, amount })} />
                  <div className="field"><label htmlFor="rp-times">Times a week</label><div className="input"><input id="rp-times" type="number" min={0} max={21} value={repeated.timesPerWeek || ""} placeholder="0" onChange={(e) => setRepeated({ ...repeated, timesPerWeek: Math.max(0, Math.min(21, Number(e.target.value) || 0)) })} /></div></div>
                </div>
                {repeated.amount > 0 && repeated.timesPerWeek > 0 && (() => {
                  const r = repeatedPurchase(repeated.amount, repeated.timesPerWeek);
                  return (
                    <div className="row" style={{ gap: 10, marginTop: 10 }}>
                      <span className="small">About {money(r.week)} a week · {money(Math.round(r.month))} a month · <b>{money(Math.round(r.year))} a year</b></span>
                      <button type="button" className="btn btn-light btn-sm" onClick={() => setAmt("discretionary", "otherSpend", amountOf(p.discretionary, "otherSpend") + Math.round(r.month))}>Add {money(Math.round(r.month))}/month to my other spending</button>
                    </div>
                  );
                })()}
              </details>
              {showCut && (() => {
                const top = [...p.discretionary].filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount)[0];
                if (!top) return null;
                return (
                  <div className="cut-table" aria-live="polite">
                    <span className="caption">What if {top.label.toLowerCase()} changed?</span>
                    {spendingChange(top.amount, snap.remaining).map((c) => (
                      <p key={c.cut} className="small"><b>−{money(c.cut)} a month</b> = {money(c.perYear)} a year · estimated monthly remaining {money(snap.remaining)} → <b>{money(c.remainingAfter)}</b></p>
                    ))}
                    <p className="small muted">Reducing recurring spending by an amount would increase your estimated monthly remaining by the same amount, assuming everything else stayed the same. Your call.</p>
                  </div>
                );
              })()}

            </>)}
            {step === S.borrowing && (<>
              <h2 className="h1">What are you already paying back?</h2>
              <p className="muted">Monthly repayments on borrowing you already have.</p>
              {fields("debts", [["loan", "Loan interest", "Your whole monthly loan payment, interest included"], ["card", "Credit-card repayments"], ["carfin", "Existing car finance"], ["bnpl", "Buy Now Pay Later"], ["overdraft", "Overdraft or other borrowing"]])}
              {loan && loan.amount > 0 && (
                <div className="field" style={{ maxWidth: 360 }}>
                  <label htmlFor="loan-end">When is your loan’s last payment?</label>
                  <div className="input"><select id="loan-end" value={loan.endsIn ?? 0} onChange={(e) => setPicture({ debts: p.debts.map((d) => (d.id === "loan" ? { ...d, endsIn: Number(e.target.value) || undefined } : d)) })}><option value={0}>Not soon / not sure</option>{Array.from({ length: 60 }, (_, k) => k + 1).map((m) => <option key={m} value={m}>{m === 1 ? `This month (${monthName(0)})` : monthName(m - 1)}</option>)}</select></div>
                </div>
              )}
            </>)}
            {step === S.buffer && (<>
              <h2 className="h1">What do you have to fall back on?</h2>
              <p className="muted">Include any money you might use as a deposit. Later you’ll see what using it changes.</p>
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
            {MOMENT[step] && insights(MOMENT[step]!)}
            {nav(SITUATION_NEXT[step] ?? "Next")}
          </section>
          <LivePicture picture={p} />
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
        // With the car, the buffer starts from savings after the deposit (as everywhere else); without it, from today.
        const h = hiddenCost(p, st.events, sc, pSim);
        return (
          <section className="stack" style={{ gap: 20 }} aria-labelledby="q-impact">
            <span className="caption">Consequences</span>
            <h2 id="q-impact" className="display">Here’s what this decision could change for you.</h2>
            <Consequence label="What this changes for you" result={`${money(pay.before)} → ${money(pay.after)}`} sub="estimated monthly remaining, before and after this commitment"
              figures={paymentFigures(pay)}
              means={[...pay.sentences, ...(fromSavings && st.purchase.deposit > 0 ? [sav.sentence] : [])]}
              changes={fromSavings && st.purchase.deposit > 0 ? [{ label: "Cash savings after the deposit", before: money(sav.before), after: money(sav.after) }] : []}
              explore={[
                ...waitExplore,
                { label: "Increase my deposit", onClick: () => exploreTo("deposit") },
                { label: `Choose ${otherTerm(sc.term)} months`, onClick: () => exploreTo(termLever(sc.term)) },
                { label: "Compare a lower APR", onClick: () => exploreTo("aprDown") },
                { label: "Compare a higher APR", onClick: () => exploreTo("aprUp") },
                { label: "Choose a cheaper car", onClick: () => exploreTo("carCheaper") },
              ]} />
            {(st.events.length > 0 || (loan && loan.amount > 0 && loan.endsIn)) && (
              <div className="list stack">
                <span className="caption">What you know is coming · kept separate from your normal month</span>
                {st.events.map((e) => <p key={e.id} className="small event-line"><b className="event-amt">{eventAmount(e)}</b><span className="event-tag">{eventTag(e)}</span><span className="muted">{eventLine(e, monthName)}</span></p>)}
                {loan && loan.amount > 0 && loan.endsIn && <p className="small event-line"><b className="event-amt">−{money(loan.amount)} a month</b><span className="event-tag">RECURRING EXPENSE STOPS</span><span className="muted">Existing loan’s last payment in {monthName(loan.endsIn - 1)}</span></p>}
              </div>
            )}
            <div className="view-switch row">
              <div className="segmented" role="group" aria-label="How much detail">
                <button type="button" aria-pressed={!full} onClick={() => setFull(false)}>Quick view</button>
                <button type="button" aria-pressed={full} onClick={() => setFull(true)}>Full breakdown</button>
              </div>
              <span className="small muted">Same numbers either way.</span>
            </div>
            {full && (<>
            <div className="reveal-grid">
              <div className="card stack reveal" style={{ ["--i" as string]: 0 }}><span className="caption">The goal</span><p className="h3">{money(st.purchase.price)} car</p></div>
              <div className="card stack reveal" style={{ ["--i" as string]: 1 }}><span className="caption">The funding</span><p className="small">{money(st.purchase.deposit)} deposit</p><p className="h3">{money(sc.amount)} financed</p></div>
              <div className="card stack reveal" style={{ ["--i" as string]: 2 }}><span className="caption">The credit context {credBadges}</span><p className="small">{creditLine(st.credit)}</p></div>
              <div className="card stack reveal" style={{ ["--i" as string]: 3 }}><span className="caption">The finance scenario <SourceBadge source={termsSource} /></span>
                <dl className="mlabel-rows"><div><dt>APR · term</dt><dd>{pct(sc.apr)} · {sc.term}m</dd></div><div><dt>Monthly</dt><dd>{money(sch.regular, true)}</dd></div><div><dt>Total repaid</dt><dd>{money(sch.total)}</dd></div><div><dt>Borrowing cost</dt><dd>{money(sch.cost)}</dd></div></dl>
              </div>
            </div>
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
            <ol className="moments" aria-label="Key moments of this decision">
              {moments.map((mo, i) => <li key={`${mo.when}-${i}`}><span className="caption">{mo.when}</span><b>{mo.label}</b>{mo.amount && <span className="small">{mo.amount}</span>}</li>)}
            </ol>
            {changes.map((c) => <p key={c.m} className="insight">{c.sentence}</p>)}

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
        const base = { picture: pSim, events: st.events, scenario: sc };
        // The extra deposit comes out of the savings left after the deposit (when the deposit comes from savings).
        const alt = applyLevers(base, levers, { ...amounts, depositFromSavings: fromSavings });
        const H = Math.max(24, Math.min(84, alt.scenario.startIn + alt.scenario.term));
        const baseRows = simulateMonths(pSim, st.events, sc, H);
        const altRows = simulateMonths(alt.picture, alt.events, alt.scenario, H);
        const bs = schedule(sc), as = schedule(alt.scenario);
        const typical = (rs: typeof baseRows, from: number) => { const v = rs.slice(from, from + 12).map((r) => r.normalLeft).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] ?? 0; };
        const row = (label: string, a: string, b: string) => <tr key={label} className={a !== b ? "priority" : undefined}><th scope="row">{label}</th><td>{a}</td><td>{b}</td></tr>;
        const altSaid = statements(altRows.slice(0, 24), bufferStart, monthName);
        // Less finance comes from a cheaper car and/or a larger deposit; keep the two apart so neither is shown as the other.
        const extraDeposit = sc.amount - alt.scenario.amount;
        const cut = levers.includes("carCheaper") ? Math.min(amounts.priceCut ?? 2000, sc.amount) : 0;
        const addedDeposit = Math.max(0, extraDeposit - cut);
        const bonusShare = firstBonus ? (amounts.bonus ?? 0) / firstBonus.amount : 0;
        const setBonus = (v: number) => setAmounts((a) => ({ ...a, bonus: Math.max(0, Math.min(firstBonus?.amount ?? 0, Math.round(v))) }));
        // Switching on a term or APR what-if switches off the others that set the same thing.
        const toggle = (l: Lever) => setLevers((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x.filter((y) => !LEVER_GROUP[l] || LEVER_GROUP[y] !== LEVER_GROUP[l]), l]));
        const shown = (Object.keys(LEVERS) as Lever[]).filter((l) => !(l === "waitBonus" && !oneOffIns.length) && !(l === "loanEnds" && borrowing <= 0) && !(l === "waitLoan" && !nextDebtEnding(p))
          && LEVER_TERM[l] !== sc.term && !(l === "apr12" && sc.apr === 12));
        // Cash savings at the start, after the deposit: as entered, and with the what-ifs (an extra deposit comes out of them).
        const cashNow = pSim.reserves.savings + pSim.reserves.emergency;
        const cashAlt = alt.picture.reserves.savings + alt.picture.reserves.emergency;
        const changed: string[] = [];
        if (levers.length) {
          if (alt.scenario.amount !== sc.amount) changed.push(`Finance goes from ${money(sc.amount)} to ${money(alt.scenario.amount)}.`);
          if (Math.abs(cashAlt - cashNow) > 0.5) {
            const extraCash = cashNow - cashAlt;
            if (cashAlt >= 0) changed.push(`The extra ${money(extraCash)} deposit uses more cash upfront: cash savings after the deposit would be ${money(cashAlt)} instead of ${money(cashNow)}.`);
            else if (cashNow > 0) changed.push(`The extra ${money(extraCash)} deposit is ${money(-cashAlt)} more than the ${money(cashNow)} of savings left after your deposit, so that part would need to come from somewhere else.`);
            else changed.push(`No savings are left after your deposit, so the extra ${money(extraCash)} deposit would need to come from somewhere else.`);
          }
          if (Math.abs(as.regular - bs.regular) > 0.5) changed.push(`The monthly payment goes from ${money(bs.regular, true)} to ${money(as.regular, true)}.`);
          if (Math.abs(as.cost - bs.cost) > 0.5) changed.push(`The borrowing cost goes from ${money(bs.cost)} to ${money(as.cost)}.`);
          // From the simulation, so rent, salary, income-dip, spending and loan what-ifs all count; anchored to the figure shown earlier.
          const altAfter = Math.round((pay.after + typical(altRows, alt.scenario.startIn) - typical(baseRows, sc.startIn)) * 100) / 100;
          if (Math.abs(altAfter - pay.after) > 0.5) {
            changed.push(`Your estimated monthly remaining (once payments start) would be ${money(altAfter)} instead of ${money(pay.after)}.`);
            if (st.preferredBuffer != null) {
              const gap = altAfter - st.preferredBuffer;
              changed.push(gap < 0
                ? `That’s ${money(-gap)} below the ${money(st.preferredBuffer)} monthly buffer you said you’d like to keep.`
                : `That’s ${money(gap)} above the ${money(st.preferredBuffer)} monthly buffer you said you’d like to keep.`);
            }
          }
          const overlap = (rs: typeof baseRows) => rs.filter((r) => r.existingDebt > 0 && r.newPayment > 0).length;
          if (overlap(altRows) !== overlap(baseRows)) changed.push(`Months where the car payment and your existing borrowing overlap: ${overlap(baseRows)} → ${overlap(altRows)}.`);
          const lowest = (rs: typeof baseRows) => Math.min(...rs.slice(0, 12).map((r) => r.normalLeft));
          if (Math.abs(lowest(altRows) - lowest(baseRows)) > 0.5) changed.push(`The tightest regular month in the first year would leave ${money(lowest(altRows))} instead of ${money(lowest(baseRows))}.`);
          if (alt.scenario.startIn) changed.push(`The first payment moves to ${monthName(alt.scenario.startIn + 1)}.`);
          const bb = baseRows[11].buffer, ab = altRows[11].buffer;
          if (Math.abs(ab - bb) > 0.5) changed.push(`Your cash buffer after 12 months would be ${money(ab)} instead of ${money(bb)}.`);
        }
        return (
          <section className="stack" style={{ gap: 20 }} aria-labelledby="q-whatif">
            <h2 id="q-whatif" className="h1">What if…?</h2>
            {debtEnd && (
              <div className="notice stack">
                <p><b>Something changes in {lastPayment}</b>: your {money(debtEnd.monthly)}/month {debtName(debtEnd.debt)}’s last payment.</p>
                <div className="row" style={{ gap: 10 }}>
                  <button type="button" className={levers.includes("waitLoan") ? "btn btn-dark btn-sm" : "btn btn-light btn-sm"} aria-pressed={levers.includes("waitLoan")} onClick={() => toggle("waitLoan")}>
                    {levers.includes("waitLoan") ? `Showing: waiting until ${lastPayment}` : `What if I wait until ${lastPayment}?`}
                  </button>
                </div>
              </div>
            )}
            {firstBonus && (
              <div className="notice stack">
                <p><b>You told us {money(firstBonus.amount)} is expected {firstBonus.month === 1 ? "next month" : `in ${monthName(firstBonus.month)}`}.</b> It’s one-off money, so none of it is assumed to go towards the deposit.</p>
                <div className="row" style={{ gap: 10 }}>
                  <button type="button" className={levers.includes("waitBonus") ? "btn btn-dark btn-sm" : "btn btn-light btn-sm"} aria-pressed={levers.includes("waitBonus")} onClick={() => { if (!levers.includes("waitBonus")) setBonus(0); toggle("waitBonus"); }}>
                    {levers.includes("waitBonus") ? "Showing: waiting for it" : "What if I wait?"}
                  </button>
                </div>
                {levers.includes("waitBonus") && (
                  <div className="row" style={{ gap: 10 }}>
                    <span className="small"><b>How much of the {bonusName} towards the deposit?</b></span>
                    <div className="segmented" role="group" aria-label={`Share of the ${bonusName} towards the deposit`}>
                      {[0, 0.5, 1].map((x) => <button key={x} type="button" aria-pressed={bonusShare === x} onClick={() => setBonus(firstBonus.amount * x)}>{x === 0 ? "None" : x === 1 ? "All" : "Half"}</button>)}
                    </div>
                    <div className="field" style={{ maxWidth: 200 }}><label htmlFor="w-bonus">Other amount</label><div className="input"><span>£</span><input id="w-bonus" type="number" min={0} max={firstBonus.amount} step={250} value={amounts.bonus ?? 0} onChange={(e) => setBonus(Number(e.target.value) || 0)} /></div></div>
                  </div>
                )}
              </div>
            )}
            {(() => {
              const monthlySaving = amountOf(p.otherSaving, "regular");
              // The loan is the scenario being simulated. Each column's remaining is the regular month its first payment
              // would fall in (row m is month m + 1), so a loan ending or a rent change by then is reflected.
              const waitMonths = [0, 1, 3, 6, 12];
              const noCar = simulateMonths(p, st.events, null, 13);
              const remainingAt = waitMonths.map((m) => (m === 0 ? snap.remaining : noCar[m].normalLeft));
              const wr = waitScenarios(snap, { monthlySaving, scenario: sc, deposit: st.purchase.deposit, shareToDeposit: waitShare, depositFromSavings: fromSavings, months: waitMonths, remainingAt });
              // Said plainly, from what the person told us: the savings row counts regular saving only.
              return (
                <section className="card stack" aria-labelledby="wait-q">
                  <span className="caption">Buy now or wait</span>
                  <h3 id="wait-q" className="h3">What could waiting change?</h3>
                  {sc.amount <= 0 ? <p className="small">You haven’t told us about an amount to finance yet, so there’s no payment to compare. <button type="button" className="link small" onClick={() => go(S.price)}>Add the car</button></p> : monthlySaving > 0 ? (<>
                    <p className="small">Based on what you’ve told us, you put {money(monthlySaving)} a month into regular saving. Assuming your contributions continue, and ignoring any interest or returns, here’s what waiting could change.</p>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="small"><b>Use some of the extra savings towards the deposit?</b></span>
                      <div className="segmented" role="group" aria-label="Use some of the extra savings towards the deposit?">
                        {[0, 0.5, 1].map((x) => <button key={x} type="button" aria-pressed={waitShare === x} onClick={() => setWaitShare(x)}>{x === 0 ? "None" : x === 1 ? "All" : "Half"}</button>)}
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table className="cmp">
                        <thead><tr><th scope="col"></th>{wr.map((w) => <th key={w.months} scope="col">{w.months === 0 ? "Buy now" : `Wait ${w.months} month${w.months > 1 ? "s" : ""}`}</th>)}</tr></thead>
                        <tbody>
                          <tr><th scope="row">Savings before the deposit</th>{wr.map((w) => <td key={w.months}>{money(w.savings)}</td>)}</tr>
                          <tr><th scope="row">Deposit</th>{wr.map((w) => <td key={w.months}>{money(w.deposit)}</td>)}</tr>
                          <tr><th scope="row">Finance required</th>{wr.map((w) => <td key={w.months}>{money(w.financed)}</td>)}</tr>
                          <tr><th scope="row">Each month</th>{wr.map((w) => <td key={w.months}>{money(w.monthly, true)}</td>)}</tr>
                          <tr><th scope="row">Total repaid</th>{wr.map((w) => <td key={w.months}>{money(w.total)}</td>)}</tr>
                          <tr><th scope="row">Borrowing cost</th>{wr.map((w) => <td key={w.months}>{money(w.cost)}</td>)}</tr>
                          <tr><th scope="row">Monthly remaining after the payment</th>{wr.map((w) => <td key={w.months}>{money(w.remainingAfter)}</td>)}</tr>
                          <tr><th scope="row">Cash kept after the deposit</th>{wr.map((w) => <td key={w.months}>{money(w.cashAfterDeposit)}</td>)}</tr>
                        </tbody>
                      </table>
                    </div>
                    {(firstBonus || debtEnd) && <p className="small muted">The savings row counts only your regular saving{firstBonus ? `; your ${bonusName} is explored with the buttons above` : ""}.{debtEnd ? ` Monthly remaining includes the ${debtName(debtEnd.debt)} ending.` : ""}</p>}
                    <p className="small muted">A projection of what you entered, not a prediction. <SourceBadge source="we_calculated" /></p>
                  </>) : <p className="small">You haven’t told us about any regular saving, so waiting wouldn’t change your savings in this projection. <button type="button" className="link small" onClick={() => go(S.longterm)}>Add regular saving</button></p>}
                </section>
              );
            })()}
            <p className="muted">Or try any combination. Our code reruns the whole simulation; nothing here is a prediction or advice.</p>
            <div className="chips" role="group" aria-label="What ifs">
              {shown.filter((l) => l !== "waitBonus" && l !== "waitLoan").map((l) => (
                <button key={l} type="button" className="chip" aria-pressed={levers.includes(l)} onClick={() => toggle(l)}>
                  {l === "carCheaper" ? `The car costs ${money(amounts.priceCut ?? 2000)} less` : l === "rentUp" ? `Rent increases by ${money(amounts.rent)}` : l === "salaryUp" ? `My salary changes by ${amounts.salary >= 0 ? "+" : "−"}${money(Math.abs(amounts.salary))}` : LEVERS[l]}
                </button>
              ))}
            </div>
            {(levers.includes("rentUp") || levers.includes("salaryUp") || levers.includes("carCheaper")) && (
              <div className="journey-fields" style={{ maxWidth: 560 }}>
                {levers.includes("carCheaper") && <Money id="w-price" label="New price" step={500} value={Math.max(0, st.purchase.price - (amounts.priceCut ?? 2000))} onChange={(v) => setAmounts((a) => ({ ...a, priceCut: Math.max(0, st.purchase.price - v) }))} help={`The car as entered: ${money(st.purchase.price)}.`} />}
                {levers.includes("rentUp") && <Money id="w-rent" label="Rent increase a month" value={amounts.rent} onChange={(rent) => setAmounts((a) => ({ ...a, rent }))} />}
                {levers.includes("salaryUp") && <div className="field"><label htmlFor="w-sal">Salary change a month (negative for a cut)</label><div className="input"><span>£</span><input id="w-sal" type="number" step={50} value={amounts.salary} onChange={(e) => setAmounts((a) => ({ ...a, salary: Number(e.target.value) || 0 }))} /></div></div>}
              </div>
            )}
            {extraDeposit > 0 && (
              <div className="grid-2">
                <div className="card stack"><span className="caption">As entered</span><p className="small">{money(st.purchase.price)} car</p><p className="small">{money(st.purchase.deposit)} deposit</p>{fromSavings && <p className="small">Cash savings after the deposit: {money(cashNow)}</p>}<p className="h3">{money(sc.amount)} finance</p></div>
                <div className="card stack emph-card"><span className="caption">With your what-ifs</span><p className="small">{money(st.purchase.price - cut)} car</p><p className="small">{money(st.purchase.deposit + addedDeposit)} deposit</p>{fromSavings && <p className="small">Cash savings after the deposit: {cashAlt < 0 ? `${money(0)} (${money(-cashAlt)} short)` : money(cashAlt)}</p>}<p className="h3">{money(alt.scenario.amount)} finance</p></div>
              </div>
            )}
            {changed.length > 0 && (
              <div className="list stack"><span className="caption">What changed <SourceBadge source="we_calculated" /></span><ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>{changed.map((c) => <li key={c}>{c}</li>)}</ul></div>
            )}
            <div className="table-wrap">
              <table className="cmp">
                <thead><tr><th scope="col"></th><th scope="col">As entered</th><th scope="col">With your what-ifs</th></tr></thead>
                <tbody>
                  {row("Car price", money(st.purchase.price), money(st.purchase.price - cut))}
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
            {nav("Read the small print")}
          </section>
        );
      })()}

      {step === S.decode && (
        <section className="stack" style={{ gap: 20 }} aria-labelledby="q-decode">
          <span className="caption">Read the small print</span>
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
            ) : <p className="list small">No agreement read yet. Try the fictional example to see how it works.</p>}
          </div>
          <Questions questions={LENDER_QUESTIONS} />
          {doc && (doc.conditions.length > 0 || doc.source) && (
            <div className="grid-2 doc-row">
              <CostScanner conditions={doc.conditions} onShow={show} />
              <DocumentPanel source={doc.source} marks={marks} active={active} redactions={doc.redactions} fromFile={doc.fromFile} />
            </div>
          )}
          {nav("Before you sign")}
        </section>
      )}

      {step === S.summary && (
        <section className="stack" style={{ gap: 20 }} aria-labelledby="q-sum">
          <h2 id="q-sum" className="display">Before you sign</h2>
          <div className="summary-grid">
            <div className="card stack"><span className="caption">The decision <SourceBadge source="you_told_us" /></span>
              <dl className="mlabel-rows"><div><dt>Car</dt><dd>{money(st.purchase.price)}</dd></div><div><dt>Deposit</dt><dd>{money(st.purchase.deposit)}</dd></div><div className="strong"><dt>Financed <SourceBadge source={sc.fieldSources.amount ?? "we_calculated"} /></dt><dd>{money(sc.amount)}</dd></div></dl>
            </div>
            <div className="card stack"><span className="caption">The commitment <SourceBadge source={termsSource} /></span>
              <dl className="mlabel-rows"><div><dt>Each month</dt><dd>{money(sch.regular, true)}</dd></div><div><dt>Term</dt><dd>{sc.term} months at {pct(sc.apr)} APR</dd></div><div><dt>Total repayment</dt><dd>{money(sch.total)}</dd></div><div className="strong"><dt>Borrowing cost</dt><dd>{money(sch.cost)}</dd></div></dl>
            </div>
            <div className="card stack emph-card"><span className="caption">What it changes for you <SourceBadge source="we_calculated" /></span>
              <dl className="mlabel-rows">
                <div><dt>Monthly remaining</dt><dd>{money(pay.before)} → {money(pay.after)}</dd></div>
                {fromSavings && <div><dt>Savings after deposit</dt><dd>{money(sav.before)} → {money(sav.after)}</dd></div>}
                {pay.debtPctBefore !== null && pay.debtPctAfter !== null && <div><dt>Borrowing repayments as a share of income</dt><dd>{pay.debtPctBefore}% → {pay.debtPctAfter}%</dd></div>}
                {st.preferredBuffer != null && <div><dt>Your chosen buffer</dt><dd>{money(st.preferredBuffer)}</dd></div>}
                {pay.bufferGap !== null && <div className="strong"><dt>Difference</dt><dd>{pay.bufferGap < 0 ? `${money(-pay.bufferGap)} below your buffer` : `${money(pay.bufferGap)} above your buffer`}</dd></div>}
              </dl>
            </div>
            <div className="card stack"><span className="caption">What changes later <SourceBadge source="you_told_us" /></span>
              {changes.length || st.events.length ? (
                <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                  {st.events.filter((e) => e.recurrence === "one_off").map((e) => <li key={e.id}>{eventLine(e, monthName)}</li>)}
                  {changes.map((c) => <li key={c.m}>{c.sentence}</li>)}
                </ul>
              ) : <p className="small muted">Nothing you’ve told us changes over the term.</p>}
            </div>
            <div className="card stack"><span className="caption">Credit context {credBadges}</span><p className="small">{creditLine(st.credit)}</p><p className="small muted">Not an affordability check, and not a prediction of what a lender would offer.</p></div>
            <div className="card stack"><span className="caption">Important terms {st.offer?.terms?.length ? <SourceBadge source="document_says" /> : null}</span>
              {st.offer?.terms?.length ? (
                <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                  {st.offer.terms.map((t) => <li key={t.title}><b>{t.title}</b>{t.quote && <span className="muted"> · “{t.quote}”</span>}</li>)}
                </ul>
              ) : <p className="small muted">No agreement read yet. <button type="button" className="link small" onClick={() => go(S.decode)}>Read the small print</button></p>}
            </div>
          </div>
          <section className="card stack">
            <span className="caption">Things worth exploring</span>
            <div className="chips">
              {waitExplore.map((e) => <button key={e.label} type="button" className="chip" onClick={e.onClick}>{e.label}</button>)}
              <button type="button" className="chip" onClick={() => go(S.deposit)}>Use a different deposit</button>
              <button type="button" className="chip" onClick={() => exploreTo("aprDown")}>Compare a lower APR</button>
              <button type="button" className="chip" onClick={() => exploreTo("aprUp")}>Compare a higher APR</button>
              <button type="button" className="chip" onClick={() => exploreTo(termLever(sc.term))}>Choose {otherTerm(sc.term)} months</button>
              <button type="button" className="chip" onClick={() => exploreTo("carCheaper")}>Choose a lower purchase price</button>
            </div>
          </section>
          {(() => {
            const last = lastDecision, now = nowDecision;
            const rowsCmp: [string, string, string][] = last ? [
              ["Car price", money(last.price), money(now.price)],
              ["Deposit", money(last.deposit), money(now.deposit)],
              ["APR · term", `${pct(last.apr)} · ${last.term}m`, `${pct(now.apr)} · ${now.term}m`],
              ["Monthly remaining today", money(last.remainingBefore), money(now.remainingBefore)],
              ["Car payment", money(last.monthly, true), money(now.monthly, true)],
              ["Monthly remaining after", money(last.remainingAfter), money(now.remainingAfter)],
              ["Savings", money(last.buffer), money(now.buffer)],
            ] : [];
            const changedSince = last ? decisionChanges(last, now) : [];
            return (
              <details className="how-calc" open={decisions.length > 0}>
                <summary>My car decision · last time vs now</summary>
                <div className="stack" style={{ gap: 10, marginTop: 10 }}>
                  {last ? (<>
                    <div className="table-wrap"><table className="cmp">
                      <thead><tr><th scope="col"></th><th scope="col">Last time ({shortDate(last.savedAt)})</th><th scope="col">Now</th></tr></thead>
                      <tbody>{rowsCmp.map(([k, a, b]) => <tr key={k} className={a !== b ? "priority" : undefined}><th scope="row">{k}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
                    </table></div>
                    {changedSince.length > 0
                      ? <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>{changedSince.map((c) => <li key={c}>{c}</li>)}</ul>
                      : <p className="small">Nothing has changed since you remembered this decision.</p>}
                  </>) : <p className="small">Remember this decision, then come back after anything changes to see last time next to now.</p>}
                  <div className="row" style={{ gap: 12 }}>
                    <button type="button" className="btn btn-light btn-sm" onClick={() => { decisionStore.set([...decisions.slice(-2), { ...now, savedAt: new Date().toISOString() }]); setMsg("Remembered on this device. Come back after updating your situation to compare."); }}>Remember this decision on this device</button>
                    {decisions.length > 0 && <button type="button" className="link small quiet" onClick={() => { if (!window.confirm("Forget the decisions you saved on this device?")) return; decisionStore.set([]); }}>Forget saved decisions</button>}
                  </div>
                  <p className="small muted">Kept only in this browser, never on our servers. Clearing your browser data removes it too.</p>
                </div>
              </details>
            );
          })()}
          <CommitCheck type="loan" m={loanM} risks={risks("loan", loanValues, loanM)} check={understandingCheck("loan", loanValues, loanM)} perLabel="a month" onSave={() => {
            if (saved.length < MAX_SAVED) savedStore.set([...saved, { id: newOptionId(), name: `Car: ${sc.label}`, type: "loan", values: loanValues }]);
          }} />
          <div className="done-grid">
            <button type="button" className="done-card" onClick={() => { if (saved.length >= MAX_SAVED) { setMsg(`Compare holds up to ${MAX_SAVED}.`); return; } savedStore.set([...saved, { id: newOptionId(), name: `Car: ${sc.label}`, type: "loan", values: loanValues }]); setMsg("Added to Compare."); }}><Icon name="compare" /><b>Add to Compare</b><span className="small muted">Line it up with other options</span></button>
            <button type="button" className="done-card" onClick={() => { if (commitments.length >= MAX_COMMITMENTS) { setMsg(`Your commitment map holds up to ${MAX_COMMITMENTS}.`); return; } commitmentsStore.set([...commitments, { id: newOptionId(), name: `Car (${sc.label})`, type: "loan", values: loanValues }]); setMsg("Added to your commitment map."); }}><Icon name="chart" /><b>Add to my commitments</b><span className="small muted">See it next to what you already pay</span></button>
            <Link href="/stress-test" className="done-card"><Icon name="wallet" /><b>Stress test my month</b><span className="small muted">Bills, income and one-off shocks, using what you’ve told us</span></Link>
          </div>
          {msg && <p className="small" role="status">{msg}</p>}
          <button type="button" className="link small quiet" onClick={() => { if (!window.confirm("Start again? This clears your Plan answers on this device. Decisions you chose to remember are kept.")) return; carStore.reset(); journeyStore.reset(); setDoc(null); setLevers([]); setKeptDeposit(null); go(0); }}>Clear my answers and start again</button>
          {nav()}
          <p className="display closing-big">The decision remains yours.</p>
          <p className="lead closing">We’ve shown how the numbers change under the information and assumptions you’ve provided.</p>
        </section>
      )}
    </div>
  );
}
