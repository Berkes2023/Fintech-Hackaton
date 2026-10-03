import { describe, expect, it } from "vitest";
import { buildLabel, parseLabelRequest } from "./api";

describe("public label API", () => {
  it("returns a Money Label for a loan, matching the engine", () => {
    const parsed = parseLabelRequest({ type: "loan", values: { amount: 5000, apr: 12.9, term: 36 } });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const out = buildLabel(parsed.req, parsed.defaulted);
    expect(out.summary.regular_payment).toBeCloseTo(166.54, 1);
    expect(out.summary.total).toBeCloseTo(5995.33, 0);
    expect(out.defaulted).toEqual(["fee", "lateFee"]);
    expect(out.plain_english.join(" ")).not.toContain("**");
  });

  it("rejects bad input with a helpful message", () => {
    expect(parseLabelRequest({ type: "mortgage" })).toMatchObject({ ok: false });
    expect(parseLabelRequest({ type: "loan", values: { apr: "lots" } })).toMatchObject({ ok: false, error: expect.stringContaining("apr") });
    expect(parseLabelRequest({ type: "card", values: { payType: "whenever" } })).toMatchObject({ ok: false });
  });
});
