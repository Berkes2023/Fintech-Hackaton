import { describe, expect, it } from "vitest";
import { bandFor, creditLine, exploreProfile, NO_CREDIT, scalePosition, SCALES, withScore } from "./credit";

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

  it("rejects a score outside the chosen scale instead of guessing", () => {
    expect(bandFor(SCALES.equifax, 1100)).toBeNull();
    expect(withScore(NO_CREDIT, "transunion_old", 900).creditBand).toBeUndefined();
  });

  it("stores the score as user-supplied, with the agency's band", () => {
    const c = withScore(NO_CREDIT, "equifax", 700);
    expect(c).toMatchObject({ creditProvider: "equifax", creditScore: 700, creditBand: "Very good", creditSource: "USER_SUPPLIED" });
    expect(creditLine(c)).toMatch(/You told us/);
    expect(scalePosition(SCALES.equifax, 500)).toBeCloseTo(0.5, 5);
  });
});

describe("explore my credit profile", () => {
  it("needs enough answers before describing anything", () => {
    const r = exploreProfile({ onTime: "always", missed: "unsure" });
    expect(r.indicator).toBe("insufficient");
  });

  it("traces every conclusion to an answer, and never outputs a number", () => {
    const r = exploreProfile({ onTime: "always", missed: "no", utilisation: "low", applications: "zero", records: "no" });
    expect(r.indicator).toBe("stronger");
    expect(r.reasons).toHaveLength(5);
    expect(r.label).not.toMatch(/\d/);
  });

  it("flags factors worth understanding", () => {
    expect(exploreProfile({ onTime: "always", missed: "no", utilisation: "high", applications: "many", history: "over3" }).indicator).toBe("worth");
    expect(exploreProfile({ onTime: "always", missed: "no", utilisation: "high", applications: "zero", history: "over3" }).indicator).toBe("mixed");
    expect(exploreProfile({ onTime: "mostly", missed: "no", records: "yes", history: "over3" }).indicator).toBe("worth");
  });
});
