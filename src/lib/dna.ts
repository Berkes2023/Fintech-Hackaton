import { money } from "./format";
import { monthlyRate, PRODUCTS, simulate, type Metrics, type ProductType, type Values } from "./finance";

// Product DNA: one machine-readable shape for any commitment, so differently worded contracts can be compared.

export interface ProductDNA {
  schema: "before-you-sign/product-dna@1";
  product: ProductType;
  principal: number | null;
  regular_payment: number;
  frequency: "monthly" | "fortnightly";
  term_months: number | null;
  rate: { measure: "APR" | "EAR" | null; value: number | null; kind: "fixed" | "variable" | "not stated" };
  fees: { upfront: number; annual: number; monthly: number; late: number; exit: number };
  total_payable: number | null;
  cost_above_price: number | null;
  early_repayment: "allowed" | "allowed, charge may apply" | "not stated" | "not applicable";
  auto_renews: boolean | null;
  estimated_fields: string[];
}

const n = (x: unknown) => { const v = Number(x); return Number.isFinite(v) ? v : 0; };
const r2 = (x: number) => Math.round(x * 100) / 100;

/** `conditionKinds` are the kinds the scanner found in a document (e.g. "variable_rate"). */
export function productDNA(type: ProductType, v: Values, m: Metrics, conditionKinds: string[] = [], estimated: string[] = []): ProductDNA {
  const credit = PRODUCTS[type].credit;
  const has = (k: string) => conditionKinds.includes(k);
  const measure = type === "overdraft" ? "EAR" : type === "subscription" || type === "household" ? null : "APR";
  return {
    schema: "before-you-sign/product-dna@1",
    product: type,
    principal: credit ? r2(m.principal) : null,
    regular_payment: r2(m.regular),
    frequency: type === "bnpl" && v.interval === "fortnight" ? "fortnightly" : "monthly",
    term_months: m.never ? null : Math.round(m.end),
    rate: { measure, value: measure ? n(type === "overdraft" ? v.ear : v.apr) : null, kind: has("variable_rate") ? "variable" : "not stated" },
    fees: {
      upfront: n(type === "loan" ? v.fee : type === "household" ? v.upfront : 0),
      annual: n(type === "card" ? v.annualFee : 0),
      monthly: n(type === "overdraft" ? v.monthlyFee : 0),
      late: n(v.lateFee),
      exit: n(type === "household" ? v.exitFee : type === "subscription" ? v.cancelFee : 0),
    },
    total_payable: m.never ? null : r2(m.total),
    cost_above_price: m.never ? null : r2(Math.max(0, m.onTop)),
    early_repayment: type === "loan" || type === "card" || type === "bnpl"
      ? has("early_repayment_charge") ? "allowed, charge may apply" : type === "loan" ? "allowed" : "not stated"
      : "not applicable",
    auto_renews: type === "subscription" || has("auto_renewal") ? true : type === "household" ? null : false,
    estimated_fields: estimated,
  };
}

/* ---------- questions to ask the provider ---------- */

export interface Question { q: string; why: string }

/** Turns gaps and unclear terms into questions worth asking. Explains, never advises. */
export function questionsToAsk(type: ProductType, v: Values, opts: { missing?: string[]; conditionKinds?: string[]; fromDocument?: boolean; statedTotal?: boolean } = {}): Question[] {
  const { missing = [], conditionKinds = [], fromDocument = false, statedTotal = false } = opts;
  const has = (k: string) => conditionKinds.includes(k);
  const out: Question[] = [];
  const add = (q: string, why: string) => { if (!out.some((x) => x.q === q)) out.push({ q, why }); };
  const credit = PRODUCTS[type].credit;

  if (missing.includes("apr") || missing.includes("ear")) add("What is the interest rate (APR), and is that the rate I’d actually get?", "Without it, the total cost can’t be worked out. An advertised rate may differ from the one you’re offered.");
  if (missing.includes("term") || missing.includes("n")) add("How many payments are there, and how often?", "The length decides the total. A small payment can run for years.");
  if (missing.includes("amount") || missing.includes("price") || missing.includes("balance")) add("What is the exact amount I’m borrowing or paying for?", "Every other figure is worked out from this.");
  if (fromDocument && credit && !statedTotal) add("What is the total amount I’ll pay, including every fee?", "Lenders should be able to tell you the total amount payable.");
  if (credit && type !== "bnpl" && !has("variable_rate") && fromDocument) add("Is the interest rate fixed for the whole term?", "If it can change, your payments could go up.");
  if (has("variable_rate")) add("How often can the rate change, and how would I be told?", "Your document says the rate is variable.");
  if ((type === "loan" || type === "card" || type === "bnpl") && !has("early_repayment_charge")) add("Can I pay it off early, and is there a charge?", "Clearing it sooner usually saves interest. Some agreements charge a fee for this.");
  if (credit && type !== "overdraft") add("What happens if a payment is late or missed?", `Fees${n(v.lateFee) ? ` (${money(n(v.lateFee))} here)` : ""} and a mark on your credit file can both apply.`);
  if ((type === "card" && n(v.intro) > 0) || has("promo_ends")) add("What rate applies when the offer ends, and to what balance?", "Introductory deals end automatically.");
  if (type === "bnpl") add("Will this show on my credit file, and will you check it first?", "Pay-later plans can affect your ability to borrow elsewhere.");
  if (type === "subscription" || has("auto_renewal")) add("How do I cancel, and how much notice do I need to give?", "It keeps charging until you cancel.");
  if (type === "household") add("What would it cost to leave in the first year?", "Exit fees can be close to the remaining payments.");
  if (type === "overdraft") add("Will you tell me before I go over my limit?", "Going past the limit can mean refused payments.");
  return out.slice(0, 6);
}

/* ---------- reverse calculator ---------- */

export interface ReverseRow { months: number; principal: number; total: number; interest: number }

/** What a fixed monthly payment adds up to over different lengths, at a given APR. */
export function reverse(monthly: number, apr: number, terms = [12, 24, 36, 48, 60]): ReverseRow[] {
  const r = monthlyRate(apr);
  return terms.map((k) => {
    const principal = r ? (monthly * (1 - Math.pow(1 + r, -k))) / r : monthly * k;
    return { months: k, principal: r2(principal), total: r2(monthly * k), interest: r2(monthly * k - principal) };
  });
}

/* ---------- future payments ("the ghost of future payments") ---------- */

export interface Milestone { date: string; label: string; remaining: number; paidSoFar: number }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Dates each payment from `start` (a "YYYY-MM" month) and picks the moments people remember. */
export function futurePayments(m: Metrics, start: string): { first: string; last: string; count: number; milestones: Milestone[] } {
  const [y0, mo0] = start.split("-").map(Number);
  const pays = m.s.filter((p) => p.pay > 0.005);
  const at = (t: number) => { const k = (mo0 - 1) + Math.round(t); return { y: y0 + Math.floor(k / 12), mo: ((k % 12) + 12) % 12 }; };
  const name = ({ y, mo }: { y: number; mo: number }) => `${MONTHS[mo]} ${y}`;
  const milestones: Milestone[] = [];
  let paid = 0;
  pays.forEach((p, i) => {
    paid += p.pay;
    const d = at(p.t);
    const remaining = pays.length - i - 1;
    const label = d.mo === 11 ? `Christmas ${d.y}` : d.mo === 6 ? `Summer ${d.y}` : d.mo === 0 ? `New Year ${d.y}` : "";
    if (label && remaining > 0) milestones.push({ date: name(d), label, remaining, paidSoFar: r2(paid) });
  });
  return {
    first: pays.length ? name(at(pays[0].t)) : "",
    last: pays.length ? name(at(pays[pays.length - 1].t)) : "",
    count: pays.length,
    milestones: milestones.slice(0, 10),
  };
}

/* ---------- commitment map ---------- */

export interface Commitment { id: string; name: string; type: ProductType; values: Values }
export interface MappedCommitment { c: Commitment; monthly: number; months: number | null; total: number | null; ongoing: boolean }

/** All of someone's commitments together: what goes out each month and what's still to pay. */
export function commitmentMap(list: Commitment[]) {
  const items: MappedCommitment[] = list.map((c) => {
    const m = simulate(c.type, c.values);
    const perMonth = c.type === "bnpl" && c.values.interval === "fortnight" ? m.regular * 2.17 : m.regular;
    return { c, monthly: r2(perMonth), months: m.never ? null : Math.round(m.end), total: m.never ? null : r2(m.total), ongoing: c.type === "subscription" || m.never };
  });
  const horizon = Math.max(12, ...items.map((i) => i.months ?? 0));
  // Monthly outgoings over time, so people can see when things drop off.
  const byMonth = Array.from({ length: horizon + 1 }, (_, t) => r2(items.reduce((a, i) => a + (i.months === null || t < i.months ? i.monthly : 0), 0)));
  return {
    items,
    monthlyNow: r2(items.reduce((a, i) => a + i.monthly, 0)),
    futureTotal: r2(items.reduce((a, i) => a + (i.total ?? 0), 0)),
    anyNever: items.some((i) => i.total === null),
    horizon,
    byMonth,
  };
}
