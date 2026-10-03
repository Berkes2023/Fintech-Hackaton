import { money } from "./format";
import { monthlyRate } from "./finance";

// The car decision simulator. CODE CALCULATES, AI EXPLAINS.
// Three separate ideas, never blended into one score:
//   1. Credit profile: self-reported, only used to pick ILLUSTRATIVE example rates.
//   2. Financial position: income, spending, borrowing, reserves and known future events.
//   3. Decision impact: what a finance scenario does to that position, month by month.

/* ---------- where every number comes from ---------- */

export type Source = "you_told_us" | "document_says" | "we_calculated" | "ai_explained" | "illustrative";
export const SOURCE_LABEL: Record<Source, string> = {
  you_told_us: "You told us",
  document_says: "Document says",
  we_calculated: "We calculated",
  ai_explained: "AI explained",
  illustrative: "Example only",
};
/** Where an input came from. Open Banking and credit agencies are future sources; the prototype uses manual and mock data. */
export type Origin = "manual" | "mock" | "open_banking" | "credit_agency";

/* ---------- the financial picture ---------- */

export type Freq = "weekly" | "monthly" | "yearly";
export interface Item { id: string; label: string; amount: number; freq: Freq; origin: Origin; /** Months from now when it stops (it applies in earlier months only). */ endsIn?: number }
export type DebtKind = "loan" | "car" | "card" | "overdraft" | "bnpl" | "other";
export interface Debt extends Item { kind: DebtKind }

export interface Picture {
  income: Item[];
  essentials: Item[];
  discretionary: Item[];
  debts: Debt[];
  reserves: { savings: number; emergency: number };
  /** UK workplace pensions are usually taken before take-home pay; only count it if it isn't. */
  pension: { amount: number; alreadyDeducted: boolean; /** Shown for information only: it isn’t money you pay from your month. */ employer?: number };
  otherSaving: Item[];
}

export const toMonthly = (amount: number, freq: Freq) => (freq === "weekly" ? (amount * 52) / 12 : freq === "yearly" ? amount / 12 : amount);
const active = (i: Item, m: number) => i.endsIn === undefined || m < i.endsIn;
const r2 = (x: number) => Math.round(x * 100) / 100;

export interface Line { label: string; amount: number; source: Source; note?: string }
export interface Explained { value: number; lines: Line[] }

/** Recurring monthly position today, with every line shown. One-off money is never part of it. */
export function position(p: Picture, m = 1): Explained {
  const lines: Line[] = [];
  for (const i of p.income) if (active(i, m)) lines.push({ label: i.label, amount: r2(toMonthly(i.amount, i.freq)), source: "you_told_us" });
  for (const i of p.essentials) if (active(i, m)) lines.push({ label: i.label, amount: -r2(toMonthly(i.amount, i.freq)), source: "you_told_us" });
  for (const i of p.discretionary) if (active(i, m)) lines.push({ label: i.label, amount: -r2(toMonthly(i.amount, i.freq)), source: "you_told_us" });
  for (const d of p.debts) if (active(d, m)) lines.push({ label: d.label, amount: -r2(toMonthly(d.amount, d.freq)), source: "you_told_us", note: d.endsIn ? `ends in month ${d.endsIn}` : undefined });
  if (p.pension.amount > 0 && !p.pension.alreadyDeducted) lines.push({ label: "Pension contribution", amount: -r2(p.pension.amount), source: "you_told_us" });
  for (const i of p.otherSaving) if (active(i, m)) lines.push({ label: i.label, amount: -r2(toMonthly(i.amount, i.freq)), source: "you_told_us" });
  return { value: r2(lines.reduce((a, l) => a + l.amount, 0)), lines };
}

export const recurringIncome = (p: Picture, m = 1) => r2(p.income.filter((i) => active(i, m)).reduce((a, i) => a + toMonthly(i.amount, i.freq), 0));
export const debtPayments = (p: Picture, m = 1) => r2(p.debts.filter((d) => active(d, m)).reduce((a, d) => a + toMonthly(d.amount, d.freq), 0));

/* ---------- credit profile (self-reported, never calculated) ---------- */

export type Band = "excellent" | "good" | "fair" | "needs_work";
export type ScoreSource = "experian" | "equifax" | "transunion" | "other";
export interface CreditProfile { mode: "score" | "band" | "unknown"; score?: { value: number; source: ScoreSource }; band?: Band }

export const BAND_LABEL: Record<Band, string> = { excellent: "Excellent", good: "Good", fair: "Fair", needs_work: "Needs work" };
export const SCORE_SOURCE: Record<ScoreSource, string> = { experian: "Experian", equifax: "Equifax", transunion: "TransUnion", other: "Another provider" };

/** Illustrative example car-finance APRs by self-reported profile. Not offers and not market data. */
export const EXAMPLE_APR: Record<Band, number> = { excellent: 6.9, good: 8.9, fair: 13.9, needs_work: 22.9 };

/**
 * Which example rates to show. A numeric score is deliberately NOT converted into a band: scores from different
 * agencies use different scales and methods, and there's no documented mapping. Only a chosen band selects rates.
 */
export function exampleBand(c: CreditProfile): { band: Band | null; note: string } {
  if (c.mode === "band" && c.band) return { band: c.band, note: `Because you said “${BAND_LABEL[c.band]}”, the examples use rates of about ${EXAMPLE_APR[c.band]}% APR.` };
  if (c.mode === "score" && c.score) return { band: null, note: `You told us ${c.score.value} (${SCORE_SOURCE[c.score.source]}). We don’t convert scores between agencies, so the examples show the full range of rates.` };
  return { band: null, note: "You don’t know your credit profile, so the examples show the full range of rates." };
}

/* ---------- future events ("what your bank doesn't know yet") ---------- */

export type Recurrence = "one_off" | "recurring_from" | "stops_from";
export interface FutureEvent { id: string; label: string; amount: number; /** Months from now (1 = next month). */ month: number; direction: "in" | "out"; recurrence: Recurrence }

/* ---------- the purchase and finance scenarios ---------- */

export interface Purchase { price: number; deposit: number; saved: number; preferredTerm?: number }
export const toFinance = (p: Purchase) => Math.max(0, p.price - p.deposit);

export interface Scenario {
  id: string;
  label: string;
  source: "illustrative" | "document" | "you_told_us";
  amount: number;
  apr: number;
  term: number;
  upfrontFee: number;
  monthlyFee: number;
  /** Optional final payment (e.g. PCP). */
  balloon: number;
  /** First payment delayed by this many months. */
  startIn: number;
  fieldSources: Partial<Record<"amount" | "apr" | "term" | "upfrontFee" | "monthlyFee" | "lateFee", Source>>;
  lateFee?: number;
}

export interface Schedule { payments: number[]; interest: number[]; regular: number; total: number; totalInterest: number; fees: number; cost: number }

/** Payments month by month (index 0 = month 1), including fees, any balloon and any delayed start. */
export function schedule(s: Scenario): Schedule {
  const r = monthlyRate(s.apr);
  const n = Math.max(1, Math.round(s.term));
  const pv = s.amount - (s.balloon > 0 ? s.balloon / Math.pow(1 + r, n) : 0);
  const pay = r ? (pv * r) / (1 - Math.pow(1 + r, -n)) : pv / n;
  const payments: number[] = Array(s.startIn).fill(0);
  const interest: number[] = Array(s.startIn).fill(0);
  let bal = s.amount;
  for (let i = 1; i <= n && bal > 0.005; i++) {
    const int = bal * r;
    bal += int;
    let p = Math.min(pay, bal);
    if (i === n) p = bal; // final payment clears everything, including any balloon
    bal -= p;
    payments.push(p + s.monthlyFee);
    interest.push(int);
  }
  const totalInterest = interest.reduce((a, b) => a + b, 0);
  const fees = s.upfrontFee + s.monthlyFee * n;
  // The upfront fee is paid once, so it is kept out of the monthly payments and added to the total.
  const total = payments.reduce((a, b) => a + b, 0) + s.upfrontFee;
  return { payments, interest, regular: r2(pay + s.monthlyFee), total: r2(total), totalInterest: r2(totalInterest), fees: r2(fees), cost: r2(totalInterest + fees) };
}

/** Example scenarios with different rates, terms and fees. Listed by letter, never ranked. */
export function exampleScenarios(p: Purchase, c: CreditProfile): Scenario[] {
  const amount = toFinance(p);
  const { band } = exampleBand(c);
  const base = band ? EXAMPLE_APR[band] : null;
  const mk = (id: string, label: string, apr: number, term: number, upfrontFee = 0): Scenario => ({
    id, label, source: "illustrative", amount, apr, term, upfrontFee, monthlyFee: 0, balloon: 0, startIn: 0,
    fieldSources: { apr: "illustrative", term: "illustrative", upfrontFee: "illustrative", amount: "we_calculated" }, lateFee: 15,
  });
  if (base === null) {
    // Unknown profile: show the spread of rates rather than guessing one.
    return [mk("a", "Example A", EXAMPLE_APR.excellent, 48), mk("b", "Example B", EXAMPLE_APR.good, 48), mk("c", "Example C", EXAMPLE_APR.fair, 48), mk("d", "Example D", EXAMPLE_APR.needs_work, 48)];
  }
  const term = p.preferredTerm && p.preferredTerm >= 12 ? p.preferredTerm : 48;
  return [mk("a", "Example A", base, 36), mk("b", "Example B", base + 0.5, term, 199), mk("c", "Example C", base + 1.5, 60)];
}

/* ---------- the timeline ---------- */

export interface Month {
  m: number;
  recurringIn: number;
  recurringOut: number;
  existingDebt: number;
  newPayment: number;
  /** Recurring money only: what a normal month leaves. */
  normalLeft: number;
  oneOffIn: number;
  oneOffOut: number;
  left: number;
  buffer: number;
  cumulativeCost: number;
  notes: string[];
}

/** Simulates month by month under the assumptions entered. Never a prediction. */
export function simulateMonths(p: Picture, events: FutureEvent[], sc: Scenario | null, horizon: number): Month[] {
  const sch = sc ? schedule(sc) : null;
  let buffer = p.reserves.savings + p.reserves.emergency;
  let cost = 0;
  const rows: Month[] = [];
  for (let m = 1; m <= horizon; m++) {
    const pos = position(p, m);
    let recurringIn = recurringIncome(p, m);
    let recurringOut = r2(recurringIn - pos.value);
    const existingDebt = debtPayments(p, m);
    let oneOffIn = 0, oneOffOut = 0;
    const notes: string[] = [];
    for (const e of events) {
      if (e.recurrence === "one_off" && e.month === m) {
        if (e.direction === "in") oneOffIn += e.amount; else oneOffOut += e.amount;
        notes.push(`${e.label} ${e.direction === "in" ? "+" : "−"}${money(e.amount)} (one-off)`);
      }
      if (e.recurrence !== "one_off" && e.month <= m) {
        const sign = e.recurrence === "recurring_from" ? 1 : -1;
        if (e.direction === "in") recurringIn += sign * e.amount; else recurringOut += sign * e.amount;
        if (e.month === m) notes.push(`${e.label} ${e.recurrence === "recurring_from" ? "starts" : "stops"} (${money(e.amount)} a month)`);
      }
    }
    for (const d of p.debts) if (d.endsIn === m) notes.push(`${d.label} finishes`);
    const newPayment = sch ? (sch.payments[m - 1] ?? 0) : 0;
    if (sch && sc && sc.balloon > 0 && m === sc.startIn + sc.term) notes.push(`Final payment ${money(sc.balloon)}`);
    if (sc && sc.upfrontFee > 0 && m === sc.startIn + 1) { oneOffOut += sc.upfrontFee; notes.push(`Arrangement fee −${money(sc.upfrontFee)} (one-off)`); }
    if (sch) cost += (sch.interest[m - 1] ?? 0) + (m === sc!.startIn + 1 ? sc!.upfrontFee : 0) + (newPayment > 0 ? sc!.monthlyFee : 0);
    const normalLeft = recurringIn - recurringOut - newPayment;
    const left = normalLeft + oneOffIn - oneOffOut;
    buffer += left;
    rows.push({ m, recurringIn: r2(recurringIn), recurringOut: r2(recurringOut), existingDebt, newPayment: r2(newPayment), normalLeft: r2(normalLeft), oneOffIn, oneOffOut, left: r2(left), buffer: r2(buffer), cumulativeCost: r2(cost), notes });
  }
  return rows;
}

/* ---------- monthly impact ---------- */

export interface Impact {
  before: Explained;
  payment: number;
  after: number;
  change: number;
  pctOfIncome: number;
  existingDebt: number;
  totalCommitments: number;
  bufferNow: number;
}

export function impact(p: Picture, sc: Scenario): Impact {
  const before = position(p);
  const sch = schedule(sc);
  const income = recurringIncome(p);
  const existingDebt = debtPayments(p);
  return {
    before, payment: sch.regular, after: r2(before.value - sch.regular), change: -sch.regular,
    pctOfIncome: income > 0 ? r2((sch.regular / income) * 100) : 0,
    existingDebt, totalCommitments: r2(existingDebt + sch.regular), bufferNow: p.reserves.savings + p.reserves.emergency,
  };
}

/* ---------- hidden cost: contract, cash flow, cumulative ---------- */

export interface HiddenCost {
  contract: { interest: number; fees: number; lateFee: number; totalCost: number; totalRepaid: number; apr: number };
  cashflow: { monthlyReduction: number; pctOfIncome: number; bufferAfter12: number; bufferAfter12Without: number };
  cumulative: { at12: number; at24: number; atTerm: number; existingAt12: number };
}

export function hiddenCost(p: Picture, events: FutureEvent[], sc: Scenario): HiddenCost {
  const sch = schedule(sc);
  const withCar = simulateMonths(p, events, sc, 12);
  const without = simulateMonths(p, events, null, 12);
  const sumTo = (k: number) => r2(sch.payments.slice(0, k).reduce((a, b) => a + b, 0) + (k > sc.startIn ? sc.upfrontFee : 0));
  return {
    contract: { interest: sch.totalInterest, fees: sch.fees, lateFee: sc.lateFee ?? 0, totalCost: sch.cost, totalRepaid: sch.total, apr: sc.apr },
    cashflow: { monthlyReduction: sch.regular, pctOfIncome: impact(p, sc).pctOfIncome, bufferAfter12: withCar[11].buffer, bufferAfter12Without: without[11].buffer },
    cumulative: { at12: sumTo(12), at24: sumTo(24), atTerm: sch.total, existingAt12: r2(withCar.reduce((a, r) => a + r.existingDebt, 0)) },
  };
}

/* ---------- repeated spending ---------- */

export function habit(amount: number, timesPerWeek: number) {
  const week = amount * timesPerWeek;
  return { week: r2(week), month: r2((week * 52) / 12), year: r2(week * 52) };
}

/* ---------- what if ---------- */

export type Lever = "waitBonus" | "deposit" | "aprUp" | "aprDown" | "term36" | "term60" | "rentUp" | "salaryUp" | "incomeDip" | "loanEnds" | "cutSpending";
export const LEVERS: Record<Lever, string> = {
  waitBonus: "Wait for my one-off money and add it to the deposit",
  deposit: "Put £2,000 more down",
  aprUp: "The APR is 2 points higher",
  aprDown: "The APR is 2 points lower",
  term36: "Choose 36 months",
  term60: "Choose 60 months",
  rentUp: "Rent goes up £100",
  salaryUp: "My pay goes up £150",
  incomeDip: "My income falls 20% for 3 months",
  loanEnds: "An existing loan ends now",
  cutSpending: "I cut a recurring expense by £50",
};

export interface Case { picture: Picture; events: FutureEvent[]; scenario: Scenario }

/** Each what-if is a pure change to the inputs, so the whole simulation recalculates from scratch. */
export function applyLevers(c: Case, levers: Lever[]): Case {
  let picture: Picture = { ...c.picture };
  let events = [...c.events];
  let sc: Scenario = { ...c.scenario };
  for (const l of levers) {
    if (l === "waitBonus") {
      const first = events.filter((e) => e.recurrence === "one_off" && e.direction === "in").sort((a, b) => a.month - b.month)[0];
      if (first) { sc = { ...sc, amount: Math.max(0, sc.amount - first.amount), startIn: first.month }; events = events.filter((e) => e.id !== first.id); }
    }
    if (l === "deposit") sc = { ...sc, amount: Math.max(0, sc.amount - 2000) };
    if (l === "aprUp") sc = { ...sc, apr: sc.apr + 2 };
    if (l === "aprDown") sc = { ...sc, apr: Math.max(0, sc.apr - 2) };
    if (l === "term36") sc = { ...sc, term: 36 };
    if (l === "term60") sc = { ...sc, term: 60 };
    if (l === "rentUp") events = [...events, { id: "w-rent", label: "Rent rise (what if)", amount: 100, month: 1, direction: "out", recurrence: "recurring_from" }];
    if (l === "salaryUp") events = [...events, { id: "w-pay", label: "Pay rise (what if)", amount: 150, month: 1, direction: "in", recurrence: "recurring_from" }];
    if (l === "incomeDip") {
      const dip = Math.round(recurringIncome(c.picture) * 0.2);
      events = [...events, { id: "w-dip1", label: "Income dip (what if)", amount: dip, month: 1, direction: "in", recurrence: "stops_from" }, { id: "w-dip2", label: "Income back (what if)", amount: dip, month: 4, direction: "in", recurrence: "recurring_from" }];
    }
    if (l === "loanEnds" && picture.debts.length) picture = { ...picture, debts: picture.debts.slice(1) };
    if (l === "cutSpending") events = [...events, { id: "w-cut", label: "Cut spending (what if)", amount: 50, month: 1, direction: "out", recurrence: "stops_from" }];
  }
  return { picture, events, scenario: sc };
}

/* ---------- careful wording ---------- */

/** Plain statements about a simulation. Always conditional; never a prediction or a verdict. */
export function statements(rows: Month[], bufferStart: number, monthName: (m: number) => string): string[] {
  const out: string[] = [];
  const firstShort = rows.find((r) => r.normalLeft < 0);
  if (firstShort) out.push(`Under the assumptions you’ve entered, regular costs exceed regular income by about ${money(-firstShort.normalLeft)} a month from ${monthName(firstShort.m)}.`);
  const zero = rows.find((r) => r.buffer <= 0);
  if (zero && bufferStart > 0) out.push(`If these assumptions stayed the same, your ${money(bufferStart)} cash buffer would reach about £0 around ${monthName(zero.m)}.`);
  const boosted = rows.filter((r) => r.oneOffIn > 0);
  for (const b of boosted.slice(0, 2)) out.push(`${monthName(b.m)} looks stronger because of one-off money (${money(b.oneOffIn)}). It isn’t counted as regular income.`);
  if (!firstShort && !zero) out.push("Under the assumptions you’ve entered, regular income covers regular costs and the new payment in every month shown.");
  return out;
}

export const BANNED = /bankrupt|you can afford|you can'?t afford|best option|best deal|you should|don'?t buy|buy it/i;

/* ---------- the saved car journey ---------- */

export interface ActualOffer {
  scenario: Scenario;
  /** Field ids the document didn't state (filled from the example, clearly labelled). */
  assumed: string[];
}

export interface CarState {
  purchase: Purchase;
  picture: Picture;
  credit: CreditProfile;
  events: FutureEvent[];
  /** Edits the person made to the example scenarios, by id. */
  edits: Record<string, Partial<Pick<Scenario, "apr" | "term" | "upfrontFee">>>;
  chosen: string;
  offer?: ActualOffer;
}

const mi = (id: string, label: string, amount: number, extra: Partial<Item> = {}): Item => ({ id, label, amount, freq: "monthly", origin: "mock", ...extra });

/** A realistic example to start from, clearly marked as an example in the UI. */
export const DEFAULT_CAR: CarState = {
  purchase: { price: 25000, deposit: 5000, saved: 5000, preferredTerm: 48 },
  picture: {
    income: [mi("salary", "Take-home salary", 2500)],
    essentials: [mi("rent", "Rent", 850), mi("bills", "Utilities and council tax", 230), mi("food", "Food", 250), mi("transport", "Transport", 120)],
    discretionary: [mi("subs", "Subscriptions", 40), mi("out", "Eating out and takeaways", 140), mi("shop", "Shopping", 70)],
    debts: [{ ...mi("loan", "Existing loan", 180, { endsIn: 5 }), kind: "loan" }],
    reserves: { savings: 1500, emergency: 500 },
    pension: { amount: 125, alreadyDeducted: true, employer: 75 },
    otherSaving: [],
  },
  credit: { mode: "band", band: "good" },
  events: [
    { id: "bonus", label: "Work bonus", amount: 3000, month: 1, direction: "in", recurrence: "one_off" },
    { id: "rent", label: "Rent goes up", amount: 100, month: 6, direction: "out", recurrence: "recurring_from" },
  ],
  edits: {},
  chosen: "b",
};

/** The scenarios on screen: examples (with the person's edits) plus their actual offer if they decoded one. */
export function carScenarios(st: CarState): Scenario[] {
  const ex = exampleScenarios(st.purchase, st.credit).map((s) => ({ ...s, ...st.edits[s.id] }));
  return st.offer ? [...ex, st.offer.scenario] : ex;
}
