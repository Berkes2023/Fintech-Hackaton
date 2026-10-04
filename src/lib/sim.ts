import { money } from "./format";
import { NO_CREDIT, type CreditProfile } from "./credit";
import { monthlyRate } from "./finance";

// The car decision simulator. CODE CALCULATES, AI EXPLAINS.
// Three separate ideas, never blended into one score:
//   1. Credit profile: self-reported, only used to pick ILLUSTRATIVE example rates.
//   2. Financial position: income, spending, borrowing, reserves and known future events.
//   3. Decision impact: what a finance scenario does to that position, month by month.

/* ---------- where every number comes from ---------- */

export type Source = "you_told_us" | "document_says" | "we_calculated" | "ai_explained" | "illustrative" | "official_source";
export const SOURCE_LABEL: Record<Source, string> = {
  you_told_us: "You told us",
  document_says: "Document says",
  we_calculated: "We calculated",
  ai_explained: "AI explained",
  illustrative: "Illustrative scenario",
  official_source: "Official source",
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
  if (p.pension.amount > 0 && !p.pension.alreadyDeducted) lines.push({ label: "Personal pension contribution", amount: -r2(p.pension.amount), source: "you_told_us" });
  for (const i of p.otherSaving) if (active(i, m)) lines.push({ label: i.label, amount: -r2(toMonthly(i.amount, i.freq)), source: "you_told_us" });
  const shown = lines.filter((l) => l.amount !== 0);
  return { value: r2(shown.reduce((a, l) => a + l.amount, 0)), lines: shown };
}

export const recurringIncome = (p: Picture, m = 1) => r2(p.income.filter((i) => active(i, m)).reduce((a, i) => a + toMonthly(i.amount, i.freq), 0));
export const debtPayments = (p: Picture, m = 1) => r2(p.debts.filter((d) => active(d, m)).reduce((a, d) => a + toMonthly(d.amount, d.freq), 0));

/* ---------- credit profile: see credit.ts (user-supplied, never calculated, never selects a rate) ---------- */

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
  /** Fictional provider name, for illustrative scenarios. */
  provider?: string;
  /** Plain-English conditions that come with the scenario. */
  conditions?: string[];
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

/**
 * Fictional, illustrative providers with different APRs, terms, fees and conditions. Not real offers and not
 * market data. They don't depend on the person's credit profile: real lenders use their own criteria.
 * Listed by letter, never ranked.
 */
export function illustrativeProviders(p: Purchase): Scenario[] {
  const amount = toFinance(p);
  const mk = (id: string, provider: string, apr: number, term: number, upfrontFee: number, lateFee: number, conditions: string[]): Scenario => ({
    id, label: provider, provider, source: "illustrative", amount, apr, term, upfrontFee, monthlyFee: 0, balloon: 0, startIn: 0, lateFee, conditions,
    fieldSources: { apr: "illustrative", term: "illustrative", upfrontFee: "illustrative", amount: "we_calculated", lateFee: "illustrative" },
  });
  return [
    mk("a", "Provider A (fictional)", 7.9, 48, 295, 25, ["£295 arrangement fee with the first payment", "Hire purchase: the car isn’t yours until the last payment"]),
    mk("b", "Provider B (fictional)", 9.9, 60, 0, 15, ["No arrangement fee", "Early settlement charge of up to 58 days’ interest"]),
    mk("c", "Provider C (fictional)", 12.9, 36, 0, 20, ["Shorter term, higher monthly payment", "Optional GAP insurance offered at extra cost"]),
  ];
}
/** Kept for the simplified wizards and tests: the same fictional providers. */
export const exampleScenarios = (p: Purchase) => illustrativeProviders(p);

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
  /** Each one-off amount in this month, signed. Never repeated in other months. */
  oneOffs: { label: string; amount: number }[];
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
    const oneOffs: { label: string; amount: number }[] = [];
    const notes: string[] = [];
    for (const e of events) {
      if (e.recurrence === "one_off" && e.month === m) {
        if (e.direction === "in") oneOffIn += e.amount; else oneOffOut += e.amount;
        oneOffs.push({ label: e.label, amount: e.direction === "in" ? e.amount : -e.amount });
        notes.push(`${e.label} ${e.direction === "in" ? "+" : "−"}${money(e.amount)} (one-off)`);
      }
      if (e.recurrence !== "one_off" && e.month <= m) {
        const sign = e.recurrence === "recurring_from" ? 1 : -1;
        if (e.direction === "in") recurringIn += sign * e.amount; else recurringOut += sign * e.amount;
        if (e.month === m) notes.push(`${e.label} ${e.recurrence === "recurring_from" ? "starts" : "stops"} (${money(e.amount)} a month)`);
      }
    }
    for (const d of p.debts) if (d.endsIn === m && d.amount > 0) notes.push(`${d.label}: no longer paid`);
    const newPayment = sch ? (sch.payments[m - 1] ?? 0) : 0;
    if (sch && sc && sc.balloon > 0 && m === sc.startIn + sc.term) notes.push(`Final payment ${money(sc.balloon)}`);
    if (sc && sc.upfrontFee > 0 && m === sc.startIn + 1) { oneOffOut += sc.upfrontFee; oneOffs.push({ label: "Arrangement fee", amount: -sc.upfrontFee }); notes.push(`Arrangement fee −${money(sc.upfrontFee)} (one-off)`); }
    if (sch) cost += (sch.interest[m - 1] ?? 0) + (m === sc!.startIn + 1 ? sc!.upfrontFee : 0) + (newPayment > 0 ? sc!.monthlyFee : 0);
    const normalLeft = recurringIn - recurringOut - newPayment;
    const left = normalLeft + oneOffIn - oneOffOut;
    buffer += left;
    rows.push({ m, recurringIn: r2(recurringIn), recurringOut: r2(recurringOut), existingDebt, newPayment: r2(newPayment), normalLeft: r2(normalLeft), oneOffIn, oneOffOut, oneOffs, left: r2(left), buffer: r2(buffer), cumulativeCost: r2(cost), notes });
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

export type Lever = "waitBonus" | "deposit" | "apr12" | "term60" | "rentUp" | "loanEnds" | "salaryUp" | "aprUp" | "aprDown" | "term36" | "incomeDip" | "cutSpending" | "carCheaper" | "waitLoan" | "term48";
export const LEVERS: Record<Lever, string> = {
  waitBonus: "Wait for my bonus and add it to the deposit",
  deposit: "Put another £2,000 down",
  apr12: "APR becomes 12%",
  term60: "Choose 60 months",
  rentUp: "Rent increases",
  loanEnds: "My existing loan ends now",
  salaryUp: "My salary changes",
  aprUp: "The APR is 2 points higher",
  aprDown: "The APR is 2 points lower",
  term36: "Choose 36 months",
  incomeDip: "My income falls 20% for 3 months",
  cutSpending: "I cut a recurring expense by £50",
  carCheaper: "The car costs less",
  waitLoan: "Wait until my existing loan ends",
  term48: "Choose 48 months",
};
/** Amounts for the adjustable what-ifs. A negative salary change is a pay cut. */
export interface LeverAmounts { rent: number; salary: number; /** How much of the first one-off income to put towards the deposit (default: all of it). */ bonus?: number; /** How much cheaper the car is (default £3,000). */ priceCut?: number }

export interface Case { picture: Picture; events: FutureEvent[]; scenario: Scenario }

/** Each what-if is a pure change to the inputs, so the whole simulation recalculates from scratch. */
export function applyLevers(c: Case, levers: Lever[], amounts: LeverAmounts = { rent: 100, salary: 150 }): Case {
  let picture: Picture = { ...c.picture };
  let events = [...c.events];
  let sc: Scenario = { ...c.scenario };
  for (const l of levers) {
    if (l === "waitBonus") {
      const first = events.filter((e) => e.recurrence === "one_off" && e.direction === "in").sort((a, b) => a.month - b.month)[0];
      if (first) {
        const use = Math.max(0, Math.min(first.amount, amounts.bonus ?? first.amount));
        sc = { ...sc, amount: Math.max(0, sc.amount - use), startIn: first.month };
        // Only the part used for the deposit leaves the timeline; any rest still arrives as one-off income.
        events = use >= first.amount ? events.filter((e) => e.id !== first.id) : events.map((e) => (e.id === first.id ? { ...e, amount: e.amount - use } : e));
      }
    }
    if (l === "deposit") sc = { ...sc, amount: Math.max(0, sc.amount - 2000) };
    if (l === "carCheaper") sc = { ...sc, amount: Math.max(0, sc.amount - (amounts.priceCut ?? 3000)) };
    if (l === "term48") sc = { ...sc, term: 48 };
    if (l === "waitLoan") {
      // Start the car payments in the month the first known debt stops, so the two never overlap.
      const end = picture.debts.filter((d) => d.endsIn && d.amount > 0).sort((a, b) => (a.endsIn ?? 0) - (b.endsIn ?? 0))[0];
      if (end?.endsIn) sc = { ...sc, startIn: Math.max(sc.startIn, end.endsIn - 1) };
    }
    if (l === "apr12") sc = { ...sc, apr: 12 };
    if (l === "aprUp") sc = { ...sc, apr: sc.apr + 2 };
    if (l === "aprDown") sc = { ...sc, apr: Math.max(0, sc.apr - 2) };
    if (l === "term36") sc = { ...sc, term: 36 };
    if (l === "term60") sc = { ...sc, term: 60 };
    if (l === "rentUp" && amounts.rent) events = [...events, { id: "w-rent", label: "Rent increase (what if)", amount: Math.abs(amounts.rent), month: 1, direction: "out", recurrence: amounts.rent > 0 ? "recurring_from" : "stops_from" }];
    if (l === "salaryUp" && amounts.salary) events = [...events, { id: "w-pay", label: "Salary change (what if)", amount: Math.abs(amounts.salary), month: 1, direction: "in", recurrence: amounts.salary > 0 ? "recurring_from" : "stops_from" }];
    if (l === "incomeDip") {
      const dip = Math.round(recurringIncome(c.picture) * 0.2);
      events = [...events, { id: "w-dip1", label: "Income dip (what if)", amount: dip, month: 1, direction: "in", recurrence: "stops_from" }, { id: "w-dip2", label: "Income back (what if)", amount: dip, month: 4, direction: "in", recurrence: "recurring_from" }];
    }
    if (l === "loanEnds") {
      const loan = picture.debts.find((d) => d.id === "loan" && d.amount > 0) ?? picture.debts.find((d) => d.amount > 0);
      if (loan) picture = { ...picture, debts: picture.debts.filter((d) => d !== loan) };
    }
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
  /** Field ids the document didn't state (filled from your scenario, clearly labelled). */
  assumed: string[];
  /** Important terms the document contains, with the sentence each came from. */
  terms?: { title: string; quote: string }[];
}

/** The finance scenario being explored. null means "use the worked-out default". */
export interface FinanceInput { amount: number | null; apr: number | null; term: number | null; fee: number }

export type CarGoal = "car" | "home" | "improve" | "purchase" | "borrowing" | "education" | "other";

export interface CarState {
  goal?: CarGoal;
  purchase: Purchase;
  picture: Picture;
  credit: CreditProfile;
  events: FutureEvent[];
  finance: FinanceInput;
  /** Which terms the simulation uses: the person's own scenario or their decoded offer. */
  use: "mine" | "offer";
  /** Optional: how much the person would personally like to keep uncommitted each month. Their benchmark, not ours. */
  preferredBuffer?: number | null;
  /** Whether the deposit comes out of the savings they told us about (default yes). */
  depositFromSavings?: boolean;
  offer?: ActualOffer;
}

const mi = (id: string, label: string, amount = 0, extra: Partial<Item> = {}): Item => ({ id, label, amount, freq: "monthly", origin: "manual", ...extra });
const db = (id: string, label: string, kind: DebtKind, amount = 0): Debt => ({ ...mi(id, label, amount), kind });

/** The fixed questions, by id. Every car journey asks these same fields. */
export function blankPicture(): Picture {
  return {
    income: [mi("salary", "Take-home salary"), mi("other", "Other recurring income")],
    essentials: [mi("rent", "Rent or mortgage"), mi("bills", "Utilities and bills"), mi("food", "Food"), mi("transport", "Transport"), mi("insurance", "Insurance")],
    discretionary: [mi("subs", "Subscriptions"), mi("fun", "Shopping, entertainment and eating out"), mi("otherSpend", "Other regular spending")],
    debts: [db("loan", "Loan repayments", "loan"), db("card", "Credit-card repayments", "card"), db("carfin", "Existing car finance", "car"), db("bnpl", "Buy Now Pay Later", "bnpl"), db("overdraft", "Overdraft or other borrowing", "overdraft")],
    reserves: { savings: 0, emergency: 0 },
    pension: { amount: 0, alreadyDeducted: false, employer: 0 },
    otherSaving: [mi("regular", "Regular savings or investments"), mi("otherCommit", "Other regular commitments")],
  };
}

/** Sets one fixed field's monthly amount. */
export function withAmount<T extends Item>(list: T[], id: string, amount: number): T[] {
  return list.map((i) => (i.id === id ? { ...i, amount, freq: "monthly" as Freq, origin: "manual" as Origin } : i));
}
export const amountOf = (list: Item[], id: string) => list.find((i) => i.id === id)?.amount ?? 0;

/** Starts empty: nothing is assumed about the person. */
export const EMPTY_CAR: CarState = {
  purchase: { price: 0, deposit: 0, saved: 0 },
  picture: blankPicture(),
  credit: NO_CREDIT,
  events: [],
  finance: { amount: null, apr: null, term: null, fee: 0 },
  use: "mine",
};

/** "Use example figures": a realistic example, clearly marked as an example in the UI. */
export function exampleCar(): CarState {
  const p = blankPicture();
  const fill = <T extends Item>(l: T[], v: Record<string, number>) => l.map((i) => (i.id in v ? { ...i, amount: v[i.id], origin: "mock" as Origin } : i));
  return {
    goal: "car",
    purchase: { price: 25000, deposit: 5000, saved: 5000 },
    picture: {
      ...p,
      income: fill(p.income, { salary: 2500 }),
      essentials: fill(p.essentials, { rent: 850, bills: 230, food: 250, transport: 120 }),
      discretionary: fill(p.discretionary, { subs: 40, fun: 210 }),
      debts: fill(p.debts, { loan: 180 }).map((d) => (d.id === "loan" ? { ...d, endsIn: 5 } : d)),
      reserves: { savings: 1500, emergency: 500 },
      pension: { amount: 125, alreadyDeducted: true, employer: 75 },
    },
    credit: { scores: [{ creditProvider: "experian", creditScale: "experian", creditScore: 920, creditBand: "Good", creditSource: "USER_SUPPLIED" }], creditSource: "USER_SUPPLIED" },
    events: [
      { id: "bonus", label: "Bonus", amount: 3000, month: 1, direction: "in", recurrence: "one_off" },
      { id: "rent", label: "Rent increase", amount: 100, month: 6, direction: "out", recurrence: "recurring_from" },
    ],
    finance: { amount: null, apr: null, term: null, fee: 0 },
    use: "mine",
  };
}
export const DEFAULT_CAR = exampleCar();

/** Until the person picks or types terms, the scenario starts from fictional Provider B, labelled as an example. */
export const DEFAULT_TERMS = { apr: 9.9, term: 60 };

/** The one scenario the journey simulates: the decoded offer if chosen, otherwise the person's own scenario. */
export function carScenario(st: CarState): Scenario {
  if (st.use === "offer" && st.offer) return st.offer.scenario;
  const f = st.finance;
  return {
    id: "mine", label: "Your scenario", source: "you_told_us",
    amount: f.amount ?? toFinance(st.purchase), apr: f.apr ?? DEFAULT_TERMS.apr, term: f.term ?? DEFAULT_TERMS.term,
    upfrontFee: f.fee, monthlyFee: 0, balloon: 0, startIn: 0,
    fieldSources: { amount: f.amount === null ? "we_calculated" : "you_told_us", apr: f.apr === null ? "illustrative" : "you_told_us", term: f.term === null ? "illustrative" : "you_told_us", upfrontFee: "you_told_us" },
  };
}

/** How an event is tagged everywhere, e.g. "ONE-OFF INCOME". A one-off is never shown as recurring. */
export function eventTag(e: FutureEvent): string {
  const kind = e.direction === "in" ? "INCOME" : "EXPENSE";
  if (e.recurrence === "one_off") return `ONE-OFF ${kind}`;
  return e.recurrence === "recurring_from" ? `RECURRING ${kind}` : `RECURRING ${kind} STOPS`;
}
/** The signed amount, e.g. "+£3,000" or "−£100 a month". */
export const eventAmount = (e: FutureEvent) => `${e.direction === "in" ? "+" : "−"}${money(e.amount)}${e.recurrence === "one_off" ? "" : " a month"}`;

/** One plain line for a future event, e.g. "£3,000 bonus next month — ONE-OFF INCOME". */
export function eventLine(e: FutureEvent, monthName: (m: number) => string): string {
  const what = e.label.charAt(0).toLowerCase() + e.label.slice(1);
  const when = e.month === 1 ? "next month" : e.recurrence === "one_off" ? `in ${monthName(e.month)}` : `from ${monthName(e.month)}`;
  return `${money(e.amount)}${e.recurrence === "one_off" ? "" : " a month"} ${what} ${when} — ${eventTag(e)}`;
}
