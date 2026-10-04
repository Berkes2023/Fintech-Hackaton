import { describe, expect, it } from "vitest";
import { simulate } from "./finance";
import {
  applyLevers, BANNED, blankPicture, carScenario, EMPTY_CAR, eventLine, eventTag, exampleCar, illustrativeProviders, habit, hiddenCost, impact, position, recurringIncome, schedule,
  simulateMonths, statements, toMonthly, type FutureEvent, type Picture, type Scenario,
} from "./sim";

const close = (a: number, b: number, tol = 0.05) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
const item = (label: string, amount: number, extra = {}) => ({ id: label, label, amount, freq: "monthly" as const, origin: "manual" as const, ...extra });

const picture: Picture = {
  income: [item("Salary", 2500)],
  essentials: [item("Rent", 850), item("Bills", 400)],
  discretionary: [item("Eating out", 250)],
  debts: [{ ...item("Old loan", 180, { endsIn: 5 }), kind: "loan" }],
  reserves: { savings: 1500, emergency: 500 },
  pension: { amount: 120, alreadyDeducted: true },
  otherSaving: [],
};
const events: FutureEvent[] = [
  { id: "b", label: "Bonus", amount: 3000, month: 2, direction: "in", recurrence: "one_off" },
  { id: "r", label: "Rent rise", amount: 100, month: 6, direction: "out", recurrence: "recurring_from" },
];
const car: Scenario = { id: "a", label: "A", source: "illustrative", amount: 20000, apr: 8.9, term: 48, upfrontFee: 0, monthlyFee: 0, balloon: 0, startIn: 0, fieldSources: {}, lateFee: 15 };

describe("financial picture", () => {
  it("shows the monthly position line by line", () => {
    const p = position(picture);
    expect(p.value).toBe(2500 - 850 - 400 - 250 - 180);
    expect(p.lines.find((l) => l.label === "Salary")?.source).toBe("you_told_us");
  });

  it("doesn't count a pension already taken from take-home pay", () => {
    expect(position(picture).lines.some((l) => l.label === "Pension contribution")).toBe(false);
    expect(position({ ...picture, pension: { amount: 120, alreadyDeducted: false } }).value).toBe(position(picture).value - 120);
  });

  it("converts weekly and yearly amounts to monthly", () => {
    close(toMonthly(8 * 4, "weekly"), 138.67, 0.01);
    expect(toMonthly(1200, "yearly")).toBe(100);
  });
});

describe("one-off money is never recurring", () => {
  it("a £3,000 bonus leaves recurring income at the salary", () => {
    const rows = simulateMonths(picture, events, null, 3);
    expect(recurringIncome(picture)).toBe(2500);
    expect(rows[1].recurringIn).toBe(2500);
    expect(rows[1].oneOffIn).toBe(3000);
    expect(rows[1].left - rows[1].normalLeft).toBe(3000);
  });

  it("applies dated changes: a loan ending and a rent rise", () => {
    const rows = simulateMonths(picture, events, null, 8);
    expect(rows[4].existingDebt).toBe(0); // old loan stops in month 5
    expect(rows[3].existingDebt).toBe(180);
    expect(rows[5].recurringOut - rows[4].recurringOut).toBe(100);
  });
});

describe("finance scenarios", () => {
  it("matches the main loan engine", () => {
    close(schedule(car).total, simulate("loan", { amount: 20000, apr: 8.9, term: 48, fee: 0 }).total, 0.05);
  });

  it("includes upfront fees and a balloon in the totals", () => {
    const withFee = schedule({ ...car, upfrontFee: 199 });
    close(withFee.total - schedule(car).total, 199, 0.01);
    const pcp = schedule({ ...car, balloon: 8000 });
    expect(pcp.regular).toBeLessThan(schedule(car).regular);
    expect(pcp.payments.at(-1)!).toBeGreaterThan(8000);
  });

  it("an upfront fee is a one-off cost, not part of the regular monthly position", () => {
    const rows = simulateMonths(picture, [], { ...car, upfrontFee: 199 }, 2);
    const plain = simulateMonths(picture, [], car, 2);
    expect(rows[0].normalLeft).toBeCloseTo(plain[0].normalLeft, 2);
    expect(rows[0].oneOffOut).toBe(199);
    expect(rows[0].left).toBeCloseTo(plain[0].left - 199, 2);
  });

  it("a delayed start pushes the first payment back", () => {
    expect(schedule({ ...car, startIn: 2 }).payments.slice(0, 3).map((x) => x > 0)).toEqual([false, false, true]);
  });

  it("offers three fictional providers that finance price minus deposit, whatever the credit profile", () => {
    const ps = illustrativeProviders({ price: 25000, deposit: 5000, saved: 0 });
    expect(ps).toHaveLength(3);
    expect(ps.every((p) => p.amount === 20000 && p.source === "illustrative" && /fictional/.test(p.provider ?? ""))).toBe(true);
    expect(new Set(ps.map((p) => p.apr)).size).toBe(3);
  });

  it("Provider B on £20,000 is about £420 a month, as the story says", () => {
    close(schedule(illustrativeProviders({ price: 25000, deposit: 5000, saved: 0 })[1]).regular, 419.4, 1);
  });
});

describe("impact and hidden cost", () => {
  it("connects the payment to income", () => {
    const i = impact(picture, car);
    close(i.after, position(picture).value - i.payment, 0.01);
    close(i.pctOfIncome, (i.payment / 2500) * 100, 0.01);
    expect(i.totalCommitments).toBeCloseTo(180 + i.payment, 1);
  });

  it("splits hidden cost into contract, cash flow and cumulative", () => {
    const h = hiddenCost(picture, events, car);
    expect(h.contract.totalCost).toBeGreaterThan(0);
    expect(h.cashflow.bufferAfter12).toBeLessThan(h.cashflow.bufferAfter12Without);
    expect(h.cumulative.at24).toBeGreaterThan(h.cumulative.at12);
  });

  it("repeated spending adds up: £8 four times a week", () => {
    expect(habit(8, 4)).toEqual({ week: 32, month: 138.67, year: 1664 });
  });
});

describe("what if", () => {
  const c = { picture, events, scenario: car };
  it("waiting for the bonus lowers the amount and delays the start", () => {
    const w = applyLevers(c, ["waitBonus"]);
    expect(w.scenario.amount).toBe(17000);
    expect(w.scenario.startIn).toBe(2);
    expect(w.events.some((e) => e.id === "b")).toBe(false);
  });

  it("an income dip lasts three months, then recovers", () => {
    const w = applyLevers(c, ["incomeDip"]);
    const rows = simulateMonths(w.picture, w.events, w.scenario, 5);
    expect(rows[0].recurringIn).toBe(2000);
    expect(rows[3].recurringIn).toBe(2500);
  });

  it("APR and term levers move the totals the right way", () => {
    expect(schedule(applyLevers(c, ["aprUp"]).scenario).total).toBeGreaterThan(schedule(car).total);
    expect(schedule(applyLevers(c, ["term60"]).scenario).regular).toBeLessThan(schedule(car).regular);
  });
});

describe("careful wording", () => {
  it("speaks conditionally about a buffer running out, and never gives a verdict", () => {
    const tight: Picture = { ...picture, income: [item("Salary", 1900)] };
    const rows = simulateMonths(tight, [], car, 24);
    const said = statements(rows, 2000, (m) => `month ${m}`);
    expect(said.join(" ")).toMatch(/Under the assumptions you’ve entered/);
    expect(said.join(" ")).toMatch(/would reach about £0 around month/);
    for (const s of said) expect(s).not.toMatch(BANNED);
  });
});

describe("the /check car journey", () => {
  const user = () => {
    const st = exampleCar();
    return { ...st, events: [{ id: "b", label: "Bonus", amount: 3000, month: 1, direction: "in" as const, recurrence: "one_off" as const }] };
  };

  it("starts empty, with every fixed question at zero", () => {
    expect(EMPTY_CAR.purchase.price).toBe(0);
    expect(position(EMPTY_CAR.picture).value).toBe(0);
    expect(blankPicture().debts.map((d) => d.id)).toEqual(["loan", "card", "carfin", "bnpl", "overdraft"]);
  });

  it("finances price minus deposit, at the example rate for the profile until the person changes it", () => {
    const sc = carScenario(user());
    expect(sc.amount).toBe(20000);
    expect(sc.apr).toBe(9.9);
    expect(carScenario({ ...user(), finance: { amount: null, apr: 12, term: 60, fee: 0 } }).apr).toBe(12);
  });

  it("shows a £3,000 bonus as one-off income, in one month only", () => {
    const st = user();
    expect(eventLine(st.events[0], () => "x")).toBe("£3,000 bonus next month — ONE-OFF INCOME");
    expect(eventTag(st.events[0])).toBe("ONE-OFF INCOME");
    const rows = simulateMonths(st.picture, st.events, carScenario(st), 3);
    expect(rows[0].oneOffs).toEqual([{ label: "Bonus", amount: 3000 }]);
    expect(rows[1].oneOffs).toEqual([]);
    expect(rows[0].recurringIn).toBe(rows[1].recurringIn);
  });

  it("waiting for the bonus moves it into the deposit only when chosen: £20,000 → £17,000", () => {
    const st = user();
    const base = { picture: st.picture, events: st.events, scenario: carScenario(st) };
    expect(applyLevers(base, []).scenario.amount).toBe(20000);
    const w = applyLevers(base, ["waitBonus"]);
    expect(w.scenario.amount).toBe(17000);
    expect(w.events.some((e) => e.label === "Bonus")).toBe(false);
  });

  it("'APR becomes 12%' and the adjustable rent and salary what-ifs rerun the simulation", () => {
    const st = user();
    const base = { picture: st.picture, events: st.events, scenario: carScenario(st) };
    expect(applyLevers(base, ["apr12"]).scenario.apr).toBe(12);
    const r = applyLevers(base, ["rentUp", "salaryUp"], { rent: 200, salary: -300 });
    const rows = simulateMonths(r.picture, r.events, r.scenario, 1);
    const plain = simulateMonths(st.picture, st.events, base.scenario, 1);
    expect(rows[0].normalLeft).toBeCloseTo(plain[0].normalLeft - 500, 2);
    expect(applyLevers(base, ["loanEnds"]).picture.debts.find((d) => d.id === "loan")).toBeUndefined();
  });
});

describe("partial bonus and a cheaper car", () => {
  const p0: Picture = { ...picture };
  const ev: FutureEvent[] = [{ id: "b", label: "Bonus", amount: 3000, month: 1, direction: "in", recurrence: "one_off" }];
  it("uses only the chosen part of a bonus, and the rest still arrives as one-off income", () => {
    const w = applyLevers({ picture: p0, events: ev, scenario: car }, ["waitBonus"], { rent: 100, salary: 150, bonus: 1000 });
    expect(w.scenario.amount).toBe(19000);
    expect(w.events[0].amount).toBe(2000);
    expect(applyLevers({ picture: p0, events: ev, scenario: car }, ["waitBonus"], { rent: 100, salary: 150, bonus: 9999 }).scenario.amount).toBe(17000);
  });
  it("a £3,000 cheaper car finances £3,000 less", () => {
    expect(applyLevers({ picture: p0, events: [], scenario: car }, ["carCheaper"]).scenario.amount).toBe(17000);
  });
});
