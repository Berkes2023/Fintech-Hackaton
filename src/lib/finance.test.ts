import { describe, expect, it } from "vitest";
import { defaults, EXAMPLES, risks, simulate } from "./finance";

const close = (a: number, b: number, tol = 0.02) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe("loan", () => {
  it("matches the standard annuity formula", () => {
    // £1,200 over 24 months at 19.9% APR -> monthly rate from APR, then annuity.
    const m = simulate("loan", { amount: 1200, apr: 19.9, term: 24, fee: 0, lateFee: 12 });
    const r = Math.pow(1.199, 1 / 12) - 1;
    const pay = (1200 * r) / (1 - Math.pow(1 + r, -24));
    close(m.regular, pay);
    close(m.total, pay * 24, 0.05);
    close(m.s[m.s.length - 1].bal, 0);
    expect(m.end).toBe(24);
  });

  it("counts the arrangement fee as cost and as an upfront payment", () => {
    const m = simulate("loan", { amount: 1000, apr: 0, term: 10, fee: 50 });
    close(m.total, 1050);
    close(m.onTop, 50);
    close(m.next3, 50 + 100 * 3); // fee up front + three monthly payments
  });

  it("counts three payments in the first three months for every product", () => {
    expect(simulate("card", { balance: 1200, apr: 24.9, intro: 0, payType: "fixed", fixedPay: 50 }).next3).toBeCloseTo(150, 2);
    expect(simulate("bnpl", EXAMPLES[0].values).next3).toBeCloseTo(1200, 2);
    expect(simulate("subscription", { monthly: 10, introPrice: 10, introMonths: 0, rise: 0, years: 1 }).next3).toBeCloseTo(30, 2);
    expect(simulate("household", { monthly: 30, upfront: 50, term: 24, riseAmt: 0 }).next3).toBeCloseTo(140, 2);
  });

  it("charges nothing extra at 0% APR", () => {
    const m = simulate("loan", { amount: 600, apr: 0, term: 6, fee: 0 });
    close(m.onTop, 0);
    close(m.regular, 100);
  });
});

describe("credit card", () => {
  it("flags a payment that never clears the balance", () => {
    const m = simulate("card", { balance: 5000, apr: 30, intro: 0, payType: "fixed", fixedPay: 50 });
    expect(m.never).toBe(true);
    expect(risks("card", { balance: 5000, apr: 30, payType: "fixed", fixedPay: 50 }, m)[0].lvl).toBe("high");
  });

  it("takes far longer on minimum payments than a fixed amount", () => {
    const min = simulate("card", { balance: 1200, apr: 24.9, intro: 0, payType: "min" });
    const fixed = simulate("card", { balance: 1200, apr: 24.9, intro: 0, payType: "fixed", fixedPay: 50 });
    expect(min.end).toBeGreaterThan(fixed.end);
    expect(min.interest).toBeGreaterThan(fixed.interest);
  });

  it("charges no interest during the 0% period", () => {
    const m = simulate("card", { balance: 1200, apr: 24.9, intro: 12, payType: "fixed", fixedPay: 100 });
    expect(m.s.slice(0, 12).every((p) => p.interest === 0)).toBe(true);
    close(m.onTop, 0);
  });
});

describe("BNPL", () => {
  it("is interest-free when paid on time", () => {
    const m = simulate("bnpl", EXAMPLES[0].values);
    close(m.total, 1200);
    close(m.regular, 400);
    expect(m.s[0].t).toBe(0); // first instalment at checkout
  });

  it("adds late fees in the missed-payment stress test", () => {
    const m = simulate("bnpl", { ...EXAMPLES[0].values, missed: 2 });
    close(m.fees, 10);
    close(m.total, 1210);
  });
});

describe("bills", () => {
  it("compares a subscription against its advertised price", () => {
    const m = simulate("subscription", { monthly: 10, introPrice: 5, introMonths: 3, rise: 0, years: 1 });
    close(m.total, 5 * 3 + 10 * 9);
    close(m.onTop, 105 - 60); // advertised = £5 x 12
  });

  it("applies yearly pound-and-pence rises to a contract", () => {
    const m = simulate("household", { monthly: 30, upfront: 0, term: 24, riseAmt: 3, exitFee: 0 });
    close(m.total, 30 * 12 + 33 * 12);
    close(m.onTop, 36);
  });
});

describe("defaults", () => {
  it("every product simulates from its defaults without NaN", () => {
    for (const t of ["loan", "card", "overdraft", "bnpl", "subscription", "household"] as const) {
      const m = simulate(t, defaults(t));
      expect(Number.isFinite(m.total)).toBe(true);
      expect(m.s.length).toBeGreaterThan(0);
    }
  });
});
