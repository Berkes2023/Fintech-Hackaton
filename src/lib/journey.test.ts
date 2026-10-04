import { describe, expect, it } from "vitest";
import { snapshot } from "./consequence";
import { simulate } from "./finance";
import { amortise, applyLevers, changesFromPlan, DEFAULT_SITUATION, future, growth, offers, situationFromPicture, summarise, type Situation } from "./journey";
import { blankPicture, simulateMonths, withAmount, type FutureEvent, type Picture } from "./sim";

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

  it("takes no credit answer, so every example rate comes from one fixed illustrative table", () => {
    expect(Object.keys(DEFAULT_SITUATION)).not.toContain("tier");
    // Provider A personal loan, B hire purchase, C PCP, D personal loan +1%.
    expect(offers(car).map((o) => o.apr)).toEqual([9.9, 10.9, 11.9, 10.9]);
  });

  it("never adds a note about which lenders might offer it", () => {
    const goals: Situation["goal"][] = ["car", "home", "improve", "borrow", "purchase", "education"];
    const notes = goals.flatMap((goal) => offers({ ...car, goal }).flatMap((o) => o.notes)).join(" ");
    expect(notes).not.toMatch(/credit score|credit history|lenders may offer/i);
  });
});

describe("situation from Plan", () => {
  // The brief's demo month: £2,500 in, £670 estimated monthly remaining.
  const demo = (): Picture => {
    const p = blankPicture();
    return {
      ...p,
      income: withAmount(p.income, "salary", 2500),
      essentials: withAmount(withAmount(withAmount(withAmount(p.essentials, "rent", 850), "bills", 200), "food", 220), "transport", 100),
      discretionary: withAmount(withAmount(p.discretionary, "subs", 40), "fun", 40),
      debts: withAmount(p.debts, "loan", 180),
      reserves: { savings: 5000, emergency: 0 },
      otherSaving: withAmount(p.otherSaving, "regular", 200),
    };
  };

  it("maps the Plan picture onto the simplified wizard’s money step", () => {
    expect(situationFromPicture(demo())).toEqual({ income: 2500, housing: 850, bills: 600, commitments: 380, savings: 5000 });
  });

  it("leaves the same monthly remaining as the Plan snapshot", () => {
    const s = situationFromPicture(demo());
    expect(s.income - s.housing - s.bills - s.commitments).toBe(snapshot(demo()).remaining);
  });

  it("counts savings and emergency money together, and an empty picture as zeros", () => {
    expect(situationFromPicture({ ...demo(), reserves: { savings: 1500, emergency: 500 } }).savings).toBe(2000);
    expect(situationFromPicture(blankPicture())).toEqual({ income: 0, housing: 0, bills: 0, commitments: 0, savings: 0 });
  });

  it("carries the person’s own Plan events and loan end into the wizard, never the example changes", () => {
    const p = { ...demo(), debts: demo().debts.map((d) => (d.id === "loan" ? { ...d, endsIn: 5 } : d)) };
    const events: FutureEvent[] = [
      { id: "bonus", label: "Bonus", amount: 3000, month: 1, direction: "in", recurrence: "one_off" },
      { id: "fix", label: "Car repair", amount: 400, month: 2, direction: "out", recurrence: "one_off" },
      { id: "rent", label: "Rent increase", amount: 100, month: 6, direction: "out", recurrence: "recurring_from" },
      { id: "pay", label: "Pay rise", amount: 150, month: 3, direction: "in", recurrence: "recurring_from" },
      { id: "sub", label: "Gym", amount: 30, month: 4, direction: "out", recurrence: "stops_from" },
      { id: "side", label: "Side job", amount: 200, month: 7, direction: "in", recurrence: "stops_from" },
    ];
    expect(changesFromPlan(p, events)).toEqual([
      { id: "bonus", kind: "in_once", label: "Bonus", amount: 3000, month: 1 },
      { id: "fix", kind: "out_once", label: "Car repair", amount: 400, month: 2 },
      { id: "rent", kind: "cost_change", label: "Rent increase", amount: 100, month: 6 },
      { id: "pay", kind: "income_change", label: "Pay rise", amount: 150, month: 3 },
      { id: "sub", kind: "cost_change", label: "Gym", amount: -30, month: 4 },
      { id: "side", kind: "income_change", label: "Side job", amount: -200, month: 7 },
      { id: "end-loan", kind: "commitment_ends", label: "End of loan repayments", amount: 180, month: 5 },
    ]);
    expect(changesFromPlan(demo(), [])).toEqual([]);
  });

  it("the wizard’s months match Plan’s once the changes come across", () => {
    const p = { ...demo(), debts: demo().debts.map((d) => (d.id === "loan" ? { ...d, endsIn: 5 } : d)) };
    const events: FutureEvent[] = [{ id: "rent", label: "Rent increase", amount: 100, month: 6, direction: "out", recurrence: "recurring_from" }];
    const s: Situation = { ...DEFAULT_SITUATION, ...situationFromPicture(p), savingsRate: 0, changes: changesFromPlan(p, events) };
    const wiz = future(s, [], 8).map((r) => r.normalLeft);
    const plan = simulateMonths(p, events, null, 8).map((r) => r.normalLeft);
    expect(wiz).toEqual(plan);
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
