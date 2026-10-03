import { describe, expect, it } from "vitest";
import { locate, segments } from "./highlight";

const doc = "Representative 29.9% APR (variable).\nMonthly payment £86.73. It’s due 30 days after purchase.";

describe("show me where", () => {
  it("finds a quote despite different spacing, case and apostrophes", () => {
    expect(locate(doc, "representative 29.9%   APR")).toEqual([0, 24]);
    expect(locate(doc, "It's due 30 days")).not.toBeNull();
  });

  it("returns null when the words aren't in the document", () => {
    expect(locate(doc, "early repayment charge")).toBeNull();
  });

  it("splits the text into plain and highlighted runs that rebuild the original", () => {
    const segs = segments(doc, [{ key: "apr", quote: "29.9% APR (variable)" }, { key: "pay", quote: "Monthly payment £86.73" }]);
    expect(segs.map((s) => s.text).join("")).toBe(doc);
    expect(segs.filter((s) => s.key).map((s) => s.key)).toEqual(["apr", "pay"]);
  });
});
