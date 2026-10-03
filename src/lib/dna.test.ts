import { describe, expect, it } from "vitest";
import { defaults, simulate } from "./finance";
import { commitmentMap, futurePayments, productDNA, questionsToAsk, reverse } from "./dna";

const loan = { amount: 5000, apr: 12.9, term: 36, fee: 0, lateFee: 12 };

describe("product DNA", () => {
  it("describes a loan in the standard schema", () => {
    const dna = productDNA("loan", loan, simulate("loan", loan), ["variable_rate"]);
    expect(dna).toMatchObject({ schema: "before-you-sign/product-dna@1", principal: 5000, term_months: 36, rate: { measure: "APR", value: 12.9, kind: "variable" }, early_repayment: "allowed" });
    expect(dna.total_payable).toBeCloseTo(5995.33, 1);
  });

  it("marks subscriptions as auto-renewing with no APR", () => {
    const v = defaults("subscription");
    expect(productDNA("subscription", v, simulate("subscription", v))).toMatchObject({ auto_renews: true, rate: { measure: null } });
  });
});

describe("questions to ask", () => {
  it("asks for the APR and term when an advert leaves them out", () => {
    const qs = questionsToAsk("loan", loan, { missing: ["apr", "term"], fromDocument: true }).map((q) => q.q);
    expect(qs[0]).toMatch(/APR/);
    expect(qs.some((q) => /How many payments/.test(q))).toBe(true);
    expect(qs.length).toBeLessThanOrEqual(6);
  });

  it("never recommends", () => {
    const all = (["loan", "card", "overdraft", "bnpl", "subscription", "household"] as const)
      .flatMap((t) => questionsToAsk(t, defaults(t), { fromDocument: true, conditionKinds: ["variable_rate", "auto_renewal"] }));
    for (const q of all) expect(`${q.q} ${q.why}`).not.toMatch(/recommend|you should|best/i);
  });
});

describe("reverse calculator", () => {
  it("£150 a month at 0% over 24 months is exactly £3,600", () => {
    expect(reverse(150, 0, [24])[0]).toMatchObject({ principal: 3600, total: 3600, interest: 0 });
  });

  it("round-trips with the loan simulator", () => {
    const row = reverse(166.54, 12.9, [36])[0];
    expect(Math.abs(row.principal - 5000)).toBeLessThan(2);
  });
});

describe("future payments", () => {
  it("dates payments from the start month and marks Christmases", () => {
    const f = futurePayments(simulate("loan", { amount: 1200, apr: 0, term: 24 }), "2026-11");
    expect(f.count).toBe(24);
    expect(f.first).toBe("Dec 2026");
    expect(f.last).toBe("Nov 2028");
    expect(f.milestones[0]).toMatchObject({ label: "Christmas 2026", remaining: 23 });
  });
});

describe("commitment map", () => {
  it("adds up monthly outgoings and future totals, and drops items as they end", () => {
    const map = commitmentMap([
      { id: "a", name: "Phone", type: "household", values: { monthly: 30, upfront: 0, term: 24, riseAmt: 0, exitFee: 0 } },
      { id: "b", name: "Laptop", type: "loan", values: { amount: 1200, apr: 0, term: 12, fee: 0 } },
    ]);
    expect(map.monthlyNow).toBe(130);
    expect(map.futureTotal).toBe(720 + 1200);
    expect(map.byMonth[0]).toBe(130);
    expect(map.byMonth[12]).toBe(30);
  });
});
