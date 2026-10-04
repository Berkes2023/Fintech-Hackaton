import { describe, expect, it } from "vitest";
import {
  bandFor, conversions, creditEstablished, displayedScores, toAgencyScale, creditEstimate, creditLine, estimateBand, makeScore, missingAnswers, NO_CREDIT, removeScore, scalePosition, SCALES, upsertScore,
  type Component, type EstimateInputs,
} from "./credit";

describe("credit scales", () => {
  it("uses each agency's own published bands", () => {
    expect(bandFor(SCALES.experian, 950)?.label).toBe("Good");
    expect(bandFor(SCALES.experian, 1121)?.label).toBe("Excellent");
    expect(bandFor(SCALES.equifax, 438)?.label).toBe("Poor");
    expect(bandFor(SCALES.equifax, 439)?.label).toBe("Fair");
    expect(bandFor(SCALES.transunion_new, 700)?.label).toBe("Good");
    expect(bandFor(SCALES.transunion_old, 700)?.label).toBe("Excellent");
  });

  it("has no gaps or overlaps on any scale", () => {
    for (const s of Object.values(SCALES)) {
      expect(s.bands[0].from).toBe(s.min);
      expect(s.bands[s.bands.length - 1].to).toBe(s.max);
      for (let i = 1; i < s.bands.length; i++) expect(s.bands[i].from).toBe(s.bands[i - 1].to + 1);
    }
  });

  it("validates each agency's own range: Experian 0–1250", () => {
    expect(makeScore("experian", 0)?.creditBand).toBe("Low");
    expect(makeScore("experian", 1250)?.creditBand).toBe("Excellent");
    expect(makeScore("experian", 1251)).toBeNull();
    expect(makeScore("experian", -1)).toBeNull();
    expect(makeScore("experian", 920.5)).toBeNull();
    expect(makeScore("experian", Number.NaN)).toBeNull();
    expect(makeScore("experian", 920)?.creditBand).toBe("Good");
  });

  it("validates Equifax 0–1000", () => {
    expect(makeScore("equifax", 1000)?.creditBand).toBe("Excellent");
    expect(makeScore("equifax", 1001)).toBeNull();
    expect(makeScore("equifax", 710)?.creditBand).toBe("Very good");
  });

  it("validates TransUnion on the new 0–999 scale, and the older 0–710 one only when chosen", () => {
    expect(makeScore("transunion_new", 999)?.creditBand).toBe("Excellent");
    expect(makeScore("transunion_new", 1000)).toBeNull();
    expect(makeScore("transunion_new", 680)?.creditBand).toBe("Good");
    expect(makeScore("transunion_old", 711)).toBeNull();
    expect(makeScore("transunion_old", 680)?.creditBand).toBe("Excellent");
  });

  it("never reads one agency's score on another's scale: the same number gets each agency's own band", () => {
    expect([makeScore("experian", 800)?.creditBand, makeScore("equifax", 800)?.creditBand, makeScore("transunion_new", 800)?.creditBand]).toEqual(["Fair", "Very good", "Excellent"]);
  });

  it("keeps up to three scores side by side, one per agency, never averaged", () => {
    let c = upsertScore(NO_CREDIT, makeScore("transunion_new", 680)!);
    c = upsertScore(c, makeScore("experian", 920)!);
    c = upsertScore(c, makeScore("equifax", 710)!);
    c = upsertScore(c, makeScore("experian", 940)!); // replaces, doesn't add
    expect(c.scores.map((x) => [x.creditProvider, x.creditScore, x.creditBand, x.creditSource])).toEqual([
      ["experian", 940, "Good", "USER_SUPPLIED"], ["equifax", 710, "Very good", "USER_SUPPLIED"], ["transunion", 680, "Good", "USER_SUPPLIED"],
    ]);
    const line = creditLine(c);
    expect(line).toBe("Experian 940 / 1250 (entered by you) · Equifax 710 / 1000 (entered by you) · TransUnion 680 / 999 (entered by you).");
    expect(line).not.toMatch(/average/i);
    expect(removeScore(c, "equifax").scores).toHaveLength(2);
    expect(scalePosition(SCALES.equifax, 500)).toBeCloseTo(0.5, 5);
  });

  it("only lets the journey continue with a valid score or a calculated estimate", () => {
    expect(creditEstablished(NO_CREDIT)).toBe(false);
    expect(creditEstablished(upsertScore(NO_CREDIT, makeScore("equifax", 600)!))).toBe(true);
  });
});

/* ---------- Before You Sign Credit Estimate ---------- */

const strong: EstimateInputs = {
  onTime: "always", missed: "0", defaults: "none", ccj: "no",
  cardLimits: 5000, cardBalances: 0, history: "6plus", applications: "0",
  borrowing: ["card"], keeping: "comfortably", electoralRoll: "yes", insolvency: "no",
};
const run = (a: EstimateInputs) => { const r = creditEstimate(a); if (!r.ok) throw new Error(`not ok: ${r.missing.concat(r.invalid).join(",")}`); return r.estimate; };
const pts = (cs: Component[]) => Object.fromEntries(cs.map((c) => [c.key, c.points]));

describe("Before You Sign Credit Estimate (0–100)", () => {
  it("a perfect profile scores 35 + 25 + 15 + 10 + 10 + 5 = 100", () => {
    const e = run(strong);
    expect(pts(e.components)).toEqual({ payment: 35, utilisation: 25, history: 15, applications: 10, borrowing: 10, stability: 5 });
    expect(e.total).toBe(100);
    expect(e.bandLabel).toBe("Stronger indicators");
  });

  it("every component's points equal the sum of its explained steps, and the total equals the components", () => {
    const e = run({ ...strong, onTime: "mostly", missed: "1", cardBalances: 1000, history: "3to6", applications: "2", borrowing: ["card", "loan", "overdraft"], overdraftRegular: "yes", electoralRoll: "unsure" });
    for (const c of e.components) {
      expect(c.points).toBe(Math.max(0, Math.min(c.max, c.steps.reduce((s, x) => s + x.points, 0))));
      expect(c.why.length).toBeGreaterThan(0);
    }
    // 35-4-5=26, 20% → 21, 3–6y → 12, 2 apps → 6, 10-2 → 8, roll unsure 1 + no insolvency 2 → 3
    expect(pts(e.components)).toEqual({ payment: 26, utilisation: 21, history: 12, applications: 6, borrowing: 8, stability: 3 });
    expect(e.total).toBe(76);
    expect(e.bandLabel).toBe("Generally positive indicators");
  });

  it("high utilisation costs points: £4,500 of £5,000 is 90%", () => {
    const e = run({ ...strong, cardBalances: 4500 });
    expect(e.utilisation).toBe(90);
    expect(pts(e.components).utilisation).toBe(4);
    expect(run({ ...strong, cardBalances: 6000 }).components[1].points).toBe(0); // over the limit
  });

  it("missed payments, defaults and CCJs reduce payment history progressively", () => {
    expect(pts(run({ ...strong, missed: "1" }).components).payment).toBe(30);
    expect(pts(run({ ...strong, missed: "3plus" }).components).payment).toBe(21);
    expect(pts(run({ ...strong, missed: "3plus", defaults: "more", ccj: "yes", onTime: "often_late" }).components).payment).toBe(0);
  });

  it("short or no credit history earns fewer points, and no repayments yet is neutral, not zero", () => {
    expect(pts(run({ ...strong, history: "none" }).components).history).toBe(3);
    expect(pts(run({ ...strong, history: "under1" }).components).history).toBe(5);
    const thin = run({ onTime: "no_history", cardLimits: 0, cardBalances: 0, history: "none", applications: "0", borrowing: [], electoralRoll: "yes", insolvency: "no" });
    expect(pts(thin.components)).toEqual({ payment: 20, utilisation: 15, history: 3, applications: 10, borrowing: 7, stability: 5 });
    expect(thin.total).toBe(60);
  });

  it("many recent applications earn fewer points", () => {
    expect(["0", "1", "2", "3", "4plus"].map((a) => pts(run({ ...strong, applications: a as EstimateInputs["applications"] }).components).applications)).toEqual([10, 8, 6, 3, 1]);
  });

  it("zero available credit is handled safely: no division by zero", () => {
    const none = run({ ...strong, cardLimits: 0, cardBalances: 0 });
    expect(none.utilisation).toBeNull();
    expect(pts(none.components).utilisation).toBe(15);
    expect(pts(run({ ...strong, cardLimits: 0, cardBalances: 200 }).components).utilisation).toBe(0);
  });

  it("refuses to calculate with missing or invalid inputs", () => {
    const r = creditEstimate({ ...strong, cardLimits: -100, cardBalances: Number.NaN });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.invalid).toEqual(["cardLimits", "cardBalances"]);
    const m = creditEstimate({ onTime: "always" });
    expect(m.ok).toBe(false);
    if (!m.ok) expect(m.missing).toContain("cardLimits");
    expect(missingAnswers({ ...strong, borrowing: ["overdraft"], keeping: undefined })).toEqual(["keeping", "overdraftRegular"]);
  });

  it("utilisation and band boundaries are exact", () => {
    expect(pts(run({ ...strong, cardBalances: 500 }).components).utilisation).toBe(25); // 10.0%
    expect(pts(run({ ...strong, cardBalances: 505 }).components).utilisation).toBe(21); // 10.1%
    expect(pts(run({ ...strong, cardBalances: 1500 }).components).utilisation).toBe(21); // 30.0%
    expect(pts(run({ ...strong, cardBalances: 5000 }).components).utilisation).toBe(4); // 100%
    expect([0, 19, 20, 39, 40, 59, 60, 79, 80, 100].map((t) => estimateBand(t).band)).toEqual(
      ["significant", "significant", "weaker", "weaker", "mixed", "mixed", "positive", "positive", "stronger", "stronger"]);
  });

  it("never uses income or living costs: the inputs simply have no such fields", () => {
    const withExtras = { ...strong, salary: 2500, rent: 850 } as EstimateInputs;
    expect(run(withExtras).total).toBe(run(strong).total);
  });

  it("is described as our educational model, never an official score", () => {
    const c = { scores: [], creditSource: "USER_SUPPLIED" as const, estimate: strong, calculated: true };
    expect(creditLine(c)).toBe("Experian 1250 / 1250 (Before You Sign estimate) · Equifax 1000 / 1000 (Before You Sign estimate) · TransUnion 999 / 999 (Before You Sign estimate). Estimates come from your Before You Sign profile of 100/100, not from the agencies.");
    expect(creditLine(c)).not.toMatch(/your (Experian|Equifax|TransUnion) score/i);
    expect(creditEstablished(c)).toBe(true);
    expect(creditEstablished({ ...c, calculated: false })).toBe(false);
  });
});

describe("estimated scores on each agency's displayed scale", () => {
  const triple = (p: number) => conversions(p).map((c) => c.score);

  it("maps profile% onto Experian 1250, Equifax 1000 and TransUnion 999", () => {
    expect(triple(0)).toEqual([0, 0, 0]);
    expect(triple(34)).toEqual([425, 340, 340]);
    expect(triple(50)).toEqual([625, 500, 500]);
    expect(triple(80)).toEqual([1000, 800, 799]);
    expect(triple(100)).toEqual([1250, 1000, 999]);
  });

  it("shows its working: 34% × 999 = 339.66 → 340", () => {
    const tu = conversions(34)[2];
    expect(tu.exact).toBeCloseTo(339.66, 2);
    expect(tu.score).toBe(340);
    expect(conversions(34)[0].exact).toBe(425);
  });

  it("rounds half up and stays inside each scale", () => {
    expect(toAgencyScale(0.04, "experian")).toBe(1); // 0.5 → 1
    expect(toAgencyScale(0.03, "experian")).toBe(0); // 0.375 → 0
    expect(toAgencyScale(150, "equifax")).toBe(1000);
    expect(toAgencyScale(-20, "transunion_new")).toBe(0);
    expect(toAgencyScale(Number.NaN, "experian")).toBeNull();
    for (let p = 0; p <= 100; p++) for (const c of conversions(p)) { expect(c.score).toBeGreaterThanOrEqual(0); expect(c.score).toBeLessThanOrEqual(c.max); expect(c.band).not.toBe(""); }
  });

  it("puts each estimate in that agency's own band", () => {
    expect(conversions(34).map((c) => c.band)).toEqual(["Low", "Poor", "Very Low"]);
    expect(conversions(80).map((c) => c.band)).toEqual(["Good", "Very good", "Excellent"]);
  });

  it("a score the person entered takes precedence over our estimate for that agency only", () => {
    const c = upsertScore({ scores: [], creditSource: "USER_SUPPLIED", estimate: strong, calculated: true }, makeScore("experian", 920)!);
    expect(displayedScores(c).map((d) => [d.cra, d.score, d.kind])).toEqual([["experian", 920, "entered"], ["equifax", 1000, "estimate"], ["transunion", 999, "estimate"]]);
    expect(displayedScores({ ...c, calculated: false }).map((d) => d.cra)).toEqual(["experian"]);
  });
});

describe("what could change your credit profile", () => {
  it("paying down £1,000 of a £3,750 balance on £5,000 limits: 75% → 55%", async () => {
    const { utilisationAfterPaydown } = await import("./credit");
    expect(utilisationAfterPaydown(5000, 3750, 1000)).toEqual({ before: 75, after: 55, newBalance: 2750 });
    expect(utilisationAfterPaydown(5000, 500, 1000)?.after).toBe(0); // can't pay down more than the balance
    expect(utilisationAfterPaydown(0, 500, 100)).toBeNull();
  });
});
