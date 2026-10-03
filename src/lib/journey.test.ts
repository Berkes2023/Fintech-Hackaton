import { describe, expect, it } from "vitest";
import { simulate } from "./finance";
import { amortise, applyLevers, creditImpact, DEFAULT_SITUATION, future, growth, offers, summarise, type Situation } from "./journey";

const close = (a: number, b: number, tol = 0.05) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
const car: Situation = { ...DEFAULT_SITUATION };

describe("amortise", () => {
  it("matches the main loan engine", () => {
    close(amortise(5000, 12.9, 36).total, simulate("loan", { amount: 5000, apr: 12.9, term: 36, fee: 0 }).total);
  });
  it("a lump-sum overpayment saves interest and finishes sooner", () => {
    const base = amortise(10000, 9.9, 48), lump = amortise(10000, 9.9, 48, { month: 5, amount: 1500 });
    expect(lump.interest).toBeLessThan(base.interest);
    expect(lump.payments.length).toBeLessThan(base.payments.length);
  });
});

describe("offers", () => {
  it("shows fictional providers A–D for a £15,000 car loan, and no savings option when savings don't cover it", () => {
    const os = offers(car);
    expect(os.map((o) => o.provider)).toEqual(["Provider A", "Provider B", "Provider C", "Provider D"]);
    expect(os.every((o) => o.financed === 15000)).toBe(true);
  });

  it("a longer term means lower monthly payments but a higher total", () => {
    const os = offers(car);
    const a = os.find((o) => o.id === "a")!, d = os.find((o) => o.id === "d")!;
    expect(d.regular).toBeLessThan(a.regular);
    expect(d.total).toBeGreaterThan(a.total);
  });

  it("PCP has a big optional final payment", () => {
    expect(offers(car).find((o) => o.id === "c")!.balloon).toBeGreaterThan(0);
  });

  it("includes paying from savings when savings cover the price", () => {
    expect(offers({ ...car, goal: "purchase", price: 1500, deposit: 0, savings: 4000 })[0].id).toBe("savings");
  });

  it("a weaker credit score costs more for the same amount", () => {
    const rows = creditImpact(car);
    for (let i = 1; i < rows.length; i++) expect(rows[i].total).toBeGreaterThan(rows[i - 1].total);
  });
});

describe("future months", () => {
  const a = () => offers(car).find((o) => o.id === "a")!;

  it("keeps the bonus out of the normal month and applies dated changes", () => {
    const rows = future(car, a().schedule);
    // month 1: bonus arrives, but the normal position excludes it
    expect(rows[0].oneOffIn).toBe(3000);
    expect(rows[0].left - rows[0].normalLeft).toBe(3000);
    // rent rises from month 3, old loan ends from month 9
    expect(rows[2].recurringOut - rows[1].recurringOut).toBe(100);
    expect(rows[8].recurringOut - rows[7].recurringOut).toBe(-150);
  });

  it("flags months flattered by one-off money", () => {
    const sum = summarise(future(car, a().schedule));
    expect(sum.boosted.map((r) => r.m)).toEqual([1]);
    expect(sum.typicalNormal).toBeLessThan(future(car, a().schedule)[0].left);
  });
});

describe("what if", () => {
  it("putting more down lowers the amount borrowed", () => {
    const { s } = applyLevers(car, ["deposit"]);
    expect(offers(s)[0].financed).toBe(13000);
  });

  it("waiting for the bonus moves it into the deposit and delays the first payment", () => {
    const { s, tw } = applyLevers(car, ["waitBonus"]);
    const o = offers(s, tw)[0];
    expect(o.financed).toBe(12000);
    expect(o.schedule[0]).toBe(0);
    expect(s.changes.some((c) => c.kind === "in_once")).toBe(false);
  });

  it("an income drop reduces what a normal month leaves", () => {
    const o = offers(car)[0];
    const { s } = applyLevers(car, ["income"]);
    expect(future(s, o.schedule)[5].normalLeft).toBeLessThan(future(car, o.schedule)[5].normalLeft);
  });
});

describe("save or invest", () => {
  it("cash with no growth is just what you paid in", () => {
    const pts = growth(1000, 100, 2, "cash");
    expect(pts[0].paidIn).toBe(1000);
    expect(pts[2].paidIn).toBe(1000 + 2400);
    expect(pts[2].mid).toBeGreaterThan(pts[2].paidIn);
  });

  it("riskier choices have a wider range, including losing money", () => {
    const end = growth(1000, 100, 10, "adventurous").at(-1)!;
    expect(end.low).toBeLessThan(end.paidIn);
    expect(end.high).toBeGreaterThan(end.mid);
  });
});
