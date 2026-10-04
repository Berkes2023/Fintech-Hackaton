import { describe, expect, it } from "vitest";
import { questionsToAsk } from "./dna";
import { defaults, simulate } from "./finance";
import { documentValues, isCalculable, LENDER_QUESTIONS, mergeQuestions, offerFromExtraction, termValue, type ExtractedTerms } from "./offer";
import { schedule } from "./sim";

const close = (a: number, b: number, tol = 1) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

// The fictional car finance offer used on /small-print and in Plan: £20,000 over 48 months at 8.9% APR,
// £199 arrangement fee, £20 late fee. The document states £493.50 a month and £23,887 in total.
const CAR_OFFER: ExtractedTerms = {
  values: { amount: 20000, apr: 8.9, term: 48, fee: 199, lateFee: 20 },
  filled: ["amount", "apr", "term", "fee", "lateFee"],
  conditions: [{ title: "Optional GAP insurance", quote: "GAP insurance at £12.50 per month is added to your agreement unless you decline it" }],
};
const FALLBACK = { amount: 15000, apr: 9.9, term: 60 };

describe("offer from a document", () => {
  it("reproduces the document’s own monthly payment and total", () => {
    const { scenario, assumed } = offerFromExtraction(CAR_OFFER, FALLBACK);
    const sch = schedule(scenario);
    close(sch.regular, 493.5);
    close(sch.total, 23887);
    expect(assumed).toEqual([]);
    expect(scenario.fieldSources).toMatchObject({ amount: "document_says", apr: "document_says", term: "document_says", upfrontFee: "document_says", lateFee: "document_says" });
  });

  it("keeps the quotes behind each term", () => {
    expect(offerFromExtraction(CAR_OFFER, FALLBACK).terms).toEqual([{ title: "Optional GAP insurance", quote: CAR_OFFER.conditions[0].quote }]);
  });

  it("fills a missing APR from the person’s own scenario and says so", () => {
    const r: ExtractedTerms = { ...CAR_OFFER, filled: CAR_OFFER.filled.filter((k) => k !== "apr") };
    const { scenario, assumed } = offerFromExtraction(r, FALLBACK);
    expect(assumed).toContain("APR");
    expect(scenario.apr).toBe(FALLBACK.apr);
    expect(scenario.fieldSources.apr).toBe("you_told_us");
    expect(scenario.fieldSources.amount).toBe("document_says");
  });

  it("only calculates loan-shaped documents with an amount, APR and length", () => {
    expect(isCalculable(CAR_OFFER)).toBe(true);
    expect(isCalculable({ values: { price: 600, n: 3 }, filled: ["price", "n"], conditions: [] })).toBe(false);
    expect(isCalculable({ ...CAR_OFFER, filled: ["amount", "term"] })).toBe(false);
  });
});

describe("questions worth asking", () => {
  // One keyword per standard topic, matching the seven questions in the brief.
  const TOPICS = [/\bfees?\b/i, /\bfixed\b/i, /\bearly\b/i, /\btotal\b/i, /\bchange/i, /\bmiss/i, /\boptional\b/i];

  it("the standard list covers all seven topics", () => {
    expect(LENDER_QUESTIONS).toHaveLength(7);
    for (const re of TOPICS) expect(LENDER_QUESTIONS.some((q) => re.test(q.q))).toBe(true);
  });

  it("puts the document’s questions first and still covers every standard topic once", () => {
    const fromDoc = questionsToAsk("loan", CAR_OFFER.values, { fromDocument: true, conditionKinds: ["variable_rate", "late_fee"] });
    const merged = mergeQuestions(fromDoc);
    expect(merged.slice(0, fromDoc.length)).toEqual(fromDoc);
    for (const re of TOPICS) expect(merged.some((q) => re.test(q.q))).toBe(true);
    // The document already asks about a variable rate, early repayment and missed payments: no repeats.
    expect(merged.filter((q) => /\bchange/i.test(q.q))).toHaveLength(1);
    expect(merged.filter((q) => /\bearly\b/i.test(q.q))).toHaveLength(1);
    expect(merged.filter((q) => /\bmiss/i.test(q.q))).toHaveLength(1);
    expect(new Set(merged.map((q) => q.q)).size).toBe(merged.length);
  });

  it("with no document questions, gives the standard list unchanged", () => {
    expect(mergeQuestions([])).toEqual(LENDER_QUESTIONS);
  });
});

describe("values as the document states them", () => {
  it("writes each value the way people read it", () => {
    expect(termValue("loan", "amount", CAR_OFFER.values)).toBe("£20,000");
    expect(termValue("loan", "apr", CAR_OFFER.values)).toBe("8.9%");
    expect(termValue("loan", "term", CAR_OFFER.values)).toBe("48 months");
    expect(termValue("loan", "term", { term: 1 })).toBe("1 month");
    expect(termValue("bnpl", "price", { price: 899.5 })).toBe("£899.50");
    expect(termValue("bnpl", "interval", { interval: "fortnight" })).toBe("Every two weeks");
    expect(termValue("household", "riseAmt", { riseAmt: 3 })).toBe("£3/month");
  });
});

describe("calculating a document without inventing terms", () => {
  it("counts an unstated introductory deal and price rise as nothing", () => {
    // The document states only the full monthly price; the standard example values (a £4.99 deal, a 5% rise) must not appear.
    const v = { ...defaults("subscription"), monthly: 9.99 };
    const { values, assumed, notIncluded } = documentValues("subscription", v, ["monthly"]);
    expect(values).toMatchObject({ monthly: 9.99, introPrice: 9.99, introMonths: 0, rise: 0, cancelFee: 0 });
    expect(notIncluded).toEqual(["introPrice", "introMonths", "rise"]);
    expect(assumed).toEqual(["years"]);
    const m = simulate("subscription", values);
    expect(m.regular).toBeCloseTo(9.99, 2);
    close(m.total, 9.99 * 36, 0.01);
  });

  it("keeps stated values, and lists choices a document can’t state as assumptions", () => {
    const v = { ...defaults("card"), balance: 2000, apr: 21.9, annualFee: 30 };
    const { values, assumed, notIncluded } = documentValues("card", v, ["balance", "apr", "annualFee"]);
    expect(values).toMatchObject({ balance: 2000, apr: 21.9, annualFee: 30, intro: 0, lateFee: 0 });
    expect(assumed).toEqual(["payType", "fixedPay"]);
    expect(notIncluded).toEqual(["intro"]);
  });

  it("leaves an unstated late fee and early-exit fee out, without listing them", () => {
    const { values, notIncluded } = documentValues("household", defaults("household"), ["monthly", "term"]);
    expect(values).toMatchObject({ upfront: 0, riseAmt: 0, exitFee: 0 });
    expect(notIncluded).toEqual(["upfront", "riseAmt"]);
  });

  it("never touches a required value, even when it’s missing", () => {
    const v = defaults("loan");
    const { values } = documentValues("loan", v, ["amount"]);
    expect(values.apr).toBe(v.apr);
    expect(values.term).toBe(v.term);
    expect(values.fee).toBe(0);
  });
});
