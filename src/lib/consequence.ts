import { money } from "./format";

/** Whole pounds when the amount is whole (“£50”), otherwise pence (“£502.25”). */
export function gbp(x: number): string {
  const v = Math.round(x * 100) / 100;
  return Number.isInteger(v) ? `${v < 0 ? "−" : ""}£${Math.abs(v).toLocaleString("en-GB")}` : money(v, true).replace("-", "−");
}
import {
  debtPayments, position, recurringIncome, schedule, toMonthly,
  type Debt, type FutureEvent, type Item, type Line, type Month, type Picture, type Scenario,
} from "./sim";

// THE CONSEQUENCE ENGINE. CODE CALCULATES, AI EXPLAINS.
// Every important number answers two questions: what is the result, and what could it mean for this person?
// Nothing here labels a result "safe", "unsafe", "affordable" or "unaffordable", and there is no magic threshold.
// The only benchmark is one the person chooses themselves (their preferred monthly buffer).

const r2 = (x: number) => Math.round(x * 100) / 100;
/** Percentages are shown to one decimal place. */
export const pct1 = (x: number) => Math.round(x * 10) / 10;
const sum = (l: Item[]) => l.reduce((a, i) => a + toMonthly(i.amount, i.freq), 0);
const pctStr = (x: number) => `${pct1(x)}%`;
/** “ends” or “end”, to agree with labels like “Loan repayments”. */
const ends = (label: string) => (/s$/i.test(label.trim()) ? "end" : "ends");

/* ---------- 1. your situation today ---------- */

export interface Snapshot {
  income: number;
  essentials: number;
  otherSpending: number;
  debt: number;
  /** Pension (if not already taken from pay), regular saving and other regular commitments. */
  commitments: number;
  /** Estimated monthly remaining: income minus everything above. */
  remaining: number;
  /** Existing borrowing repayments as a share of take-home income; null with no income. */
  debtPct: number | null;
  /** Savings plus emergency fund. */
  buffer: number;
  /** How many months of essential costs the buffer represents; null without essential costs. */
  monthsOfEssentials: number | null;
  /** Every line behind "remaining", for "Why am I seeing this?". */
  lines: Line[];
}

export function snapshot(p: Picture): Snapshot {
  const income = recurringIncome(p);
  const essentials = r2(sum(p.essentials));
  const otherSpending = r2(sum(p.discretionary));
  const debt = debtPayments(p);
  const commitments = r2((p.pension.alreadyDeducted ? 0 : p.pension.amount) + sum(p.otherSaving));
  const pos = position(p);
  const buffer = r2(p.reserves.savings + p.reserves.emergency);
  return {
    income, essentials, otherSpending, debt, commitments, remaining: pos.value,
    debtPct: income > 0 ? pct1((debt / income) * 100) : null,
    buffer,
    monthsOfEssentials: essentials > 0 ? pct1(buffer / essentials) : null,
    lines: pos.lines,
  };
}

/* ---------- 2. what a monthly payment changes ---------- */

export interface PaymentConsequence {
  payment: number;
  before: number;
  after: number;
  change: number;
  /** Payment as a share of take-home income; null with no income. */
  pctOfIncome: number | null;
  /** Payment as a share of what's currently left each month; null when nothing is left. */
  pctOfFlexibility: number | null;
  debtPctBefore: number | null;
  debtPctAfter: number | null;
  /** After minus the buffer the person chose to keep (negative = below it); null if they didn't choose one. */
  bufferGap: number | null;
  sentences: string[];
}

export function paymentConsequence(s: Snapshot, payment: number, preferredBuffer?: number | null): PaymentConsequence {
  const p = r2(Math.max(0, payment));
  const before = r2(s.remaining);
  const after = r2(before - p);
  const pctOfIncome = s.income > 0 ? pct1((p / s.income) * 100) : null;
  const pctOfFlexibility = before > 0 ? pct1((p / before) * 100) : null;
  const debtPctAfter = s.income > 0 ? pct1(((s.debt + p) / s.income) * 100) : null;
  const bufferGap = preferredBuffer !== undefined && preferredBuffer !== null && preferredBuffer >= 0 ? r2(after - preferredBuffer) : null;
  const out: string[] = [];
  if (p > 0) out.push(`This would reduce your estimated monthly remaining from ${gbp(before)} to ${gbp(after)}.`);
  if (pctOfIncome !== null) out.push(`The payment is ${pctStr(pctOfIncome)} of your monthly take-home income.`);
  else out.push("You haven’t told us about any income, so we can’t show the payment as a share of it.");
  if (before <= 0) out.push(`Your regular costs already meet or exceed your regular income, so this payment would add to a monthly shortfall of about ${gbp(-after)}.`);
  else if (p <= before) out.push(`${gbp(p)} of your current ${gbp(before)} monthly flexibility would be committed to this payment: ${pctStr(pctOfFlexibility!)} of what’s currently left each month.`);
  else out.push(`The payment is ${gbp(p - before)} more than the ${gbp(before)} currently left each month, so regular costs would exceed regular income by about that much.`);
  if (bufferGap !== null) {
    out.push(bufferGap < 0
      ? `That’s ${gbp(-bufferGap)} below the ${gbp(preferredBuffer!)} monthly buffer you said you’d like to keep.`
      : `That’s ${gbp(bufferGap)} above the ${gbp(preferredBuffer!)} monthly buffer you said you’d like to keep.`);
  }
  return { payment: p, before, after, change: r2(-p), pctOfIncome, pctOfFlexibility, debtPctBefore: s.debtPct, debtPctAfter, bufferGap, sentences: out };
}

/* ---------- 3. what a deposit does to your savings ---------- */

export interface SavingsConsequence { before: number; deposit: number; after: number; usedPct: number | null; shortfall: number; sentence: string }

export function savingsConsequence(savings: number, deposit: number): SavingsConsequence {
  const before = r2(Math.max(0, savings));
  const d = r2(Math.max(0, deposit));
  const after = r2(Math.max(0, before - d));
  const shortfall = r2(Math.max(0, d - before));
  const usedPct = before > 0 ? pct1((Math.min(d, before) / before) * 100) : null;
  let sentence: string;
  if (d === 0) sentence = "No deposit, so your cash savings stay as they are.";
  else if (before === 0) sentence = `You haven’t told us about any savings, so the ${gbp(d)} deposit would need to come from somewhere else.`;
  else if (shortfall > 0) sentence = `The ${gbp(d)} deposit is ${gbp(shortfall)} more than the ${gbp(before)} of savings you’ve told us about.`;
  else if (after === 0) sentence = `Using ${gbp(d)} as a deposit would leave no cash savings from the amount you’ve told us about.`;
  else sentence = `This uses ${pctStr(usedPct!)} of the cash savings you told us about, leaving ${gbp(after)}.`;
  return { before, deposit: d, after, usedPct, shortfall, sentence };
}

/* ---------- 4. comparing finance scenarios ---------- */

export interface ScenarioRow {
  label: string; apr: number; term: number; amount: number;
  monthly: number; total: number; cost: number;
  remainingAfter: number; pctOfFlexibility: number | null; bufferGap: number | null;
}

export function scenarioRow(s: Snapshot, sc: Scenario, preferredBuffer?: number | null): ScenarioRow {
  const sch = schedule(sc);
  const c = paymentConsequence(s, sch.regular, preferredBuffer);
  return { label: sc.label, apr: sc.apr, term: sc.term, amount: sc.amount, monthly: sch.regular, total: sch.total, cost: sch.cost, remainingAfter: c.after, pctOfFlexibility: c.pctOfFlexibility, bufferGap: c.bufferGap };
}

/** Plain sentences on how B differs from A. Both sides of every trade-off; never which is "better". */
export function compareRows(a: ScenarioRow, b: ScenarioRow): string[] {
  const out: string[] = [];
  const dm = r2(b.monthly - a.monthly), dc = r2(b.cost - a.cost), dt = b.term - a.term;
  if (Math.abs(dm) >= 0.01) out.push(`${b.label} has a ${dm < 0 ? "smaller" : "larger"} monthly payment: ${gbp(b.monthly)} instead of ${gbp(a.monthly)} (${dm < 0 ? "−" : "+"}${gbp(Math.abs(dm))} a month).`);
  if (dt !== 0) out.push(dt > 0 ? `It keeps you committed for ${dt} months longer.` : `It finishes ${-dt} months sooner.`);
  if (Math.abs(dc) >= 1) out.push(dc > 0 ? `It costs ${gbp(Math.round(dc))} more overall in borrowing costs.` : `It costs ${gbp(Math.round(-dc))} less overall in borrowing costs.`);
  if (Math.abs(b.remainingAfter - a.remainingAfter) >= 0.01) out.push(`Your estimated monthly remaining would be ${gbp(b.remainingAfter)} instead of ${gbp(a.remainingAfter)} while you’re paying it.`);
  if (!out.length) out.push("The two scenarios work out the same.");
  return out;
}

const illustrative = (label: string, amount: number, apr: number, term: number): Scenario => ({
  id: label, label, source: "illustrative", amount, apr, term, upfrontFee: 0, monthlyFee: 0, balloon: 0, startIn: 0, fieldSources: {},
});

/** Illustrative rate scenarios: not predicted offers. Credit context never picks the rate. */
export function aprScenarios(s: Snapshot, amount: number, term: number, aprs: number[] = [8, 12, 18], preferredBuffer?: number | null) {
  const rows = aprs.map((apr) => scenarioRow(s, illustrative(`${apr}% APR`, amount, apr, term), preferredBuffer));
  const lo = rows[0], hi = rows[rows.length - 1];
  const note = rows.length > 1
    ? `The ${hi.apr}% scenario would cost approximately ${gbp(Math.round(hi.cost - lo.cost))} more than the ${lo.apr}% scenario over this illustrative ${term}-month term, and ${gbp(hi.monthly - lo.monthly)} more each month.`
    : "";
  return { rows, note };
}

/** The same amount and rate over two terms. */
export function termConsequence(s: Snapshot, amount: number, apr: number, termA: number, termB: number, preferredBuffer?: number | null) {
  const a = scenarioRow(s, illustrative(`${termA} months`, amount, apr, termA), preferredBuffer);
  const b = scenarioRow(s, illustrative(`${termB} months`, amount, apr, termB), preferredBuffer);
  return { a, b, sentences: compareRows(a, b) };
}

/* ---------- 5. deposit trade-off: less borrowing, but less cash now ---------- */

export interface DepositSide { deposit: number; financed: number; monthly: number; cost: number; total: number; savingsAfter: number; remainingAfter: number }

export function depositConsequence(s: Snapshot, price: number, apr: number, term: number, depA: number, depB: number) {
  const side = (dep: number): DepositSide => {
    const financed = Math.max(0, price - dep);
    const sch = schedule(illustrative("x", financed, apr, term));
    return { deposit: dep, financed, monthly: sch.regular, cost: sch.cost, total: sch.total, savingsAfter: savingsConsequence(s.buffer, dep).after, remainingAfter: r2(s.remaining - sch.regular) };
  };
  const a = side(depA), b = side(depB);
  const out: string[] = [];
  const more = depB - depA;
  if (more !== 0) {
    const bigger = more > 0 ? b : a, smaller = more > 0 ? a : b;
    out.push(`A ${gbp(Math.abs(more))} larger deposit reduces the amount financed by ${gbp(Math.abs(more))}, the monthly payment by ${gbp(smaller.monthly - bigger.monthly)} and the borrowing cost by ${gbp(smaller.cost - bigger.cost)}.`);
    out.push(`But it uses ${gbp(Math.abs(more))} more cash now: savings after the deposit would be ${gbp(bigger.savingsAfter)} instead of ${gbp(smaller.savingsAfter)}.`);
  }
  return { a, b, sentences: out };
}

/* ---------- 6. when your situation changes over time ---------- */

export interface ChangePoint { m: number; before: number; after: number; reasons: string[]; sentence: string }

/** Months where the regular monthly remaining changes, with the reasons the person gave us. */
export function changePoints(p: Picture, events: FutureEvent[], sc: Scenario | null, rows: Month[], monthName: (m: number) => string): ChangePoint[] {
  const out: ChangePoint[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], cur = rows[i];
    if (Math.abs(cur.normalLeft - prev.normalLeft) < 0.01) continue;
    const m = cur.m;
    const reasons: string[] = [];
    for (const d of p.debts as Debt[]) if (d.endsIn === m && d.amount > 0) reasons.push(`the ${gbp(toMonthly(d.amount, d.freq))} a month ${d.label.toLowerCase()} you told us about ${ends(d.label)}`);
    for (const e of events) if (e.month === m && e.recurrence !== "one_off") reasons.push(`${e.label.toLowerCase()} (${gbp(e.amount)} a month) ${e.recurrence === "recurring_from" ? "starts" : "stops"}`);
    if (sc && m === sc.startIn + 1 && sc.startIn > 0) reasons.push("the car payments start");
    if (sc && m === sc.startIn + sc.term + 1) reasons.push("the car finance ends");
    const why = reasons.length ? ` because ${reasons.join(" and ")}` : "";
    out.push({ m, before: prev.normalLeft, after: cur.normalLeft, reasons, sentence: `Your situation changes in ${monthName(m)}${why}: estimated monthly remaining goes from ${gbp(prev.normalLeft)} to ${gbp(cur.normalLeft)}.` });
  }
  return out;
}

export interface Moment { when: string; label: string; amount?: string }

/** The key moments of a decision, in order: deposit today, first payment, known events, debts ending, finance ending. */
export function keyMoments(p: Picture, events: FutureEvent[], sc: Scenario, deposit: number, monthName: (m: number) => string): Moment[] {
  const out: { m: number; mo: Moment }[] = [];
  if (deposit > 0) out.push({ m: 0, mo: { when: "Today", label: "Deposit paid", amount: `−${gbp(deposit)}` } });
  const first = sc.startIn + 1;
  out.push({ m: first, mo: { when: monthName(first), label: "First car payment", amount: `−${gbp(schedule(sc).regular)} a month` } });
  for (const e of events) out.push({ m: e.month, mo: { when: monthName(e.month), label: e.recurrence === "one_off" ? `${e.label} (one-off)` : `${e.label} ${e.recurrence === "recurring_from" ? "starts" : "stops"}`, amount: `${e.direction === "in" ? "+" : "−"}${gbp(e.amount)}${e.recurrence === "one_off" ? "" : " a month"}` } });
  for (const d of p.debts) if (d.endsIn && d.amount > 0) out.push({ m: d.endsIn, mo: { when: monthName(d.endsIn), label: `${d.label} ${ends(d.label)}`, amount: `+${gbp(toMonthly(d.amount, d.freq))} a month back` } });
  const last = sc.startIn + sc.term;
  out.push({ m: last + 0.5, mo: { when: monthName(last), label: `Car finance ends after ${sc.term} months` } });
  return out.sort((a, b) => a.m - b.m).map((x) => x.mo);
}

/** Words the consequence engine must never use. */
export const VERDICT_WORDS = /\b(safe|unsafe|affordable|unaffordable|you can afford|you can'?t afford|irresponsible|best option|best deal|you should|don'?t buy|you will be approved)\b/i;
