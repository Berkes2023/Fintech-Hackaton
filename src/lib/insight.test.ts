import { describe, expect, it } from "vitest";
import {
  annualise, aprComparison, insightsFor, INSTRUCTION_WORDS, nextDebtEnding, otherTerm, pictureNarrative, priceChange, repeatedPurchase,
  savingsProjection, spendingChange, type Insight, type InsightContext,
} from "./insight";
import { snapshot, termConsequence, termSentence, VERDICT_WORDS } from "./consequence";
import { BANNED, blankPicture, exampleCar, position, schedule, withAmount, type FutureEvent, type Picture, type Scenario } from "./sim";

const months = (m: number) => `month ${m}`;
function person(): Picture {
  const p = blankPicture();
  return {
    ...p,
    income: withAmount(p.income, "salary", 2500),
    essentials: withAmount(withAmount(withAmount(withAmount(p.essentials, "rent", 850), "bills", 230), "food", 250), "transport", 120),
    discretionary: withAmount(withAmount(p.discretionary, "subs", 80), "fun", 200),
    debts: withAmount(p.debts, "loan", 180).map((d) => (d.id === "loan" ? { ...d, endsIn: 5 } : d)),
    otherSaving: withAmount(p.otherSaving, "regular", 200),
    reserves: { savings: 5000, emergency: 0 },
  };
}
const sc = (amount: number, apr = 9.9, term = 48): Scenario => ({ id: "s", label: "S", source: "illustrative", amount, apr, term, upfrontFee: 0, monthlyFee: 0, balloon: 0, startIn: 0, fieldSources: {} });
const bonus: FutureEvent = { id: "b", label: "Bonus", amount: 3000, month: 1, direction: "in", recurrence: "one_off" };
const noInstructions = (xs: Insight[]) => {
  for (const x of xs) {
    for (const t of [x.title, x.body, x.action?.label ?? "", x.whatIf?.label ?? "", x.whatIf?.title ?? "", ...(x.chain ?? [])]) {
      expect(t).not.toMatch(INSTRUCTION_WORDS);
      expect(t).not.toMatch(VERDICT_WORDS);
      expect(t).not.toMatch(BANNED);
    }
  }
};
/** The brief's demo: £670 left each month, £5,000 savings, a £180 loan ending in month 5. */
const demo = (): InsightContext => {
  const st = exampleCar();
  return { picture: st.picture, events: st.events, monthName: months, car: { price: 25000, deposit: 5000, scenario: sc(20000, 9.9, 60), depositFromSavings: true } };
};

describe("building blocks", () => {
  it("£200 a month carried forward, ignoring returns", () => {
    expect(savingsProjection(200).map((x) => x.total)).toEqual([1200, 2400, 4800]);
    expect(savingsProjection(250, [12])[0].total - savingsProjection(200, [12])[0].total).toBe(600);
  });
  it("£8 four times a week is £32 a week, about £139 a month, £1,664 a year", () => {
    const r = repeatedPurchase(8, 4);
    expect(r.week).toBe(32);
    expect(Math.round(r.month)).toBe(139);
    expect(r.year).toBe(1664);
  });
  it("a smaller recurring cost, annualised, and its effect on monthly remaining", () => {
    expect(annualise(50)).toBe(600);
    expect(spendingChange(200, 350)).toEqual([{ cut: 25, perYear: 300, remainingAfter: 375 }, { cut: 50, perYear: 600, remainingAfter: 400 }, { cut: 100, perYear: 1200, remainingAfter: 450 }]);
    expect(spendingChange(40, 350).map((c) => c.cut)).toEqual([25]); // never more than the cost itself
  });
  it("finds the next debt to end", () => {
    expect(nextDebtEnding(person())).toMatchObject({ month: 5, monthly: 180 });
    expect(nextDebtEnding(blankPicture())).toBeNull();
  });
  it("a £2,000 cheaper car finances £2,000 less with the same deposit", () => {
    const pc = priceChange(snapshot(person()), sc(20000), 25000, 5000, 23000);
    expect([pc.financeBefore, pc.financeAfter]).toEqual([20000, 18000]);
    expect(pc.b.monthly).toBeLessThan(pc.a.monthly);
  });
  it("APR comparison includes the person's own rate, sorted, without duplicates", () => {
    expect(aprComparison(snapshot(person()), sc(20000, 9.9, 48)).rows.map((r) => r.apr)).toEqual([8, 9.9, 12, 15]);
    expect(aprComparison(snapshot(person()), sc(20000, 12, 48)).rows.map((r) => r.apr)).toEqual([8, 12, 15]);
    expect([otherTerm(60), otherTerm(48)]).toEqual([48, 60]);
  });
  it("APR comparison keeps the scenario's fee, so its own row matches the scenario card", () => {
    const withFee: Scenario = { ...sc(20000, 7.9, 48), upfrontFee: 295 };
    const own = aprComparison(snapshot(person()), withFee).rows.find((r) => r.apr === 7.9)!;
    expect(own.total).toBeCloseTo(schedule(withFee).total, 2);
    expect(own.cost).toBeCloseTo(schedule(withFee).cost, 2);
    expect(own.cost - schedule(sc(20000, 7.9, 48)).cost).toBeCloseTo(295, 2);
  });
});

describe("the live picture", () => {
  it("narrates the month as it forms", () => {
    const lines = pictureNarrative(person());
    expect(lines[0]).toBe("Okay: £2,500 monthly take-home.");
    expect(lines[1]).toBe("After the £850 rent or mortgage, £1,650 remains before your other costs.");
    expect(lines.join(" ")).toMatch(/£180 a month of your cash flow is committed to existing borrowing, £180 of it until its last payment/);
    expect(lines.at(-1)).toBe("You have £5,000 set aside as a cash buffer.");
    expect(pictureNarrative(blankPicture())).toEqual([]);
  });

  it("counts debts the way the big number does: a loan whose last payment is this month is already gone", () => {
    const p = person();
    const ending: Picture = { ...p, debts: p.debts.map((d) => (d.id === "loan" ? { ...d, endsIn: 1 } : d)) };
    const lines = pictureNarrative(ending);
    expect(position(ending, 1).value).toBe(570);
    expect(lines.join(" ")).not.toMatch(/existing borrowing/);
    expect(lines.join(" ")).toMatch(/an estimated £570 remains each month/);
    expect(nextDebtEnding(ending)).toBeNull();
  });
});

describe("insights for each moment, most relevant first", () => {
  const base = (): InsightContext => ({ picture: person(), events: [bonus], monthName: months });

  it("spending: annualised top cost with a what-if, subscriptions and a repeated purchase", () => {
    const ins = insightsFor("spending", { ...base(), repeated: { amount: 8, timesPerWeek: 4 } });
    expect(ins.map((i) => i.id)).toEqual(["repeated", "annualised", "committed", "subs"]);
    expect(ins.find((i) => i.id === "annualised")!.title).toBe("Shopping, entertainment and eating out: £200 a month is £2,400 a year");
    expect(ins.find((i) => i.id === "subs")!.title).toBe("Subscriptions: £80 a month is £960 a year");
    noInstructions(ins);
  });

  it("borrowing: a loan ending soon is prominent, with its timing", () => {
    const ins = insightsFor("borrowing", base());
    expect(ins[0]).toMatchObject({ id: "debt-ending", kind: "changes_soon", title: "Your £180/month loan ends in month 4" });
    expect(ins[0].body).toBe("Its last payment is in month 4. From month 5, that £180/month of flexibility returns: your estimated monthly remaining could increase by £180, assuming everything else stays the same.");
    expect(ins[0].action).toBeUndefined(); // no car yet, so nothing to wait for
    const withCar = insightsFor("deposit", demo()).find((i) => i.id === "debt-ending")!;
    expect(withCar.action).toEqual({ label: "What if I wait until month 4?", does: "waitLoan" });
    // Never offered on an early step, where it would jump past the credit context.
    expect(insightsFor("borrowing", demo()).find((i) => i.id === "debt-ending")!.action).toBeUndefined();
    noInstructions(ins);
  });

  it("a debt ending within 3 months stays prominent even at the finance step", () => {
    const d = demo();
    const soon = { ...d, picture: { ...d.picture, debts: d.picture.debts.map((x) => (x.id === "loan" ? { ...x, endsIn: 3 } : x)) } };
    expect(insightsFor("finance", soon).find((i) => i.id === "debt-ending")!.priority).toBe(80);
    expect(insightsFor("finance", d).find((i) => i.id === "debt-ending")!.priority).toBe(55);
  });

  it("buffer: savings in context, never judged", () => {
    const b = insightsFor("buffer", base()).find((i) => i.id === "buffer")!;
    expect(b.body).toBe("The £5,000 you’ve told us about is equivalent to approximately 3.4 months of the £1,450 essential monthly costs you’ve entered.");
    expect(b.body).not.toMatch(/enough/);
  });

  it("deposit using all savings outranks everything but a negative month, and offers to keep £1,000", () => {
    const ins = insightsFor("deposit", demo());
    expect(ins.map((i) => i.id)).toEqual(["deposit-two", "bonus", "debt-ending", "price"]);
    expect(ins[0].body).toBe("Your borrowing: £25,000 − £5,000 = £20,000 financed. Your cash savings: £5,000 − £5,000 = £0 remaining. A larger deposit reduces the amount financed, while also using more cash upfront.");
    expect(ins[0].action).toEqual({ label: "What if I kept £1,000 of my savings?", does: "keepCash" });
    const subs = insightsFor("spending", base()).find((i) => i.id === "subs")!;
    expect(ins[0].priority).toBeGreaterThan(subs.priority);
    noInstructions(ins);
  });

  it("keeping £1,000 isn't offered again once £1,000 is kept", () => {
    const d = demo();
    const kept = insightsFor("deposit", { ...d, car: { ...d.car!, deposit: 4000, scenario: sc(21000, 9.9, 60) } }).find((i) => i.id === "deposit-two")!;
    expect(kept.body).toMatch(/£5,000 − £4,000 = £1,000 remaining/);
    expect(kept.action).toBeUndefined();
  });

  it("a deposit larger than the savings states the shortfall instead of stopping at £0", () => {
    const d = demo();
    const ins = insightsFor("deposit", { ...d, picture: { ...d.picture, reserves: { savings: 2000, emergency: 0 } } });
    const dep = ins.find((i) => i.id === "deposit-two")!;
    expect(dep.body).toMatch(/Your cash savings: the £5,000 deposit is £3,000 more than the £2,000 of savings you’ve told us about\./);
    expect(dep.body).not.toMatch(/= £0 remaining/);
    expect(dep.action?.does).toBe("keepCash");
  });

  it("a payment that would make the month negative comes first", () => {
    const ins = insightsFor("deposit", { ...base(), car: { price: 25000, deposit: 5000, scenario: sc(20000), depositFromSavings: true } });
    expect(ins[0]).toMatchObject({ id: "after-negative", priority: 98, title: "With this payment, regular costs would be £112.25 more than regular income" });
    expect(ins[1].id).toBe("deposit-two");
    noInstructions(ins);
  });

  it("a payment below the person's own buffer is noticed, against their number only", () => {
    const ins = insightsFor("finance", { ...demo(), preferredBuffer: 300 });
    expect(ins.map((i) => i.id)).toEqual(["bonus", "apr", "below-buffer", "debt-ending", "term"]);
    expect(ins.find((i) => i.id === "below-buffer")!.title).toBe("£49.82 below the monthly buffer you said you’d like to keep");
    expect(insightsFor("finance", demo()).some((i) => i.id === "below-buffer")).toBe(false);
    noInstructions(ins);
  });

  it("one-off income: what you told us, in your own words, never as certain", () => {
    const ins = insightsFor("deposit", demo());
    expect(ins.find((i) => i.id === "bonus")).toMatchObject({ title: "You told us £3,000 is expected next month", action: { label: "What if I wait?", does: "waitBonus" } });
    const overtime: FutureEvent = { id: "o", label: "Overtime payment", amount: 1200, month: 3, direction: "in", recurrence: "one_off" };
    const o = insightsFor("deposit", { ...demo(), events: [overtime] }).find((i) => i.id === "bonus")!;
    expect(o.title).toBe("You told us £1,200 is expected in month 3");
    expect(o.body).toMatch(/This overtime payment is one-off money/);
    expect(`${o.title} ${o.body}`).not.toMatch(/bonus/i);
  });

  it("a negative month comes first", () => {
    const p = person();
    const tight = { ...base(), picture: { ...p, income: withAmount(p.income, "salary", 1500) } };
    expect(insightsFor("spending", tight)[0].id).toBe("negative");
  });

  it("finance: what the APR means here, and the term trade-off with both sides", () => {
    const ins = insightsFor("finance", { ...base(), car: { price: 25000, deposit: 5000, scenario: sc(20000, 9.9, 60), depositFromSavings: true } });
    const term = ins.find((i) => i.id === "term")!;
    expect(term.title).toBe("60 vs 48 months changes more than the payment");
    const t = termConsequence(snapshot(person()), sc(20000, 9.9, 60), 60, 48);
    expect(term.body).toBe(termSentence(t.a, t.b));
    expect(term.action).toEqual({ label: "Compare 48 months", does: "term48" });
    const on48 = insightsFor("finance", { ...base(), car: { price: 25000, deposit: 5000, scenario: sc(20000, 9.9, 48), depositFromSavings: true } }).find((i) => i.id === "term")!;
    expect(on48.action).toEqual({ label: "Compare 60 months", does: "term60" });
    expect(ins.find((i) => i.id === "apr")!.chain).toHaveLength(4);
    noInstructions(ins);
  });

  it("long-term saving projection with a +£50 what-if revealed in place", () => {
    const s = insightsFor("longterm", base()).find((i) => i.id === "saving")!;
    expect(s.title).toBe("At £200 a month, that’s £2,400 of contributions over 12 months");
    expect(s.body).toBe("Assuming the same contribution continues, ignoring interest or returns.");
    expect(s.whatIf).toEqual({ label: "What if I saved £50 more?", title: "At £250 a month: £3,000 over 12 months (+£600)", chain: ["£1,500 in 6 months", "£3,000 in 12 months", "£6,000 in 24 months"] });
    expect(s.action).toBeUndefined();
    noInstructions([s]);
  });

  it("a cheaper price: payment, total repaid, borrowing cost and monthly remaining", () => {
    const p = insightsFor("deposit", demo()).find((i) => i.id === "price")!;
    expect(p.body).toMatch(/monthly payment would be £377\.83 instead of £419\.82, the total repaid £[\d,]+ instead of £25,189, the borrowing cost £[\d,]+ instead of £5,189, and your estimated monthly remaining £292\.17 instead of £250\.18/);
  });
});
