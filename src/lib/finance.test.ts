import { describe, expect, it } from "vitest";
import { money } from "./format";
import { crossCheck, defaults, EXAMPLES, explain, levers, moneyLabel, PRODUCT_TYPES, risks, scenarios, simulate, stressTest, twin, understandingCheck } from "./finance";

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

describe("what-if", () => {
  it("overpaying a loan finishes sooner and saves interest", () => {
    const v = { amount: 5000, apr: 12.9, term: 36, fee: 0 };
    const base = simulate("loan", v);
    const extra = simulate("loan", v, 50);
    expect(extra.end).toBeLessThan(base.end);
    expect(extra.interest).toBeLessThan(base.interest);
    close(extra.s[extra.s.length - 1].bal, 0);
  });

  it("matches the worked example: £5,000 at 12.9% APR over 36 months", () => {
    const m = simulate("loan", { amount: 5000, apr: 12.9, term: 36, fee: 0 });
    close(m.regular, 166.58, 0.5);
    close(m.total, 5997, 5);
  });

  it("a longer term lowers the monthly payment but raises the total", () => {
    const short = simulate("loan", { amount: 5000, apr: 12.9, term: 36 });
    const long = simulate("loan", { amount: 5000, apr: 12.9, term: 48 });
    expect(long.regular).toBeLessThan(short.regular);
    expect(long.total).toBeGreaterThan(short.total);
  });
});

describe("money label and understanding check", () => {
  it("puts total and cost of borrowing on the label", () => {
    const v = EXAMPLES[2].values;
    const m = simulate("loan", v);
    const label = moneyLabel("loan", v, m);
    expect(label.rows.find((r) => r.label === "You pay back")?.value).toBe(money(m.total));
    expect(label.parts.map((p) => p.label)).toEqual(["Borrowed", "Interest"]);
  });

  it("has exactly one right answer, and it's the total", () => {
    const v = EXAMPLES[1].values;
    const m = simulate("card", v);
    const q = understandingCheck("card", v, m)!;
    expect(q.options.filter((o) => o.correct)).toHaveLength(1);
    expect(q.options.find((o) => o.correct)?.label).toBe(money(Math.round(m.total)));
  });

  it("asks about late fees when a plan is interest-free", () => {
    const m = simulate("bnpl", EXAMPLES[0].values);
    expect(understandingCheck("bnpl", EXAMPLES[0].values, m)?.question).toMatch(/on top/);
  });
});

describe("digital twin", () => {
  const loan = { amount: 5000, apr: 12.9, term: 36, fee: 0, lateFee: 12 };
  const card = EXAMPLES[1].values;

  it("with no events, matches the main simulator for every balance product", () => {
    close(twin("loan", loan).total, simulate("loan", loan).total, 0.05);
    close(twin("card", card).total, simulate("card", card).total, 0.05);
    const od = defaults("overdraft");
    close(twin("overdraft", od).total, simulate("overdraft", od).total, 0.05);
  });

  it("a missed payment costs the late fee plus extra interest, and finishes later", () => {
    const base = twin("loan", loan), miss = twin("loan", loan, { missed: [3] });
    expect(miss.total).toBeGreaterThan(base.total + 12);
    expect(miss.end).toBeGreaterThan(base.end);
  });

  it("a rate rise on a loan raises the cost but keeps the end date", () => {
    const base = twin("loan", loan), rise = twin("loan", loan, { rateRise: { from: 13, by: 3 } });
    expect(rise.total).toBeGreaterThan(base.total);
    expect(rise.end).toBe(base.end);
  });

  it("offers five scenarios for balance products and none for bills", () => {
    expect(scenarios("loan", loan).map((s) => s.id)).toEqual(["normal", "missed", "break", "rate", "extra"]);
    expect(scenarios("subscription", defaults("subscription"))).toEqual([]);
  });
});

describe("stress test, levers and cross-check", () => {
  it("works out what's left each month", () => {
    const rows = stressTest({ income: 2000, essentials: 1250, existing: 300, payment: 220 });
    expect(rows.map((r) => Math.round(r.left))).toEqual([450, 230, 105, 30, -95]);
  });

  it("each lever moves the total the right way", () => {
    const ls = levers("loan", { amount: 5000, apr: 12.9, term: 36, fee: 0 });
    expect(ls.find((l) => l.label.startsWith("APR"))!.delta).toBeLessThan(0);
    expect(ls.find((l) => l.label === "12 months shorter")!.delta).toBeLessThan(0);
    expect(ls.find((l) => l.label === "12 months longer")!.delta).toBeGreaterThan(0);
  });

  it("agrees with a real key facts sheet within a pound", () => {
    // £899 over 12 months at 29.9% APR: the provider states £86.73 a month, £1,040.76 in total.
    const m = simulate("loan", { amount: 899, apr: 29.9, term: 12, fee: 0 });
    const checks = crossCheck(m, { monthly: 86.73, total: 1040.76 });
    expect(checks.every((c) => c.matches)).toBe(true);
  });

  it("flags a stated total that doesn't add up", () => {
    const m = simulate("loan", { amount: 899, apr: 29.9, term: 12, fee: 0 });
    expect(crossCheck(m, { total: 950 })[0].matches).toBe(false);
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

describe("plain-English explanation", () => {
  it("states a loan's total as a condition, not a prediction", () => {
    const v = { amount: 5000, apr: 12.9, term: 36, fee: 100 };
    const m = simulate("loan", v);
    const text = explain("loan", v, m).join(" ").replace(/\*\*/g, "");
    expect(text).toContain(`If you make every payment, you’d pay back ${money(m.total)} in total.`);
    expect(text).toContain("including a £100 fee at the start");
  });

  it("never predicts, recommends or gives a verdict, for any product", () => {
    for (const t of PRODUCT_TYPES) {
      const v = defaults(t);
      const text = explain(t, v, simulate(t, v)).join(" ");
      expect(text).not.toMatch(/you will have|recommend|you should|best|\bsafe\b|unsafe|afford/i);
    }
  });
});
