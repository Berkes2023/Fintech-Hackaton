import { describe, expect, it } from "vitest";
import {
  aprScenarios, changePoints, compareRows, depositConsequence, keyMoments, paymentConsequence, savingsConsequence, scenarioRow, snapshot,
  termConsequence, VERDICT_WORDS, type Snapshot,
} from "./consequence";
import { applyLevers, blankPicture, simulateMonths, withAmount, type FutureEvent, type Picture, type Scenario } from "./sim";

// The example from the brief: £2,500 in, £1,450 regular outgoings, £180 debt, £200 saving/pension → £670 left.
function alex(): Picture {
  const p = blankPicture();
  return {
    ...p,
    income: withAmount(p.income, "salary", 2500),
    essentials: withAmount(withAmount(withAmount(withAmount(p.essentials, "rent", 850), "bills", 230), "food", 250), "transport", 120),
    debts: withAmount(p.debts, "loan", 180).map((d) => (d.id === "loan" ? { ...d, endsIn: 5 } : d)),
    otherSaving: withAmount(p.otherSaving, "regular", 75),
    pension: { amount: 125, alreadyDeducted: false, employer: 0 },
    reserves: { savings: 5000, emergency: 0 },
  };
}
const sc = (amount: number, apr = 9.9, term = 48, startIn = 0): Scenario => ({ id: "s", label: "Scenario", source: "illustrative", amount, apr, term, upfrontFee: 0, monthlyFee: 0, balloon: 0, startIn, fieldSources: {} });
const allSentences = (xs: string[]) => { for (const x of xs) expect(x).not.toMatch(VERDICT_WORDS); };

describe("your situation today", () => {
  it("works out the snapshot line by line", () => {
    const s = snapshot(alex());
    expect(s).toMatchObject({ income: 2500, essentials: 1450, otherSpending: 0, debt: 180, commitments: 200, remaining: 670, buffer: 5000 });
    expect(s.debtPct).toBe(7.2);
    expect(s.monthsOfEssentials).toBe(3.4); // 5000 / 1450
    expect(s.lines.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(670, 2);
  });

  it("handles zero income without dividing by zero", () => {
    const s = snapshot(blankPicture());
    expect(s.debtPct).toBeNull();
    expect(s.monthsOfEssentials).toBeNull();
    const c = paymentConsequence(s, 420);
    expect(c.pctOfIncome).toBeNull();
    expect(c.pctOfFlexibility).toBeNull();
    expect(c.sentences.join(" ")).toMatch(/haven’t told us about any income/);
  });
});

describe("what a payment changes", () => {
  const s = snapshot(alex());

  it("£420 takes £670 to £250: 16.8% of income and 62.7% of monthly flexibility", () => {
    const c = paymentConsequence(s, 420);
    expect([c.before, c.after, c.change, c.pctOfIncome, c.pctOfFlexibility]).toEqual([670, 250, -420, 16.8, 62.7]);
    expect(c.debtPctBefore).toBe(7.2);
    expect(c.debtPctAfter).toBe(24); // (180 + 420) / 2500
    expect(c.sentences[0]).toBe("This would reduce your estimated monthly remaining from £670 to £250.");
    allSentences(c.sentences);
  });

  it("compares with the buffer the person chose, never with a made-up threshold", () => {
    expect(paymentConsequence(s, 420, 300).bufferGap).toBe(-50);
    expect(paymentConsequence(s, 420, 300).sentences.at(-1)).toBe("That’s £50 below the £300 monthly buffer you said you’d like to keep.");
    expect(paymentConsequence(s, 420, 200).sentences.at(-1)).toMatch(/£50 above the £200/);
    expect(paymentConsequence(s, 420).bufferGap).toBeNull();
  });

  it("zero remaining and negative remaining are described plainly", () => {
    const zero: Snapshot = { ...s, remaining: 0 };
    expect(paymentConsequence(zero, 100).pctOfFlexibility).toBeNull();
    expect(paymentConsequence(zero, 100).sentences.join(" ")).toMatch(/already meet or exceed/);
    const neg: Snapshot = { ...s, remaining: -50 };
    expect(paymentConsequence(neg, 100).after).toBe(-150);
    expect(paymentConsequence({ ...s, remaining: 300 }, 420).sentences.join(" ")).toMatch(/£120 more than the £300 currently left/);
  });

  it("rounds percentages to one decimal place", () => {
    expect(paymentConsequence(s, 100).pctOfIncome).toBe(4);
    expect(paymentConsequence(s, 333.33).pctOfFlexibility).toBe(49.8); // 333.33 / 670 = 49.75…
  });
});

describe("what a deposit does to savings", () => {
  it("a deposit that uses all the savings", () => {
    expect(savingsConsequence(5000, 5000)).toMatchObject({ after: 0, usedPct: 100, shortfall: 0, sentence: "Using £5,000 as a deposit would leave no cash savings from the amount you’ve told us about." });
  });
  it("a deposit larger than the savings entered", () => {
    expect(savingsConsequence(3000, 5000)).toMatchObject({ after: 0, shortfall: 2000 });
  });
  it("zero savings", () => {
    expect(savingsConsequence(0, 2000).sentence).toMatch(/haven’t told us about any savings/);
    expect(savingsConsequence(0, 2000).usedPct).toBeNull();
  });
  it("part of the savings", () => {
    expect(savingsConsequence(5000, 3000)).toMatchObject({ after: 2000, usedPct: 60 });
  });
});

describe("comparing scenarios", () => {
  const s = snapshot(alex());

  it("APR scenarios 8%, 12%, 18% on £20,000 over 48 months", () => {
    const { rows, note } = aprScenarios(s, 20000, 48);
    expect(rows.map((r) => r.apr)).toEqual([8, 12, 18]);
    expect(rows[0].monthly).toBeLessThan(rows[1].monthly);
    expect(rows[1].monthly).toBeLessThan(rows[2].monthly);
    for (const r of rows) expect(r.remainingAfter).toBeCloseTo(670 - r.monthly, 2);
    expect(note).toMatch(/^The 18% scenario would cost approximately £[\d,]+ more than the 8% scenario/);
    allSentences([note]);
  });

  it("a longer term: smaller payment, longer commitment, more cost, all said", () => {
    const t = termConsequence(s, 20000, 9.9, 36, 60);
    expect(t.b.monthly).toBeLessThan(t.a.monthly);
    expect(t.b.cost).toBeGreaterThan(t.a.cost);
    expect(t.sentences.join(" ")).toMatch(/smaller monthly payment.*24 months longer.*more overall/);
    allSentences(t.sentences);
  });

  it("offer A vs offer B, both sides", () => {
    const a = scenarioRow(s, { ...sc(20000, 8.9, 48), label: "Offer A" });
    const b = scenarioRow(s, { ...sc(20000, 10.9, 60), label: "Offer B" });
    const said = compareRows(a, b).join(" ");
    expect(said).toMatch(/Offer B has a smaller monthly payment/);
    expect(said).toMatch(/12 months longer/);
    expect(said).toMatch(/more overall/);
  });

  it("a lower purchase price lowers payment and cost", () => {
    const full = scenarioRow(s, sc(20000)), cheaper = scenarioRow(s, sc(17000));
    expect(cheaper.monthly).toBeLessThan(full.monthly);
    expect(cheaper.cost).toBeLessThan(full.cost);
  });

  it("a larger deposit: less borrowing, but less cash now", () => {
    const d = depositConsequence(s, 25000, 9.9, 48, 5000, 8000);
    expect(d.a.financed).toBe(20000);
    expect(d.b.financed).toBe(17000);
    expect(d.b.monthly).toBeLessThan(d.a.monthly);
    expect(d.a.savingsAfter).toBe(0);
    expect(d.b.savingsAfter).toBe(0); // £8,000 deposit is more than the £5,000 savings
    expect(d.sentences.join(" ")).toMatch(/reduces the amount financed by £3,000.*But it uses £3,000 more cash now/);
  });
});

describe("what changes over time", () => {
  const p = alex();
  const months = (m: number) => `month ${m}`;
  const bonus: FutureEvent = { id: "b", label: "Bonus", amount: 3000, month: 1, direction: "in", recurrence: "one_off" };

  it("an existing loan ending is a change point with its reason", () => {
    const rows = simulateMonths(p, [], sc(20000), 12);
    const cps = changePoints(p, [], sc(20000), rows, months);
    expect(cps[0].m).toBe(5);
    expect(cps[0].after - cps[0].before).toBeCloseTo(180, 2);
    expect(cps[0].sentence).toMatch(/^Your situation changes in month 5 because the £180 a month loan repayments you told us about end:/);
  });

  it("a one-off bonus is not a change in the regular month", () => {
    const rows = simulateMonths(p, [bonus], sc(20000), 6);
    expect(changePoints(p, [bonus], sc(20000), rows, months).map((c) => c.m)).toEqual([5]);
    expect(rows[0].left - rows[0].normalLeft).toBe(3000);
  });

  it("an income change and an expense increase show up when they start", () => {
    const pay: FutureEvent = { id: "p", label: "Pay rise", amount: 150, month: 3, direction: "in", recurrence: "recurring_from" };
    const rent: FutureEvent = { id: "r", label: "Rent increase", amount: 100, month: 7, direction: "out", recurrence: "recurring_from" };
    const rows = simulateMonths(p, [pay, rent], null, 10);
    const cps = changePoints(p, [pay, rent], null, rows, months);
    expect(cps.map((c) => [c.m, Math.round(c.after - c.before)])).toEqual([[3, 150], [5, 180], [7, -100]]);
    const dip = applyLevers({ picture: p, events: [], scenario: sc(20000) }, ["incomeDip"]);
    expect(simulateMonths(dip.picture, dip.events, dip.scenario, 2)[0].recurringIn).toBe(2000);
  });

  it("key moments come in order, ending with the finance", () => {
    const m = keyMoments(p, [bonus], sc(20000), 5000, months);
    expect(m.map((x) => x.label)).toEqual(["Deposit paid", "First car payment", "Bonus (one-off)", "Loan repayments end", "Car finance ends after 48 months"]);
  });
});
