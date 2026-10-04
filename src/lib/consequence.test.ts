import { describe, expect, it } from "vitest";
import {
  aprScenarios, changePoints, compareRows, decisionChanges, depositConsequence, keyMoments, paymentConsequence, paymentFigures, savingsConsequence, scenarioRow, snapshot,
  stressScenarios, stressStart, termConsequence, termSentence, waitScenarios, VERDICT_WORDS, type DecisionFigures, type Snapshot,
} from "./consequence";
import { applyLevers, blankPicture, schedule, simulateMonths, withAmount, type FutureEvent, type Picture, type Scenario } from "./sim";

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

  it("£5,000 against £1,400 of essentials is about 3.6 months", () => {
    const p = alex();
    const s = snapshot({ ...p, essentials: withAmount(p.essentials, "transport", 70) });
    expect(s.essentials).toBe(1400);
    expect(s.monthsOfEssentials).toBe(3.6);
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
    expect(c.sentences[0]).toBe("Your estimated monthly remaining would change from £670 to £250 under the information you’ve provided.");
    allSentences(c.sentences);
  });

  it("the six labelled figures, in order", () => {
    expect(paymentFigures(paymentConsequence(s, 420))).toEqual([
      { label: "Proposed payment", value: "£420/month" },
      { label: "Current estimated monthly remaining", value: "£670" },
      { label: "After proposed commitment", value: "£250" },
      { label: "Change", value: "−£420/month" },
      { label: "Percentage of take-home income", value: "16.8%" },
      { label: "Percentage of current monthly flexibility consumed", value: "62.7%" },
    ]);
    const none = paymentFigures(paymentConsequence(snapshot(blankPicture()), 420));
    expect(none.slice(4).map((f) => f.value)).toEqual(["—", "—"]);
    allSentences(none.map((f) => `${f.label} ${f.value}`));
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
    const { rows, note } = aprScenarios(s, sc(20000, 9.9, 48));
    expect(rows.map((r) => r.apr)).toEqual([8, 12, 18]);
    expect(rows[0].monthly).toBeLessThan(rows[1].monthly);
    expect(rows[1].monthly).toBeLessThan(rows[2].monthly);
    for (const r of rows) expect(r.remainingAfter).toBeCloseTo(670 - r.monthly, 2);
    expect(note).toMatch(/^The 18% scenario would cost approximately £[\d,]+ more than the 8% scenario/);
    allSentences([note]);
  });

  it("a longer term: smaller payment, longer commitment, more cost, all said", () => {
    const t = termConsequence(s, sc(20000, 9.9), 36, 60);
    expect(t.b.monthly).toBeLessThan(t.a.monthly);
    expect(t.b.cost).toBeGreaterThan(t.a.cost);
    expect(t.sentences.join(" ")).toMatch(/smaller monthly payment.*24 months longer.*more overall/);
    allSentences(t.sentences);
  });

  it("term and rate comparisons carry the scenario's own fees, so they match its card", () => {
    const providerA: Scenario = { ...sc(20000, 7.9, 48), upfrontFee: 295, monthlyFee: 5 };
    const card = schedule(providerA);
    const t = termConsequence(s, providerA, 48, 60);
    expect(t.a.total).toBeCloseTo(card.total, 2);
    expect(t.a.cost).toBeCloseTo(card.cost, 2);
    expect(t.a.monthly).toBeCloseTo(card.regular, 2);
    expect(t.b.cost).toBeCloseTo(schedule({ ...providerA, term: 60 }).cost, 2);
    const own = aprScenarios(s, providerA, [7.9, 12]).rows[0];
    expect([own.total, own.cost]).toEqual([card.total, card.cost]);
    expect(aprScenarios(s, providerA, [7.9, 12]).note).toMatch(/illustrative 48-month term/);
  });

  it("offer A vs offer B, both sides", () => {
    const a = scenarioRow(s, { ...sc(20000, 8.9, 48), label: "Offer A" });
    const b = scenarioRow(s, { ...sc(20000, 10.9, 60), label: "Offer B" });
    const said = compareRows(a, b).join(" ");
    expect(said).toMatch(/Offer B has a smaller monthly payment/);
    expect(said).toMatch(/12 months longer/);
    expect(said).toMatch(/more overall/);
  });

  it("the home-page figures: £20,000 at 9.9% over 48 and 60 months, and £17,000 over 48", () => {
    const h48 = schedule(sc(20000, 9.9, 48));
    expect(h48.regular).toBeCloseTo(502.25, 2);
    expect(h48.total).toBeCloseTo(24107.8, 2);
    expect(h48.cost).toBeCloseTo(4107.8, 2);
    expect(schedule(sc(20000, 9.9, 60)).regular).toBeCloseTo(419.82, 2);
    expect(schedule(sc(17000, 9.9, 48)).regular).toBeCloseTo(426.91, 2);
    const c = paymentConsequence(s, 420);
    expect([c.after, c.pctOfIncome, c.pctOfFlexibility]).toEqual([250, 16.8, 62.7]);
  });

  it("the longer term, in one signed sentence that matches the schedule", () => {
    const t = termConsequence(s, sc(20000, 9.9), 48, 60);
    const dm = Math.round((schedule(sc(20000, 9.9, 60)).regular - schedule(sc(20000, 9.9, 48)).regular) * 100) / 100;
    const dc = Math.round(schedule(sc(20000, 9.9, 60)).cost - schedule(sc(20000, 9.9, 48)).cost);
    expect([dm, dc]).toEqual([-82.43, 1081]);
    const said = "The longer term changes the monthly commitment by −£82.43 and total borrowing cost by +£1,081 under these assumptions.";
    expect(termSentence(t.a, t.b)).toBe(said);
    expect(termSentence(t.b, t.a)).toBe(said); // order doesn't matter: always the longer relative to the shorter
    expect(termSentence(t.a, t.a)).toBe("");
    allSentences([said]);
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
    expect(cps[0].sentence).toMatch(/^Based on what you’ve told us, your situation changes in month 5 because the £180 a month loan repayments you told us about end \(last payment month 4\): estimated monthly remaining would go from/);
    allSentences(cps.map((c) => c.sentence));
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
    expect(m.map((x) => x.label)).toEqual(["Deposit paid", "First car payment", "Bonus (one-off)", "Last payment: loan repayments", "Car finance ends after 48 months"]);
    // Named at its last payment (month 4, as every other screen says), with the month the money comes back.
    expect(m[3]).toEqual({ when: "month 4", label: "Last payment: loan repayments", amount: "+£180 a month back from month 5" });
  });
});

describe("stress testing and waiting", () => {
  const s = snapshot(alex());
  it("a bills rise, an income fall, an unexpected expense and a loan ending, before vs after", () => {
    const rows = stressScenarios(s, 420, [
      { id: "bills", label: "Bills rise", monthly: -100, oneOff: 0 },
      { id: "income", label: "Income falls", monthly: -300, oneOff: 0, months: 3 },
      { id: "unexpected", label: "Unexpected expense", monthly: 0, oneOff: -500 },
      { id: "loan", label: "Loan ends", monthly: 180, oneOff: 0 },
    ]);
    expect(rows.map((r) => [r.remainingBefore, r.remainingAfter, r.bufferAfter])).toEqual([[250, 150, 5000], [250, -50, 4850], [250, 250, 4500], [250, 430, 5000]]);
    expect(rows[1].sentence).toMatch(/from £250 to −£50 for 3 months, and covering the shortfall for 3 months would use about £150 of savings/);
    allSentences(rows.map((r) => r.sentence));
  });

  it("starts from savings after the deposit, never below £0", () => {
    const after = stressStart(s, { deposit: 5000, fromSavings: true });
    expect([after.buffer, after.monthsOfEssentials, after.remaining]).toEqual([0, 0, 670]);
    expect(stressStart(s, { deposit: 8000, fromSavings: true }).buffer).toBe(0);
    expect(stressStart(s, { deposit: 5000, fromSavings: false })).toMatchObject({ buffer: 5000, monthsOfEssentials: 3.4 });
  });

  it("savings never go below £0: the rest is a shortfall", () => {
    const s0 = stressStart(s, { deposit: 5000, fromSavings: true });
    const [income, unexpected] = stressScenarios(s0, 420, [
      { id: "income", label: "Income falls", monthly: -300, oneOff: 0, months: 3 },
      { id: "unexpected", label: "Unexpected expense", monthly: 0, oneOff: -500 },
    ]);
    expect(income).toMatchObject({ remainingAfter: -50, bufferAfter: 0, shortfall: 150, drawMonths: 3 });
    expect(income.shortfall).toBeGreaterThan(0);
    expect(income.sentence).toMatch(/That’s £150 more than your cash savings, so it would need to come from somewhere else\.$/);
    expect(unexpected).toMatchObject({ bufferAfter: 0, shortfall: 500, drawMonths: null });
    expect(unexpected.sentence).toMatch(/That’s £500 more than your cash savings/);
    allSentences([income.sentence, unexpected.sentence]);
  });

  it("an ongoing shock that leaves the month short draws on savings over the horizon", () => {
    const [bills] = stressScenarios(s, 420, [{ id: "bills", label: "Bills rise", monthly: -300, oneOff: 0 }]);
    expect(bills).toMatchObject({ remainingAfter: -50, drawMonths: 12, bufferAfter: 4400, shortfall: 0 });
    expect(bills.sentence).toMatch(/if it carried on for 12 months, covering the shortfall would use about £600 of savings/);
    expect(stressScenarios(s, 420, [{ id: "bills", label: "Bills rise", monthly: -300, oneOff: 0 }], { horizon: 6 })[0].bufferAfter).toBe(4700);
    // A smaller surplus doesn't touch savings.
    expect(stressScenarios(s, 420, [{ id: "bills", label: "Bills rise", monthly: -100, oneOff: 0 }])[0]).toMatchObject({ drawMonths: null, bufferAfter: 5000 });
    allSentences([bills.sentence]);
  });

  it("commitments, the person's own buffer and months covered, before vs after", () => {
    const [loan, unexpected] = stressScenarios(s, 420, [
      { id: "loan", label: "Loan ends", monthly: 180, oneOff: 0, commitments: -180 },
      { id: "unexpected", label: "Unexpected expense", monthly: 0, oneOff: -500 },
    ], { preferredBuffer: 300 });
    expect(loan).toMatchObject({ commitmentsBefore: 600, commitmentsAfter: 420, bufferGapBefore: -50, bufferGapAfter: 130, monthsCoveredBefore: 3.4, monthsCoveredAfter: 3.4 });
    expect(loan.sentence).toMatch(/your monthly commitments would go from £600 to £420/);
    expect(unexpected).toMatchObject({ commitmentsAfter: 600, monthsCoveredAfter: 3.1 }); // 4500 / 1450
    const plain = stressScenarios(s, 0, [{ id: "x", label: "x", monthly: -100, oneOff: 0 }])[0];
    expect([plain.bufferGapBefore, plain.bufferGapAfter, plain.commitmentsBefore]).toEqual([null, null, 180]);
    allSentences([loan.sentence, unexpected.sentence]);
  });

  it("waiting 0, 1, 3, 6 and 12 months at £200 a month, keeping the deposit unchanged", () => {
    const rows = waitScenarios(s, { monthlySaving: 200, scenario: sc(20000, 9.9, 48), deposit: 5000, shareToDeposit: 0, depositFromSavings: true, months: [0, 1, 3, 6, 12] });
    expect(rows.map((r) => r.savings)).toEqual([5000, 5200, 5600, 6200, 7400]);
    expect(rows.every((r) => r.deposit === 5000 && r.financed === 20000)).toBe(true);
    expect(rows[0].total).toBeCloseTo(schedule(sc(20000, 9.9, 48)).total, 2);
  });

  it("waiting uses the scenario in use (amount and fees), even with no car price", () => {
    // e.g. an agreement read from the small print: £20,000 with a £199 fee, no car price entered.
    const offer: Scenario = { ...sc(20000, 8.9, 48, 2), upfrontFee: 199 };
    const rows = waitScenarios(s, { monthlySaving: 200, scenario: offer, deposit: 0, shareToDeposit: 0, depositFromSavings: true, months: [0, 3] });
    expect(rows[0]).toMatchObject({ financed: 20000, deposit: 0 });
    expect(rows[0].total).toBeCloseTo(schedule({ ...offer, startIn: 0 }).total, 2);
    expect(rows[0].cost).toBeCloseTo(schedule(offer).cost, 2);
    expect(rows[0].monthly).toBeGreaterThan(0);
    const all = waitScenarios(s, { monthlySaving: 200, scenario: offer, deposit: 0, shareToDeposit: 1, depositFromSavings: true, months: [3] })[0];
    expect([all.deposit, all.financed]).toEqual([600, 19400]);
  });

  it("each column's remaining reflects what the person said changes by then; the savings row stays regular saving only", () => {
    // alex(): £670 now; the £180 loan stops from month 5, so a first payment in month 7 leaves £850 before the payment.
    const base = simulateMonths(alex(), [], null, 13);
    const months = [0, 1, 3, 6, 12];
    const remainingAt = months.map((m) => (m === 0 ? s.remaining : base[m].normalLeft));
    expect(remainingAt).toEqual([670, 670, 670, 850, 850]);
    const rows = waitScenarios(s, { monthlySaving: 200, scenario: sc(20000, 9.9, 48), deposit: 5000, shareToDeposit: 0, depositFromSavings: true, months, remainingAt });
    const pay = schedule(sc(20000, 9.9, 48)).regular;
    expect(rows[0].remainingAfter).toBeCloseTo(670 - pay, 2);
    expect(rows[3].remainingAfter).toBeCloseTo(850 - pay, 2);
    expect(rows.map((r) => r.savings)).toEqual([5000, 5200, 5600, 6200, 7400]);
  });

  it("buy now vs wait projects only the saving entered, and doesn't assume it goes to the deposit", () => {
    const base = { monthlySaving: 300, scenario: sc(20000, 9.9, 48), deposit: 5000, depositFromSavings: true };
    const keep = waitScenarios(s, { ...base, shareToDeposit: 0 });
    expect(keep.map((r) => r.savings)).toEqual([5000, 5300, 5900, 6800]);
    expect(keep.every((r) => r.deposit === 5000 && r.financed === 20000)).toBe(true);
    expect(keep.map((r) => r.cashAfterDeposit)).toEqual([0, 300, 900, 1800]);
    const half = waitScenarios(s, { ...base, shareToDeposit: 0.5 });
    expect(half.map((r) => r.deposit)).toEqual([5000, 5150, 5450, 5900]);
    expect(half[3].monthly).toBeLessThan(half[0].monthly);
  });
});

describe("returning later: last time vs now", () => {
  const last: DecisionFigures = { price: 25000, deposit: 5000, monthly: 419.82, remainingBefore: 670, remainingAfter: 250.18, buffer: 5000, apr: 9.9, term: 60 };
  it("nothing changed, nothing said", () => {
    expect(decisionChanges(last, { ...last })).toEqual([]);
  });
  it("says what changed, neutrally", () => {
    const now = { ...last, price: 23000, term: 48, remainingAfter: 320, buffer: 5600 };
    const said = decisionChanges(last, now);
    expect(said).toEqual([
      "Your car price changed from £25,000 to £23,000.",
      "Your term changed from 60 months to 48 months.",
      "Your estimated monthly remaining after the payment changed from £250.18 to £320.",
      "Your cash savings changed from £5,000 to £5,600.",
    ]);
    expect(decisionChanges(last, { ...last, apr: 8.9 })).toEqual(["Your APR changed from 9.9% to 8.9%."]);
    allSentences(said);
  });
});
