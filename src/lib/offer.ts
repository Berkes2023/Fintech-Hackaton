import type { Question } from "./dna";
import type { Values } from "./finance";
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

/** Questions worth asking any lender, broker or provider. Safe to ask, never advice. */
export const LENDER_QUESTIONS: Question[] = [
  { q: "Is there an arrangement fee, and is it added to the loan?", why: "Fees change the total cost even when the APR looks low." },
  { q: "Is the APR fixed for the whole term?", why: "A variable rate could change your monthly payment." },
  { q: "Are there early repayment charges?", why: "They affect what it costs to settle early or refinance." },
  { q: "What is the total amount repayable?", why: "It’s the single number that includes interest and fees." },
  { q: "Can the rate or payment change during the agreement?", why: "So you know whether your monthly commitment is certain." },
  { q: "What happens if I miss a payment?", why: "Late fees and the effect on your credit file." },
  { q: "Are any optional products included, such as insurance?", why: "Optional extras can be added unless you decline them." },
];
