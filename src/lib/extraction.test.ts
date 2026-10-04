import { describe, expect, it } from "vitest";
import { forGemini, validateExtraction } from "./extraction";

describe("extraction validation", () => {
  it("keeps a well-formed response intact", () => {
    const ok = validateExtraction({
      product: "loan",
      values: [{ id: "apr", value: "29.9", quote: "Representative 29.9% APR", confidence: "high" }],
      conditions: [{ kind: "variable_rate", title: "Variable rate", plain: "It can change.", why: "Payments could rise.", quote: "(variable)", confidence: "high" }],
      contradictions: [],
      prominence: { monthly_payment: "headline", total_payable: "small_print", length: "body", interest_rate: "body", fees: "absent" },
      claim: "",
      stated: { monthly: "86.73", monthly_quote: "Monthly payment £86.73", total: "", total_quote: "" },
      document_text: "",
    });
    expect(ok?.values[0]).toEqual({ id: "apr", value: "29.9", quote: "Representative 29.9% APR", confidence: "high" });
    expect(ok?.prominence?.total_payable).toBe("small_print");
  });

  it("rejects responses without a known product", () => {
    expect(validateExtraction({ product: "mortgage" })).toBeNull();
    expect(validateExtraction("not json")).toBeNull();
    expect(validateExtraction(null)).toBeNull();
  });

  it("fills safe defaults and drops malformed items instead of crashing", () => {
    const r = validateExtraction({
      product: "bnpl",
      values: [{ id: "price" }, "junk", { id: "n", value: "3", quote: "3 payments", confidence: "certain" }, { id: "apr", value: "29.9", quote: "  " }],
      conditions: [{ title: "No quote" }, { kind: "made_up", title: "Late fee", quote: "£5 per missed payment" }],
      prominence: { monthly_payment: "huge" },
    });
    expect(r?.values).toEqual([{ id: "n", value: "3", quote: "3 payments", confidence: "medium" }]);
    expect(r?.conditions).toHaveLength(1);
    expect(r?.conditions[0].kind).toBe("other");
    expect(r?.prominence?.monthly_payment).toBe("absent");
    expect(r?.stated).toEqual({ monthly: "", monthly_quote: "", total: "", total_quote: "" });
    expect(r?.contradictions).toEqual([]);
  });

  it("drops values that don't show the words they came from", () => {
    const r = validateExtraction({ product: "loan", values: [{ id: "apr", value: "29.9", quote: "", confidence: "high" }, { id: "term", value: "36", confidence: "high" }] });
    expect(r?.values).toEqual([]);
  });

  it("strips additionalProperties at every depth for Gemini", () => {
    const s = forGemini({ type: "object", additionalProperties: false, properties: { a: { type: "object", additionalProperties: false, properties: {} } } });
    expect(JSON.stringify(s)).not.toContain("additionalProperties");
  });
});
