import type { Question } from "./dna";
import { PRODUCTS, REQUIRED, type ProductType, type Values } from "./finance";
import { money, pct } from "./format";
import type { ActualOffer, Scenario } from "./sim";

// Turns terms that AI read from a document into a finance scenario our code can calculate with.
// AI extracts and quotes; this decides, in code, what was stated and what wasn't.

export interface ExtractedTerms { values: Values; filled: string[]; conditions: { title: string; quote: string }[] }

/** The document's amount, APR and term where stated; anything missing comes from `fallback` and is listed as assumed. */
export function offerFromExtraction(r: ExtractedTerms, fallback: { amount: number; apr: number; term: number }): ActualOffer {
  const v = r.values;
  const has = (k: string) => r.filled.includes(k);
  const num = (k: string) => Number(v[k]);
  const amount = has("amount") ? num("amount") : has("balance") ? num("balance") : fallback.amount;
  const assumed = [!(has("amount") || has("balance")) && "amount", !has("apr") && "APR", !(has("term") || has("n")) && "term"].filter(Boolean) as string[];
  const scenario: Scenario = {
    id: "offer", label: "Your agreement", source: "document", amount,
    apr: has("apr") ? num("apr") : fallback.apr, term: has("term") ? num("term") : has("n") ? num("n") : fallback.term,
    upfrontFee: has("fee") ? num("fee") : 0, monthlyFee: 0, balloon: 0, startIn: 0, lateFee: has("lateFee") ? num("lateFee") : undefined,
    fieldSources: {
      amount: assumed.includes("amount") ? "you_told_us" : "document_says", apr: assumed.includes("APR") ? "you_told_us" : "document_says",
      term: assumed.includes("term") ? "you_told_us" : "document_says", upfrontFee: has("fee") ? "document_says" : "you_told_us", lateFee: has("lateFee") ? "document_says" : undefined,
    },
  };
  return { scenario, assumed, terms: r.conditions.map((c) => ({ title: c.title, quote: c.quote })) };
}

/** Whether a document gave enough to calculate a loan-style repayment ourselves. */
export const isCalculable = (r: ExtractedTerms) => (r.filled.includes("amount") || r.filled.includes("balance")) && r.filled.includes("apr") && (r.filled.includes("term") || r.filled.includes("n"));

/** A value the document states, written the way people read it: "£20,000", "8.9%", "48 months", "Monthly". */
export function termValue(type: ProductType, id: string, v: Values): string {
  const f = PRODUCTS[type].fields.find((x) => x.id === id);
  const raw = v[id];
  if (!f) return String(raw ?? "");
  if (f.type === "select") return f.options?.find((o) => o[0] === raw)?.[1] ?? String(raw);
  const x = Number(raw);
  if (!Number.isFinite(x)) return String(raw ?? "");
  if (f.post === "%") return pct(x);
  const base = f.pre === "£" ? money(x, !Number.isInteger(x)) : x.toLocaleString("en-GB");
  if (!f.post) return base;
  const unit = x === 1 && /^(months|years|payments)$/.test(f.post) ? f.post.slice(0, -1) : f.post;
  return unit.startsWith("/") ? `${base}${unit}` : `${base} ${unit}`;
}

/** Choices a document can't state for you: how you'd repay a card or overdraft, how long you'd keep a subscription. */
const CHOICES = new Set(["payType", "fixedPay", "repay", "years"]);
/** Charges that only apply if something goes wrong or you leave early, so they never change the planned total. */
const OFF_PLAN = new Set(["lateFee", "exitFee", "cancelFee", "missed"]);

export interface DocumentCalc {
  /** What to calculate with: the document’s own values, and nothing invented for what it doesn’t say. */
  values: Values;
  /** Field ids that keep a standard value because a document can’t state them (shown as assumptions). */
  assumed: string[];
  /** Field ids for optional costs or deals the document doesn’t mention, counted as nothing. */
  notIncluded: string[];
}

/**
 * The values to calculate a document with. Stated values are used as they are. What the document doesn’t mention
 * isn’t invented: fees, price rises and introductory deals count as nothing, charges for late payment or leaving
 * early are left out of the plan, and personal choices keep a standard value that is listed as an assumption.
 * Required fields (REQUIRED) are left alone: when one is missing, the full cost can’t be worked out at all.
 */
export function documentValues(type: ProductType, values: Values, filled: string[]): DocumentCalc {
  const out: Values = { ...values };
  const assumed: string[] = [];
  const notIncluded: string[] = [];
  for (const f of PRODUCTS[type].fields) {
    if (filled.includes(f.id) || REQUIRED[type].includes(f.id)) continue;
    if (OFF_PLAN.has(f.id)) { out[f.id] = 0; continue; }
    if (f.showIf && !f.showIf(out)) continue;
    if (CHOICES.has(f.id) || f.type === "select") { assumed.push(f.id); continue; }
    // Not stated: no introductory deal (the full price from the start), no rise, no fee.
    out[f.id] = f.id === "introPrice" ? Number(out.monthly) || 0 : 0;
    notIncluded.push(f.id);
  }
  return { values: out, assumed, notIncluded };
}

/** Questions worth asking any lender, broker or provider. Fine to ask anyone; never advice. */
export const LENDER_QUESTIONS: Question[] = [
  { q: "Is there an arrangement fee, and is it added to the loan?", why: "Fees change the total cost even when the APR looks low." },
  { q: "Is the APR fixed for the whole term?", why: "A variable rate could change your monthly payment." },
  { q: "Are there early repayment charges?", why: "They affect what it costs to settle early or refinance." },
  { q: "What is the total amount repayable?", why: "It’s the single number that includes interest and fees." },
  { q: "Can the rate or payment change during the agreement?", why: "So you know whether your monthly commitment is certain." },
  { q: "What happens if I miss a payment?", why: "Late fees and the effect on your credit file." },
  { q: "Are any optional products included, such as insurance?", why: "Optional extras can be added unless you decline them." },
];

/** The topics the standard questions cover, each found by a simple keyword. */
const TOPICS: [string, RegExp][] = [
  ["fee", /\bfees?\b/i], ["fixed", /\bfixed\b/i], ["early", /\bearly\b/i], ["total", /\btotal\b/i],
  ["change", /\bchange/i], ["miss", /\bmiss/i], ["optional", /\boptional\b/i],
];

/** A question's main topic: the topic keyword that comes first in it, or null when it has none. */
function topicOf(q: Question): string | null {
  let first: { topic: string; at: number } | null = null;
  for (const [topic, re] of TOPICS) {
    const at = q.q.search(re);
    if (at >= 0 && (!first || at < first.at)) first = { topic, at };
  }
  return first?.topic ?? null;
}

/**
 * Questions from the document first, then each standard question whose topic the document's questions don't already
 * cover, so every standard topic is asked once and nothing is replaced.
 */
export function mergeQuestions(docSpecific: Question[], standard: Question[] = LENDER_QUESTIONS): Question[] {
  const covered = new Set(docSpecific.map(topicOf).filter((t): t is string => t !== null));
  const out = [...docSpecific];
  for (const s of standard) {
    const topic = topicOf(s);
    if ((topic && covered.has(topic)) || out.some((o) => o.q === s.q)) continue;
    out.push(s);
  }
  return out;
}
