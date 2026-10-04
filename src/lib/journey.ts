import { snapshot } from "./consequence";
import { monthlyRate, type ProductType, type Values } from "./finance";
import { money } from "./format";
import { toMonthly, type FutureEvent, type Picture } from "./sim";

// The guided wizards: start from someone's goal and real situation (including dated changes a bank can't see),
// show example ways to pay, then simulate their own months. Explains; never ranks or recommends.
// Every rate here is an ILLUSTRATIVE EXAMPLE, and every provider is fictional. The wizard takes no credit answer at
// all (credit context lives in Plan), so no rate can depend on one: real lenders use their own criteria.

export type Goal = "car" | "home" | "improve" | "borrow" | "purchase" | "education" | "invest";
export type ChangeKind = "in_once" | "out_once" | "income_change" | "cost_change" | "commitment_ends";
export type Risk = "cash" | "cautious" | "balanced" | "adventurous";

export interface Change { id: string; kind: ChangeKind; label: string; amount: number; /** Months from now (1 = next month). */ month: number }

export interface Situation {
  goal: Goal;
  price: number;
  deposit: number;
  /** Recurring money, each month. */
  income: number;
  housing: number;
  bills: number;
  commitments: number;
  savings: number;
  savingsRate: number;
  changes: Change[];
  invest: { start: number; monthly: number; years: number; risk: Risk };
}

export const DEFAULT_SITUATION: Situation = {
  goal: "car", price: 20000, deposit: 5000,
  income: 2400, housing: 800, bills: 300, commitments: 250, savings: 3000, savingsRate: 4,
  changes: [
    { id: "c1", kind: "in_once", label: "Work bonus", amount: 3000, month: 1 },
    { id: "c2", kind: "cost_change", label: "Rent goes up", amount: 100, month: 3 },
    { id: "c3", kind: "commitment_ends", label: "Old loan finishes", amount: 150, month: 9 },
  ],
  invest: { start: 1000, monthly: 150, years: 10, risk: "balanced" },
};

export const GOALS: Record<Goal, { label: string; blurb: string; price: string; deposit: string; icon: string }> = {
  car: { label: "Buy a car", blurb: "New or used, dealer or private", price: "Price of the car", deposit: "Deposit or part-exchange", icon: "car" },
  home: { label: "Buy a home", blurb: "A mortgage for your next home", price: "Price of the home", deposit: "Deposit", icon: "household" },
  improve: { label: "Improve my home", blurb: "Kitchen, bathroom, repairs", price: "Cost of the work", deposit: "Savings you’d put in", icon: "tool" },
  borrow: { label: "Borrow money", blurb: "A loan for anything else", price: "Amount you need", deposit: "Savings you’d put in", icon: "loan" },
  purchase: { label: "Make a big purchase", blurb: "Sofa, laptop, phone, holiday", price: "How much it costs", deposit: "Savings you’d put in", icon: "bnpl" },
  education: { label: "Pay for a course", blurb: "Courses, training, qualifications", price: "Course cost", deposit: "Savings you’d put in", icon: "book" },
  invest: { label: "Save or invest", blurb: "See how money could grow", price: "", deposit: "", icon: "chart" },
};

export const CHANGE_KINDS: Record<ChangeKind, { label: string; hint: string; recurring: boolean; sign: 1 | -1 }> = {
  in_once: { label: "Money coming in once", hint: "Bonus, refund, gift, selling something", recurring: false, sign: 1 },
  out_once: { label: "A one-off cost", hint: "Holiday, car repair, Christmas", recurring: false, sign: -1 },
  income_change: { label: "Pay goes up from…", hint: "A pay rise or new job (use a minus for a cut)", recurring: true, sign: 1 },
  cost_change: { label: "A cost goes up from…", hint: "Rent rise, new bill (use a minus if it falls)", recurring: true, sign: -1 },
  commitment_ends: { label: "A payment stops from…", hint: "A loan, contract or subscription finishing", recurring: true, sign: 1 },
};

/**
 * One illustrative example APR per kind of borrowing. Not offers, not market data, and never chosen by credit.
 * The loan figure matches the 9.9% example used across Before You Sign.
 */
export const EXAMPLE_APR = { loan: 9.9, hp: 10.9, pcp: 11.9, card: 24.9, mortgage: 4.6 } as const;
type Kind = keyof typeof EXAMPLE_APR;

const r2 = (x: number) => Math.round(x * 100) / 100;

/**
 * The simplified wizard's money step, filled from the situation entered in Plan, so nobody types it twice.
 * Built on the consequence engine's snapshot: housing is rent or mortgage; bills are every other essential cost
 * plus other regular spending; commitments are debt repayments plus saving and pension; savings are cash savings.
 */
export function situationFromPicture(p: Picture): Pick<Situation, "income" | "housing" | "bills" | "commitments" | "savings"> {
  const s = snapshot(p);
  const rentItem = p.essentials.find((i) => i.id === "rent");
  const housing = rentItem ? r2(toMonthly(rentItem.amount, rentItem.freq)) : 0;
  return {
    income: s.income,
    housing,
    bills: r2(s.essentials - housing + s.otherSpending),
    commitments: r2(s.debt + s.commitments),
    savings: s.buffer,
  };
}

/**
 * The simplified wizard's dated changes, from what the person told Plan: their future events and any debt with a
 * known end. Never the wizard's example changes. A debt with endsIn = m is last paid in month m − 1, and future()
 * stops counting a commitment_ends amount from its month, so the two line up.
 */
export function changesFromPlan(p: Picture, events: FutureEvent[]): Change[] {
  const out: Change[] = events.map((e): Change => {
    const base = { id: e.id, label: e.label, month: e.month };
    if (e.recurrence === "one_off") return { ...base, kind: e.direction === "in" ? "in_once" : "out_once", amount: e.amount };
    const amount = e.recurrence === "recurring_from" ? e.amount : -e.amount;
    return { ...base, kind: e.direction === "in" ? "income_change" : "cost_change", amount };
  });
  for (const d of p.debts) {
    if (d.endsIn && d.amount > 0) out.push({ id: `end-${d.id}`, kind: "commitment_ends", label: `End of ${d.label.toLowerCase()}`, amount: r2(toMonthly(d.amount, d.freq)), month: d.endsIn });
  }
  return out;
}

/* ---------- amortisation with an optional lump-sum overpayment ---------- */

export interface Amortised { payments: number[]; interest: number; total: number }

export function amortise(principal: number, apr: number, months: number, lump?: { month: number; amount: number }): Amortised {
  const r = monthlyRate(apr);
  const n = Math.max(1, Math.round(months));
  const pay = r ? (principal * r) / (1 - Math.pow(1 + r, -n)) : principal / n;
  const payments: number[] = [];
  let bal = principal, interest = 0;
  for (let m = 1; m <= n && bal > 0.005; m++) {
    const int = bal * r;
    interest += int;
    bal += int;
    let p = Math.min(pay, bal);
    if (lump && m === lump.month) p = Math.min(bal, p + lump.amount);
    bal -= p;
    payments.push(p);
  }
  return { payments, interest, total: payments.reduce((a, b) => a + b, 0) };
}

/* ---------- example offers from fictional providers ---------- */

export interface Offer {
  id: string;
  provider: string;
  product: string;
  kind: Kind | "savings" | "bnpl";
  apr: number | null;
  months: number;
  financed: number;
  upfront: number;
  /** Payment in each month, from month 1. */
  schedule: number[];
  regular: number;
  balloon: number;
  total: number;
  extraCost: number;
  extraLabel: string;
  notes: string[];
  checker?: { type: ProductType; values: Values };
}

interface Spec { id: string; provider: string; product: string; kind: Kind; months: number; aprAdd?: number; note?: string }

const SPECS: Record<Exclude<Goal, "invest">, Spec[]> = {
  car: [
    { id: "a", provider: "Provider A", product: "Personal loan", kind: "loan", months: 36 },
    { id: "b", provider: "Provider B", product: "Hire purchase", kind: "hp", months: 48, note: "The car is security: if payments stop, it can be taken back." },
    { id: "c", provider: "Provider C", product: "PCP car finance", kind: "pcp", months: 48 },
    { id: "d", provider: "Provider D", product: "Personal loan", kind: "loan", months: 60, aprAdd: 1 },
  ],
  home: [
    { id: "a", provider: "Provider A", product: "Repayment mortgage", kind: "mortgage", months: 300 },
    { id: "b", provider: "Provider B", product: "Repayment mortgage", kind: "mortgage", months: 360, aprAdd: 0.2 },
    { id: "c", provider: "Provider C", product: "Repayment mortgage", kind: "mortgage", months: 420, aprAdd: 0.35 },
  ],
  improve: [
    { id: "a", provider: "Provider A", product: "Personal loan", kind: "loan", months: 36 },
    { id: "b", provider: "Provider B", product: "Credit card, fixed payments", kind: "card", months: 36, note: "Only if you pay a fixed amount each month and don’t add more spending." },
    { id: "c", provider: "Provider C", product: "Borrow more on your mortgage", kind: "mortgage", months: 180, aprAdd: 0.5, note: "Your home is security, and you’d be paying for 15 years." },
  ],
  borrow: [
    { id: "a", provider: "Provider A", product: "Personal loan", kind: "loan", months: 24 },
    { id: "b", provider: "Provider B", product: "Personal loan", kind: "loan", months: 48, aprAdd: 1.5 },
    { id: "c", provider: "Provider C", product: "Credit card, fixed payments", kind: "card", months: 36, note: "Only if you pay a fixed amount each month and don’t add more spending." },
  ],
  purchase: [
    { id: "a", provider: "Provider A", product: "Personal loan", kind: "loan", months: 24 },
    { id: "b", provider: "Provider B", product: "Store finance", kind: "loan", months: 36, aprAdd: 3 },
    { id: "c", provider: "Provider C", product: "Credit card, fixed payments", kind: "card", months: 24, note: "Only if you pay a fixed amount each month and don’t add more spending." },
  ],
  education: [
    { id: "a", provider: "Provider A", product: "Personal loan", kind: "loan", months: 36 },
    { id: "b", provider: "Provider B", product: "Personal loan", kind: "loan", months: 60, aprAdd: 1 },
    { id: "c", provider: "Provider C", product: "Credit card, fixed payments", kind: "card", months: 24, note: "Only if you pay a fixed amount each month and don’t add more spending." },
  ],
};

export interface OfferTweaks { termShift?: number; startDelay?: number }

function buildOffer(spec: Spec, s: Situation, tw: OfferTweaks = {}): Offer {
  const financed = Math.max(0, s.price - s.deposit);
  const ltvAdd = spec.kind === "mortgage" && s.goal === "home" && s.price > 0 && financed / s.price > 0.9 ? 0.6 : 0;
  const apr = r2(EXAMPLE_APR[spec.kind] + (spec.aprAdd ?? 0) + ltvAdd);
  const months = Math.max(6, spec.months + (tw.termShift ?? 0));
  const delay = Array(tw.startDelay ?? 0).fill(0) as number[];
  const notes = spec.note ? [spec.note] : [];
  if (spec.kind === "mortgage" && s.goal === "home") {
    notes.push(`Loan to value: ${s.price ? Math.round((financed / s.price) * 100) : 0}%. Smaller deposits usually mean higher rates.`);
    if (s.price && financed / s.price > 0.95) notes.push("Most lenders need a deposit of at least 5%.");
  }
  if (spec.kind === "loan" && financed > 25000) notes.push("Most personal loans go up to about £25,000.");

  if (spec.kind === "pcp") {
    const r = monthlyRate(apr);
    const balloon = r2(s.price * Math.max(0.25, 0.55 - 0.05 * (months / 12)));
    const pay = Math.max(0, r ? ((financed - balloon / Math.pow(1 + r, months)) * r) / (1 - Math.pow(1 + r, -months)) : (financed - balloon) / months);
    return {
      id: spec.id, provider: spec.provider, product: spec.product, kind: spec.kind, apr, months, financed, upfront: s.deposit,
      schedule: [...delay, ...Array(months).fill(pay)], regular: r2(pay), balloon,
      total: r2(s.deposit + pay * months + balloon), extraCost: r2(pay * months + balloon - financed), extraLabel: "Interest and charges",
      notes: [...notes, `Final payment to keep the car: about ${money(balloon)}. Or hand it back (mileage and condition charges may apply).`],
    };
  }

  const a = amortise(financed, apr, months);
  return {
    id: spec.id, provider: spec.provider, product: spec.product, kind: spec.kind, apr, months, financed, upfront: s.deposit,
    schedule: [...delay, ...a.payments], regular: r2(a.payments[0] ?? 0), balloon: 0,
    total: r2(s.deposit + a.total), extraCost: r2(a.total - financed), extraLabel: "Interest", notes,
    checker: { type: "loan", values: { amount: Math.round(financed), apr, term: months, fee: 0, lateFee: 15 } },
  };
}

/** Example offers for the goal. Listed by provider letter, never by "best". */
export function offers(s: Situation, tw: OfferTweaks = {}): Offer[] {
  if (s.goal === "invest") return [];
  const financed = Math.max(0, s.price - s.deposit);
  const out: Offer[] = [];
  if (s.goal !== "home" && s.price > 0 && s.savings >= s.price) {
    out.push({
      id: "savings", provider: "Your savings", product: "Pay from savings", kind: "savings", apr: null, months: 0, financed: 0, upfront: s.price,
      schedule: [], regular: 0, balloon: 0, total: s.price, extraCost: r2(s.price * (s.savingsRate / 100)), extraLabel: "Savings interest given up (a year)",
      notes: [`You’d have ${money(s.savings - s.price)} left in savings.`],
    });
  }
  if (financed <= 0) return out;
  out.push(...SPECS[s.goal].map((spec) => buildOffer(spec, s, tw)));
  if (s.goal === "purchase" && financed <= 2000) {
    const each = r2(financed / 3);
    out.push({
      id: "bnpl", provider: "Provider E", product: "Pay in 3", kind: "bnpl", apr: 0, months: 3, financed, upfront: s.deposit,
      schedule: [each, each, each], regular: each, balloon: 0, total: r2(s.deposit + financed), extraCost: 0, extraLabel: "Interest",
      notes: ["Free only if every payment is on time. Missed payments can be reported."],
    });
  }
  return out;
}

/* ---------- the person's future months ---------- */

export interface FutureMonth {
  m: number;
  recurringIn: number;
  recurringOut: number;
  payment: number;
  oneOffIn: number;
  oneOffOut: number;
  /** What a normal month leaves: recurring money only. */
  normalLeft: number;
  /** Including one-off money that month. */
  left: number;
  notes: string[];
}

/** Month-by-month money with a new monthly payment, keeping recurring and one-off money apart. */
export function future(s: Situation, schedule: number[], horizon = 24, finalPayment?: { month: number; amount: number }): FutureMonth[] {
  const savingsInterest = (Math.max(0, s.savings) * s.savingsRate) / 100 / 12;
  const rows: FutureMonth[] = [];
  for (let m = 1; m <= horizon; m++) {
    let recurringIn = s.income + savingsInterest;
    let recurringOut = s.housing + s.bills + s.commitments;
    let oneOffIn = 0, oneOffOut = 0;
    const notes: string[] = [];
    for (const c of s.changes) {
      if (c.kind === "in_once" && c.month === m) { oneOffIn += c.amount; notes.push(`${c.label} +${money(c.amount)}`); }
      if (c.kind === "out_once" && c.month === m) { oneOffOut += c.amount; notes.push(`${c.label} −${money(c.amount)}`); }
      if (c.month <= m) {
        if (c.kind === "income_change") recurringIn += c.amount;
        if (c.kind === "cost_change") recurringOut += c.amount;
        if (c.kind === "commitment_ends") recurringOut -= c.amount;
      }
      if (c.month === m && CHANGE_KINDS[c.kind].recurring) notes.push(`${c.label} from now`);
    }
    const payment = (schedule[m - 1] ?? 0);
    if (finalPayment && finalPayment.month === m) { oneOffOut += finalPayment.amount; notes.push(`Final payment −${money(finalPayment.amount)} (optional)`); }
    const normalLeft = recurringIn - recurringOut - payment;
    rows.push({ m, recurringIn: r2(recurringIn), recurringOut: r2(recurringOut), payment: r2(payment), oneOffIn, oneOffOut, normalLeft: r2(normalLeft), left: r2(normalLeft + oneOffIn - oneOffOut), notes });
  }
  return rows;
}

export interface FutureSummary { typicalNormal: number; tightest: FutureMonth; short: number; boosted: FutureMonth[] }

/** The facts that matter: what a normal month leaves, the tightest month, and months flattered by one-off money. */
export function summarise(rows: FutureMonth[]): FutureSummary {
  const sorted = [...rows.map((r) => r.normalLeft)].sort((a, b) => a - b);
  return {
    typicalNormal: sorted[Math.floor(sorted.length / 2)],
    tightest: rows.reduce((a, b) => (b.left < a.left ? b : a), rows[0]),
    short: rows.filter((r) => r.left < 0).length,
    boosted: rows.filter((r) => r.oneOffIn > 0 && r.oneOffIn > Math.abs(r.normalLeft) * 0.5),
  };
}

/* ---------- what if ---------- */

export type Lever = "deposit" | "waitBonus" | "shorter" | "longer" | "rent" | "income" | "card";
export const LEVERS: Record<Lever, string> = {
  deposit: "Put £2,000 more down",
  waitBonus: "Wait for my one-off money and put it down",
  shorter: "12 months shorter",
  longer: "12 months longer",
  rent: "My housing costs rise £150",
  income: "My income drops 10%",
  card: "I add a £200 a month card repayment",
};

/** Applies the chosen what-ifs to the situation and to how the offer is shaped. */
export function applyLevers(s: Situation, levers: Lever[]): { s: Situation; tw: OfferTweaks } {
  let next: Situation = { ...s, changes: [...s.changes] };
  const tw: OfferTweaks = {};
  if (levers.includes("deposit")) next.deposit += 2000;
  if (levers.includes("waitBonus")) {
    const first = s.changes.filter((c) => c.kind === "in_once").sort((a, b) => a.month - b.month)[0];
    if (first) {
      next.deposit += first.amount;
      next.changes = next.changes.filter((c) => c.id !== first.id);
      tw.startDelay = first.month;
    }
  }
  if (levers.includes("shorter")) tw.termShift = -12;
  if (levers.includes("longer")) tw.termShift = (tw.termShift ?? 0) + 12;
  if (levers.includes("rent")) next = { ...next, housing: next.housing + 150 };
  if (levers.includes("income")) next = { ...next, income: Math.round(next.income * 0.9) };
  if (levers.includes("card")) next = { ...next, commitments: next.commitments + 200 };
  return { s: next, tw };
}

/* ---------- save or invest (illustration only) ---------- */

/** Illustrative yearly growth ranges after fees. Not predictions. Investments can fall as well as rise. */
export const RISK: Record<Risk, { label: string; blurb: string; low: number; mid: number; high: number }> = {
  cash: { label: "Cash savings", blurb: "Your money doesn’t go down, but inflation can eat into it.", low: 3, mid: 3.5, high: 4 },
  cautious: { label: "Cautious investing", blurb: "Mostly bonds. Smaller ups and downs.", low: 0.5, mid: 3.5, high: 5.5 },
  balanced: { label: "Balanced investing", blurb: "A mix of shares and bonds.", low: -0.5, mid: 4.5, high: 7.5 },
  adventurous: { label: "Adventurous investing", blurb: "Mostly shares. Bigger ups and downs.", low: -2, mid: 5.5, high: 9.5 },
};

export interface GrowthPoint { year: number; paidIn: number; low: number; mid: number; high: number }

export function growth(start: number, monthly: number, years: number, risk: Risk): GrowthPoint[] {
  const rates = RISK[risk];
  const run = (annual: number) => {
    const r = Math.pow(1 + annual / 100, 1 / 12) - 1;
    const pts: number[] = [start];
    let v = start;
    for (let m = 1; m <= years * 12; m++) { v = v * (1 + r) + monthly; if (m % 12 === 0) pts.push(v); }
    return pts;
  };
  const low = run(rates.low), mid = run(rates.mid), high = run(rates.high);
  return Array.from({ length: years + 1 }, (_, y) => ({ year: y, paidIn: r2(start + monthly * 12 * y), low: r2(low[y]), mid: r2(mid[y]), high: r2(high[y]) }));
}
