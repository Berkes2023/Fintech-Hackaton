import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { boeDate, joinMonthly, monthlyLast } = await import("./rates");

const fred = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);

describe("rates", () => {
  it("parses Bank of England dates", () => {
    expect(boeDate("01 Oct 2026")).toBe("2026-10-01");
    expect(boeDate("nonsense")).toBeNull();
  });

  it("keeps the last value in each month and skips FRED's '.' gaps", () => {
    const { series, lastDate } = monthlyLast("DATE,X\n2024-01-02,1.0\n2024-01-30,1.5\n2024-02-01,.\n2024-02-15,2.0\n", fred);
    expect(series.get("2024-01")).toBe(1.5);
    expect(series.get("2024-02")).toBe(2.0);
    expect(lastDate).toBe("2024-02-15");
  });

  it("forward-fills across months and computes the differentials", () => {
    const boe = new Map([["2006-12", 5], ["2007-03", 5.25]]);
    const fed = new Map([["2007-01", 5.25], ["2007-02", 5.26], ["2007-03", 5.26]]);
    const ecb = new Map([["2006-12", 2.5], ["2007-03", 2.75]]);
    const pts = joinMonthly(boe, fed, ecb, "2007-01");
    expect(pts.map((p) => p.month)).toEqual(["2007-01", "2007-02", "2007-03"]);
    expect(pts[1]).toMatchObject({ boe: 5, fed: 5.26, ecb: 2.5, ukUs: -0.26, ukEu: 2.5 });
    expect(pts[2]).toMatchObject({ boe: 5.25, ecb: 2.75, ukEu: 2.5 });
  });
});
