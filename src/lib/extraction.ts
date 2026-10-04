import { isProductType, type ProductType } from "./finance";

// Validates the AI's extraction before the UI sees it. Anything malformed is dropped or replaced with an empty
// value, so a bad model response can never crash the page or slip an invented field through.

const CONFIDENCE = ["high", "medium", "low"] as const;
const PROMINENCE = ["headline", "body", "small_print", "absent"] as const;
const PROMINENCE_KEYS = ["monthly_payment", "total_payable", "length", "interest_rate", "fees"] as const;
const CONDITION_KINDS = ["variable_rate", "late_fee", "promo_ends", "auto_renewal", "early_repayment_charge", "price_rise", "exit_fee", "credit_check", "other"] as const;

type Confidence = (typeof CONFIDENCE)[number];
type Prominence = (typeof PROMINENCE)[number];

export interface Extraction {
  product: ProductType;
  values: { id: string; value: string; quote: string; confidence: Confidence }[];
  conditions: { kind: string; title: string; plain: string; why: string; quote: string; confidence: Confidence }[];
  contradictions: { headline: string; headline_quote: string; full_terms: string; terms_quote: string }[];
  prominence: Record<(typeof PROMINENCE_KEYS)[number], Prominence> | null;
  claim: string;
  stated: { monthly: string; monthly_quote: string; total: string; total_quote: string };
  document_text: string;
}

const obj = (x: unknown): Record<string, unknown> => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {});
const str = (x: unknown, max = 400) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const arr = (x: unknown) => (Array.isArray(x) ? x : []);
const oneOf = <T extends string>(x: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(x as T) ? (x as T) : fallback);

/** Returns a clean Extraction, or null if the response isn't usable at all. */
export function validateExtraction(raw: unknown): Extraction | null {
  const r = obj(raw);
  if (!isProductType(r.product)) return null;

  const values = arr(r.values)
    .map((v) => { const o = obj(v); return { id: str(o.id, 40), value: str(o.value, 40), quote: str(o.quote, 300), confidence: oneOf(o.confidence, CONFIDENCE, "medium") }; })
    // Every value must show the words it came from, like conditions below; a value with no quote is dropped.
    .filter((v) => v.id && v.value && v.quote);

  const conditions = arr(r.conditions)
    .map((c) => { const o = obj(c); return { kind: oneOf(o.kind, CONDITION_KINDS, "other"), title: str(o.title, 120), plain: str(o.plain), why: str(o.why), quote: str(o.quote, 300), confidence: oneOf(o.confidence, CONFIDENCE, "medium") }; })
    .filter((c) => c.title && c.quote)
    .slice(0, 12);

  const contradictions = arr(r.contradictions)
    .map((c) => { const o = obj(c); return { headline: str(o.headline), headline_quote: str(o.headline_quote, 300), full_terms: str(o.full_terms), terms_quote: str(o.terms_quote, 300) }; })
    .filter((c) => c.headline_quote && c.terms_quote)
    .slice(0, 4);

  const p = obj(r.prominence);
  const prominence = PROMINENCE_KEYS.some((k) => k in p)
    ? (Object.fromEntries(PROMINENCE_KEYS.map((k) => [k, oneOf(p[k], PROMINENCE, "absent")])) as Extraction["prominence"])
    : null;

  const s = obj(r.stated);
  return {
    product: r.product,
    values,
    conditions,
    contradictions,
    prominence,
    claim: str(r.claim, 200),
    stated: { monthly: str(s.monthly, 20), monthly_quote: str(s.monthly_quote, 300), total: str(s.total, 20), total_quote: str(s.total_quote, 300) },
    document_text: str(r.document_text, 3000),
  };
}

/** Gemini's structured output takes a subset of JSON Schema; `additionalProperties` is dropped for compatibility. */
export function forGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(forGemini);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(Object.entries(schema).filter(([k]) => k !== "additionalProperties").map(([k, v]) => [k, forGemini(v)]));
}
