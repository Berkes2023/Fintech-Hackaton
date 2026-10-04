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

/* ---------- Before You Sign profile estimate (0–100) ----------
 * OUR transparent, educational model. It is NOT an Experian, Equifax or TransUnion score, and its weights are
 * not theirs. It uses only what the person tells us about their credit behaviour. Income, rent, bonuses, pension
 * and living costs never enter it: affordability is a separate question.
 *
 *   Payment history        35
 *   Credit utilisation     25
 *   Credit history length  15
 *   Recent applications    10
 *   Existing borrowing     10
 *   Stability / report      5
 *   Total                 100
 */

export type OnTime = "always" | "mostly" | "often_late" | "no_history";
export type Missed = "0" | "1" | "2" | "3plus";
export type Defaults = "none" | "one" | "more";
export type HistoryLength = "none" | "under1" | "1to3" | "3to6" | "6plus";
export type Applications = "0" | "1" | "2" | "3" | "4plus";
export type BorrowingKind = "loan" | "card" | "car" | "overdraft" | "bnpl" | "other";
export type Keeping = "comfortably" | "sometimes" | "often";

export interface EstimateInputs {
  onTime?: OnTime;
  /** Missed repayments in the last 12 months. */
  missed?: Missed;
  /** Defaults in the last 6 years. */
  defaults?: Defaults;
  /** County court judgments (CCJs) in the last 6 years. */
  ccj?: "no" | "yes";
  /** Total credit-card limits, £. */
  cardLimits?: number;
  /** Current credit-card balances, £. */
  cardBalances?: number;
  history?: HistoryLength;
  applications?: Applications;
  borrowing?: BorrowingKind[];
  /** How the person keeps up with existing repayments (asked only if they have borrowing). */
  keeping?: Keeping;
  /** Regularly using an arranged overdraft (asked only if they have one). */
  overdraftRegular?: "no" | "yes";
  electoralRoll?: "yes" | "no" | "unsure";
  /** Bankruptcy, an IVA or a debt relief order in the last 6 years. */
  insolvency?: "no" | "yes";
}

export const LABELS = {
  onTime: { always: "Always on time", mostly: "Mostly on time", often_late: "Often late", no_history: "I don’t have any repayments yet" } as Record<OnTime, string>,
  missed: { "0": "None", "1": "One", "2": "Two", "3plus": "Three or more" } as Record<Missed, string>,
  defaults: { none: "None", one: "One", more: "More than one" } as Record<Defaults, string>,
  ccj: { no: "No", yes: "Yes" },
  history: { none: "No previous credit history", under1: "Under 1 year", "1to3": "1–3 years", "3to6": "3–6 years", "6plus": "6+ years" } as Record<HistoryLength, string>,
  applications: { "0": "0", "1": "1", "2": "2", "3": "3", "4plus": "4+" } as Record<Applications, string>,
  borrowing: { loan: "Personal loan", card: "Credit card", car: "Car finance", overdraft: "Overdraft", bnpl: "Buy Now Pay Later", other: "Other borrowing" } as Record<BorrowingKind, string>,
  keeping: { comfortably: "Comfortably", sometimes: "I sometimes struggle", often: "I often struggle" } as Record<Keeping, string>,
  yesNo: { no: "No", yes: "Yes" },
  electoralRoll: { yes: "Yes", no: "No", unsure: "Not sure" },
};

export type ComponentKey = "payment" | "utilisation" | "history" | "applications" | "borrowing" | "stability";
export interface Step { text: string; points: number }
export interface Component { key: ComponentKey; label: string; max: number; points: number; steps: Step[]; why: string[] }
export type EstimateBand = "stronger" | "positive" | "mixed" | "weaker" | "significant";
export interface Estimate { total: number; band: EstimateBand; bandLabel: string; components: Component[]; utilisation: number | null }
export type EstimateResult = { ok: true; estimate: Estimate } | { ok: false; missing: string[]; invalid: string[] };

export const COMPONENT_MAX: Record<ComponentKey, number> = { payment: 35, utilisation: 25, history: 15, applications: 10, borrowing: 10, stability: 5 };
export const COMPONENT_LABEL: Record<ComponentKey, string> = {
  payment: "Payment history", utilisation: "Credit utilisation", history: "Credit history", applications: "Recent applications", borrowing: "Existing borrowing", stability: "Stability",
};

/** Before You Sign bands. Not CRA bands. */
export const ESTIMATE_BANDS: { band: EstimateBand; from: number; to: number; label: string }[] = [
  { band: "significant", from: 0, to: 19, label: "Significant weaker indicators" },
  { band: "weaker", from: 20, to: 39, label: "Some weaker indicators" },
  { band: "mixed", from: 40, to: 59, label: "Mixed indicators" },
  { band: "positive", from: 60, to: 79, label: "Generally positive indicators" },
  { band: "stronger", from: 80, to: 100, label: "Stronger indicators" },
];
export const estimateBand = (total: number) => ESTIMATE_BANDS.find((b) => total >= b.from && total <= b.to) ?? ESTIMATE_BANDS[0];

/** Utilisation bands for this model (not official CRA bands): [up to %, points]. */
export const UTILISATION_POINTS: [number, number][] = [[10, 25], [30, 21], [50, 15], [75, 9], [100, 4], [Infinity, 0]];

const okMoney = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0;
const clamp = (x: number, max: number) => Math.max(0, Math.min(max, x));

/** Which questions still need an answer, given the answers so far (some are only asked when relevant). */
export function missingAnswers(a: EstimateInputs): string[] {
  const m: string[] = [];
  if (!a.onTime) m.push("onTime");
  if (a.onTime !== "no_history") {
    if (!a.missed) m.push("missed");
    if (!a.defaults) m.push("defaults");
    if (!a.ccj) m.push("ccj");
  }
  if (a.cardLimits === undefined) m.push("cardLimits");
  if (a.cardBalances === undefined) m.push("cardBalances");
  if (!a.history) m.push("history");
  if (!a.applications) m.push("applications");
  if (!a.borrowing) m.push("borrowing");
  if (a.borrowing?.length && !a.keeping) m.push("keeping");
  if (a.borrowing?.includes("overdraft") && !a.overdraftRegular) m.push("overdraftRegular");
  if (!a.electoralRoll) m.push("electoralRoll");
  if (!a.insolvency) m.push("insolvency");
  return m;
}

/** The deterministic calculation. Same answers, same number, every time. */
export function creditEstimate(a: EstimateInputs): EstimateResult {
  const missing = missingAnswers(a);
  const invalid: string[] = [];
  if (a.cardLimits !== undefined && !okMoney(a.cardLimits)) invalid.push("cardLimits");
  if (a.cardBalances !== undefined && !okMoney(a.cardBalances)) invalid.push("cardBalances");
  if (missing.length || invalid.length) return { ok: false, missing, invalid };

  // 1. Payment history (35)
  const pay: Step[] = [];
  const payWhy: string[] = [];
  if (a.onTime === "no_history") {
    pay.push({ text: "No repayment history yet: nothing positive or negative to count, so this starts in the middle", points: 20 });
    payWhy.push("You told us you don’t have any repayments yet.");
  } else {
    pay.push({ text: "Starting points", points: 35 });
    const onTime = { always: 0, mostly: -4, often_late: -12 }[a.onTime!];
    if (onTime) pay.push({ text: a.onTime === "mostly" ? "Mostly, not always, on time" : "Often late", points: onTime });
    payWhy.push({ always: "You told us you always repay on time.", mostly: "You told us you usually repay on time.", often_late: "You told us you’re often late with repayments." }[a.onTime!]);
    const missed = { "0": 0, "1": -5, "2": -9, "3plus": -14 }[a.missed!];
    if (missed) pay.push({ text: `${LABELS.missed[a.missed!]} missed repayment${a.missed === "1" ? "" : "s"} in the last 12 months`, points: missed });
    payWhy.push(a.missed === "0" ? "You reported no missed repayments in the last 12 months." : `You reported ${LABELS.missed[a.missed!].toLowerCase()} missed repayment${a.missed === "1" ? "" : "s"} in the last 12 months.`);
    const def = { none: 0, one: -10, more: -16 }[a.defaults!];
    if (def) pay.push({ text: a.defaults === "one" ? "A default in the last 6 years" : "More than one default in the last 6 years", points: def });
    if (a.defaults !== "none") payWhy.push("You told us about a default. Defaults usually stay on a credit report for 6 years.");
    if (a.ccj === "yes") { pay.push({ text: "A CCJ in the last 6 years", points: -10 }); payWhy.push("You told us about a county court judgment (CCJ)."); }
  }
  const payPts = clamp(pay.reduce((s, x) => s + x.points, 0), 35);

  // 2. Credit utilisation (25)
  const limits = a.cardLimits!, balances = a.cardBalances!;
  let util: number | null = null;
  let utilPts: number;
  const utilSteps: Step[] = [];
  const utilWhy: string[] = [];
  if (limits === 0) {
    utilPts = balances > 0 ? 0 : 15;
    utilSteps.push(balances > 0
      ? { text: "A balance with no available limit", points: 0 }
      : { text: "No credit-card limits, so there’s no utilisation to measure: a neutral middle score", points: 15 });
    utilWhy.push(balances > 0 ? "You reported a card balance but no limit, so utilisation can’t be below 100%." : "You told us you don’t have any credit-card limits.");
  } else {
    util = Math.round((balances / limits) * 1000) / 10;
    utilPts = UTILISATION_POINTS.find(([upTo]) => util! <= upTo)![1];
    utilSteps.push({ text: `£${balances.toLocaleString("en-GB")} used ÷ £${limits.toLocaleString("en-GB")} available = ${util}% utilisation`, points: utilPts });
    utilWhy.push(`Your reported credit utilisation is approximately ${Math.round(util)}%. In this model, lower utilisation earns more points.`);
  }

  // 3. Credit history length (15)
  const histPts = { none: 3, under1: 5, "1to3": 9, "3to6": 12, "6plus": 15 }[a.history!];
  const histWhy = a.history === "none" ? "You told us you have no previous credit history." : `You told us you’ve had credit for ${LABELS.history[a.history!].toLowerCase()}.`;

  // 4. Recent applications (10)
  const appPts = { "0": 10, "1": 8, "2": 6, "3": 3, "4plus": 1 }[a.applications!];
  const appWhy = a.applications === "0" ? "You reported no recent credit applications." : `You reported ${LABELS.applications[a.applications!]} recent credit application${a.applications === "1" ? "" : "s"}. This is what you told us; we can’t see your credit report.`;

  // 5. Existing borrowing (10): having credit isn't penalised; strain and heavy reliance are.
  const kinds = a.borrowing!;
  const bSteps: Step[] = [];
  const bWhy: string[] = [];
  if (!kinds.length) {
    bSteps.push({ text: "No current borrowing: neutral, though it means less recent repayment history to show", points: 7 });
    bWhy.push("You told us you don’t have any borrowing at the moment.");
  } else {
    bSteps.push({ text: "Starting points (having credit isn’t penalised)", points: 10 });
    bWhy.push(`You told us you have: ${kinds.map((k) => LABELS.borrowing[k].toLowerCase()).join(", ")}.`);
    const keep = { comfortably: 0, sometimes: -4, often: -7 }[a.keeping!];
    if (keep) bSteps.push({ text: a.keeping === "sometimes" ? "Sometimes struggling to keep up" : "Often struggling to keep up", points: keep });
    bWhy.push(`You said you keep up with repayments: ${LABELS.keeping[a.keeping!].toLowerCase()}.`);
    if (a.overdraftRegular === "yes") { bSteps.push({ text: "Regularly using an overdraft", points: -2 }); bWhy.push("You told us you’re regularly in your overdraft."); }
    if (kinds.length >= 4) { bSteps.push({ text: "Four or more kinds of borrowing at once", points: -1 }); bWhy.push("You have several kinds of borrowing at the same time."); }
  }
  const bPts = clamp(bSteps.reduce((s, x) => s + x.points, 0), 10);

  // 6. Stability / report indicators (5)
  const sSteps: Step[] = [
    { text: { yes: "On the electoral roll at your current address", no: "Not on the electoral roll at your current address", unsure: "Not sure about the electoral roll" }[a.electoralRoll!], points: { yes: 3, no: 0, unsure: 1 }[a.electoralRoll!] },
    { text: a.insolvency === "no" ? "No bankruptcy, IVA or debt relief order" : "A bankruptcy, IVA or debt relief order", points: a.insolvency === "no" ? 2 : 0 },
  ];
  const sWhy = [
    { yes: "You told us you’re on the electoral roll at your current address.", no: "You told us you’re not on the electoral roll at your current address.", unsure: "You weren’t sure about the electoral roll." }[a.electoralRoll!],
    a.insolvency === "no" ? "You told us you have no bankruptcy, IVA or debt relief order." : "You told us about a bankruptcy, IVA or debt relief order.",
  ];
  const sPts = clamp(sSteps.reduce((s, x) => s + x.points, 0), 5);

  const components: Component[] = [
    { key: "payment", label: COMPONENT_LABEL.payment, max: 35, points: payPts, steps: pay, why: payWhy },
    { key: "utilisation", label: COMPONENT_LABEL.utilisation, max: 25, points: utilPts, steps: utilSteps, why: utilWhy },
    { key: "history", label: COMPONENT_LABEL.history, max: 15, points: histPts, steps: [{ text: LABELS.history[a.history!], points: histPts }], why: [histWhy] },
    { key: "applications", label: COMPONENT_LABEL.applications, max: 10, points: appPts, steps: [{ text: `${LABELS.applications[a.applications!]} recent application${a.applications === "1" ? "" : "s"}`, points: appPts }], why: [appWhy] },
    { key: "borrowing", label: COMPONENT_LABEL.borrowing, max: 10, points: bPts, steps: bSteps, why: bWhy },
    { key: "stability", label: COMPONENT_LABEL.stability, max: 5, points: sPts, steps: sSteps, why: sWhy },
  ];
  const total = components.reduce((s, c) => s + c.points, 0);
  const b = estimateBand(total);
  return { ok: true, estimate: { total, band: b.band, bandLabel: b.label, components, utilisation: util } };
}

/* ---------- what the journey stores ---------- */

/** One official score the person entered themselves, interpreted only on its own agency's scale. */
export interface CraScore {
  creditProvider: Cra;
  creditScale: ScaleId;
  creditScore: number;
  /** The agency's own band for the score, from its published scale. */
  creditBand: string;
  creditSource: "USER_SUPPLIED";
}

export interface CreditProfile {
  /** Up to one score per agency. Never averaged, never converted between agencies. */
  scores: CraScore[];
  /** Answers for the Before You Sign profile estimate (for people who don't know their scores). */
  estimate?: EstimateInputs;
  /** True once the person has pressed "Calculate". */
  calculated?: boolean;
  creditSource: "USER_SUPPLIED";
}

export const NO_CREDIT: CreditProfile = { scores: [], creditSource: "USER_SUPPLIED" };

/** The default scale for each agency: its current published one. */
export const CURRENT_SCALE: Record<Cra, ScaleId> = { experian: "experian", equifax: "equifax", transunion: "transunion_new" };

/** A score on its agency's scale, or null if it isn't a whole number inside that scale. */
export function makeScore(scaleId: ScaleId, score: number): CraScore | null {
  const scale = SCALES[scaleId];
  if (!Number.isInteger(score)) return null;
  const band = bandFor(scale, score);
  if (!band) return null;
  return { creditProvider: scale.cra, creditScale: scaleId, creditScore: score, creditBand: band.label, creditSource: "USER_SUPPLIED" };
}

/** Adds or replaces the score for that agency. */
export const upsertScore = (c: CreditProfile, s: CraScore): CreditProfile => ({ ...c, scores: [...c.scores.filter((x) => x.creditProvider !== s.creditProvider), s].sort((a, b) => CRA_ORDER.indexOf(a.creditProvider) - CRA_ORDER.indexOf(b.creditProvider)) });
export const removeScore = (c: CreditProfile, cra: Cra): CreditProfile => ({ ...c, scores: c.scores.filter((x) => x.creditProvider !== cra) });
export const CRA_ORDER: Cra[] = ["experian", "equifax", "transunion"];

/** "Experian 920 / 1250 (Good)". Always one agency at a time. */
export const scoreLine = (s: CraScore) => `${CRA_LABEL[s.creditProvider]} ${s.creditScore} / ${SCALES[s.creditScale].max} (${s.creditBand})`;

/** One honest line describing the credit context, for summaries. Scores are listed separately, never combined. */
export function creditLine(c: CreditProfile): string {
  const parts: string[] = [];
  if (c.scores.length) parts.push(`${c.scores.map(scoreLine).join(" · ")}. Entered by you.`);
  if (c.calculated && c.estimate) {
    const r = creditEstimate(c.estimate);
    if (r.ok) parts.push(`Before You Sign profile estimate: ${r.estimate.total}/100 (${r.estimate.bandLabel}). Educational, not an Experian, Equifax or TransUnion score.`);
  }
  return parts.join(" ") || "Not provided.";
}

/** The journey only continues once there's a credit context: at least one valid agency score, or a calculated estimate. */
export function creditEstablished(c: CreditProfile): boolean {
  if (c.scores.some((s) => makeScore(s.creditScale, s.creditScore))) return true;
  return !!(c.calculated && c.estimate && creditEstimate(c.estimate).ok);
}
