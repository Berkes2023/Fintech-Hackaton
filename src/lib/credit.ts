// Credit context. Everything here is USER-SUPPLIED or explained back to the person.
// Before You Sign never calculates an Experian, Equifax or TransUnion score: their methods are their own.
// A credit profile never feeds affordability and never selects a rate.

export type Cra = "experian" | "equifax" | "transunion";
export type ScaleId = "experian" | "equifax" | "transunion_new" | "transunion_old";

export interface ScaleBand { label: string; from: number; to: number; plain: string }
export interface Scale { id: ScaleId; cra: Cra; name: string; min: number; max: number; bands: ScaleBand[]; source: string; url: string; note?: string }

/** Published scales, checked against each agency's own pages on 4 October 2026. Lowest band first. */
export const SCALES: Record<ScaleId, Scale> = {
  experian: {
    id: "experian", cra: "experian", name: "Experian", min: 0, max: 1250,
    source: "Experian UK, “What is a good credit score?”", url: "https://www.experian.co.uk/consumer/experian-credit-score.html",
    bands: [
      { label: "Low", from: 0, to: 640, plain: "Experian’s lowest band. Some lenders may be less likely to offer credit, or may offer it on different terms." },
      { label: "Fair", from: 641, to: 860, plain: "Experian’s second band. You may be offered some credit, sometimes at higher rates." },
      { label: "Good", from: 861, to: 1000, plain: "Experian’s middle band." },
      { label: "Very Good", from: 1001, to: 1120, plain: "Experian’s second-highest band." },
      { label: "Excellent", from: 1121, to: 1250, plain: "Experian’s highest band." },
    ],
  },
  equifax: {
    id: "equifax", cra: "equifax", name: "Equifax", min: 0, max: 1000,
    source: "Equifax UK, “Credit score ranges”", url: "https://www.equifax.co.uk/resources/loans-and-credit/understanding-credit-score-ranges.html",
    bands: [
      { label: "Poor", from: 0, to: 438, plain: "Equifax’s lowest band. Equifax says this may mean difficulty getting new credit." },
      { label: "Fair", from: 439, to: 530, plain: "Equifax’s second band. Equifax says you may face some difficulties applying for credit." },
      { label: "Good", from: 531, to: 670, plain: "Equifax’s middle band, described as an acceptable credit history." },
      { label: "Very good", from: 671, to: 810, plain: "Equifax’s second-highest band." },
      { label: "Excellent", from: 811, to: 1000, plain: "Equifax’s highest band." },
    ],
  },
  transunion_new: {
    id: "transunion_new", cra: "transunion", name: "TransUnion (new 0–999 scale)", min: 0, max: 999,
    source: "TransUnion UK newsroom, new 0–999 score", url: "https://newsroom.transunion.co.uk/transunion-launches-next-generation-expanded-0--999-consumer-credit-score-in-the-uk",
    note: "TransUnion is moving its partners to this scale between late September 2026 and June 2027.",
    bands: [
      { label: "Very Low", from: 0, to: 487, plain: "TransUnion’s lowest band on the new scale." },
      { label: "Low", from: 488, to: 562, plain: "TransUnion’s second band on the new scale." },
      { label: "Fair", from: 563, to: 652, plain: "TransUnion’s middle band on the new scale." },
      { label: "Good", from: 653, to: 785, plain: "TransUnion’s second-highest band on the new scale." },
      { label: "Excellent", from: 786, to: 999, plain: "TransUnion’s highest band on the new scale." },
    ],
  },
  transunion_old: {
    id: "transunion_old", cra: "transunion", name: "TransUnion (older 0–710 scale)", min: 0, max: 710,
    source: "TransUnion UK newsroom, previous 0–710 score", url: "https://newsroom.transunion.co.uk/transunion-launches-next-generation-expanded-0--999-consumer-credit-score-in-the-uk",
    note: "Being replaced by the 0–999 scale. Some apps will show this scale until June 2027.",
    bands: [
      { label: "Very Poor", from: 0, to: 550, plain: "TransUnion’s lowest band on the older scale." },
      { label: "Poor", from: 551, to: 565, plain: "TransUnion’s second band on the older scale." },
      { label: "Fair", from: 566, to: 603, plain: "TransUnion’s middle band on the older scale." },
      { label: "Good", from: 604, to: 627, plain: "TransUnion’s second-highest band on the older scale." },
      { label: "Excellent", from: 628, to: 710, plain: "TransUnion’s highest band on the older scale." },
    ],
  },
};

export const CRA_LABEL: Record<Cra, string> = { experian: "Experian", equifax: "Equifax", transunion: "TransUnion" };

/** The agency's own band for a score on its own scale. Never converted to another agency's scale. */
export function bandFor(scale: Scale, score: number): ScaleBand | null {
  if (!Number.isFinite(score) || score < scale.min || score > scale.max) return null;
  return scale.bands.find((b) => score >= b.from && score <= b.to) ?? null;
}

/** Where a score sits along its scale, 0 to 1. */
export const scalePosition = (scale: Scale, score: number) => Math.min(1, Math.max(0, (score - scale.min) / (scale.max - scale.min)));

/** For drawing bands at equal widths: the band index plus how far into that band the score is, as 0 to 1. */
export function bandPosition(scale: Scale, score: number): number | null {
  const i = scale.bands.findIndex((b) => score >= b.from && score <= b.to);
  if (i < 0) return null;
  const b = scale.bands[i];
  return (i + (score - b.from + 0.5) / (b.to - b.from + 1)) / scale.bands.length;
}

/* ---------- "I don't know my score": explore the profile instead ---------- */

export type QuestionId = "onTime" | "missed" | "borrowing" | "utilisation" | "applications" | "history" | "records";
export type Effect = "stronger" | "neutral" | "worth" | "unknown";
export interface Option { id: string; label: string; effect: Effect; why: string }
export interface Question { id: QuestionId; ask: string; options: Option[] }

const NS = (why = "You weren’t sure, so this answer isn’t used."): Option => ({ id: "unsure", label: "Not sure", effect: "unknown", why });

/** Factors that can appear on a UK credit report. Plain questions; no weights are invented. */
export const QUESTIONS: Question[] = [
  { id: "onTime", ask: "Do you usually make repayments on time?", options: [
    { id: "always", label: "Always", effect: "stronger", why: "Repaying on time is generally seen positively on a credit report." },
    { id: "mostly", label: "Mostly", effect: "neutral", why: "An occasional late payment can show on a credit report." },
    { id: "often_late", label: "Often late", effect: "worth", why: "Regular late payments can be recorded and may affect how lenders see an application." },
    { id: "no_credit", label: "I don’t have any credit yet", effect: "neutral", why: "With little credit history, there’s less for lenders to go on." },
    NS(),
  ] },
  { id: "missed", ask: "Have you missed a repayment in the last 12 months?", options: [
    { id: "no", label: "No", effect: "stronger", why: "No recent missed payments." },
    { id: "once", label: "Once", effect: "neutral", why: "A single recent missed payment can show on a credit report." },
    { id: "more", label: "More than once", effect: "worth", why: "Several recent missed payments can be recorded and may matter to lenders." },
    NS(),
  ] },
  { id: "borrowing", ask: "How much do you already borrow, not counting a mortgage?", options: [
    { id: "none", label: "Nothing", effect: "neutral", why: "No existing borrowing to repay." },
    { id: "some", label: "A little, easy to manage", effect: "stronger", why: "Borrowing that you say is easy to manage." },
    { id: "a_lot", label: "Quite a lot", effect: "worth", why: "Lenders usually look at how much you already owe." },
    NS(),
  ] },
  { id: "utilisation", ask: "How much of your credit-card and overdraft limits are you using?", options: [
    { id: "low", label: "Under 30%", effect: "stronger", why: "Using a smaller share of your limits is often seen positively." },
    { id: "mid", label: "Between 30% and 75%", effect: "neutral", why: "A moderate share of your limits in use." },
    { id: "high", label: "Over 75%", effect: "worth", why: "Using most of your available limits can affect how lenders see you." },
    { id: "none", label: "I don’t have cards or an overdraft", effect: "neutral", why: "No revolving credit to look at." },
    NS(),
  ] },
  { id: "applications", ask: "How many times have you applied for credit in the last 6 months?", options: [
    { id: "zero", label: "None", effect: "stronger", why: "No recent applications showing." },
    { id: "few", label: "Once or twice", effect: "neutral", why: "A couple of recent applications." },
    { id: "many", label: "Three or more", effect: "worth", why: "Several recent applications in a short time can be noticed by lenders." },
    NS(),
  ] },
  { id: "history", ask: "How long have you had credit accounts?", options: [
    { id: "under1", label: "Less than a year", effect: "neutral", why: "A short credit history gives lenders less to go on." },
    { id: "1to3", label: "1 to 3 years", effect: "neutral", why: "A few years of credit history." },
    { id: "over3", label: "More than 3 years", effect: "stronger", why: "A longer credit history." },
    { id: "never", label: "I’ve never had credit", effect: "neutral", why: "No credit history yet, so there’s little for lenders to go on." },
    NS(),
  ] },
  { id: "records", ask: "Do you know of any CCJs, defaults, an IVA or bankruptcy in the last 6 years?", options: [
    { id: "no", label: "No", effect: "stronger", why: "No adverse records that you know of." },
    { id: "yes", label: "Yes", effect: "worth", why: "Records like these usually stay on a credit report for 6 years and can matter to lenders." },
    NS(),
  ] },
];

export type ExploreAnswers = Partial<Record<QuestionId, string>>;
export type Indicator = "stronger" | "mixed" | "worth" | "insufficient";
export const INDICATOR_LABEL: Record<Indicator, string> = {
  stronger: "Stronger profile indicators",
  mixed: "Mixed profile indicators",
  worth: "Some factors worth understanding",
  insufficient: "Insufficient information",
};

export interface Reason { question: string; answer: string; effect: Effect; why: string }
export interface ExploreResult { indicator: Indicator; label: string; summary: string; reasons: Reason[]; answered: number }

/** A Before You Sign credit profile: not a score, and every conclusion traces back to an answer. */
export function exploreProfile(a: ExploreAnswers): ExploreResult {
  const reasons: Reason[] = [];
  for (const q of QUESTIONS) {
    const o = q.options.find((x) => x.id === a[q.id]);
    if (o) reasons.push({ question: q.ask, answer: o.label, effect: o.effect, why: o.why });
  }
  const known = reasons.filter((r) => r.effect !== "unknown");
  const worth = known.filter((r) => r.effect === "worth").length;
  const stronger = known.filter((r) => r.effect === "stronger").length;
  let indicator: Indicator;
  if (known.length < 4) indicator = "insufficient";
  else if (worth > 0) indicator = worth >= 2 || a.records === "yes" ? "worth" : "mixed";
  else indicator = stronger >= 4 ? "stronger" : "mixed";
  const summary = {
    insufficient: `You answered ${known.length} of ${QUESTIONS.length} questions with something other than “Not sure”, which isn’t enough to describe a profile.`,
    stronger: `${stronger} of your answers point to things lenders often see positively, and none point to common concerns.`,
    mixed: `Your answers include ${stronger} positive indicator${stronger === 1 ? "" : "s"}${worth ? ` and ${worth} factor worth understanding` : ""}.`,
    worth: `${worth} of your answers point to factors that lenders may look at closely.`,
  }[indicator];
  return { indicator, label: INDICATOR_LABEL[indicator], summary, reasons, answered: known.length };
}

/* ---------- what the journey stores ---------- */

export interface CreditProfile {
  mode: "score" | "explore" | "unknown";
  creditProvider?: Cra;
  creditScale?: ScaleId;
  creditScore?: number;
  /** The agency's own band for the score, from its published scale. */
  creditBand?: string;
  creditSource: "USER_SUPPLIED";
  explore?: ExploreAnswers;
}

export const NO_CREDIT: CreditProfile = { mode: "unknown", creditSource: "USER_SUPPLIED" };

export function withScore(c: CreditProfile, scaleId: ScaleId, score: number | undefined): CreditProfile {
  const scale = SCALES[scaleId];
  const band = score === undefined ? null : bandFor(scale, score);
  return { mode: "score", creditProvider: scale.cra, creditScale: scaleId, creditScore: score, creditBand: band?.label, creditSource: "USER_SUPPLIED", explore: c.explore };
}

/** One honest line describing the credit context, for summaries. */
export function creditLine(c: CreditProfile): string {
  if (c.mode === "score" && c.creditScale && c.creditScore !== undefined) {
    const s = SCALES[c.creditScale];
    return `${s.name}: ${c.creditScore} out of ${s.max}${c.creditBand ? ` (${s.name.split(" ")[0]}’s “${c.creditBand}” band)` : ""}. You told us this.`;
  }
  if (c.mode === "explore" && c.explore) return `Before You Sign credit profile: ${exploreProfile(c.explore).label}. Based on your answers, not an official score.`;
  return "Not provided.";
}
