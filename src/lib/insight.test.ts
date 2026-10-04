import { describe, expect, it } from "vitest";
import {
  annualise, aprComparison, insightsFor, INSTRUCTION_WORDS, nextDebtEnding, otherTerm, pictureNarrative, priceChange, repeatedPurchase,
  savingsProjection, spendingChange, type InsightContext,
} from "./insight";
import { snapshot } from "./consequence";
import { blankPicture, withAmount, type FutureEvent, type Picture, type Scenario } from "./sim";

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
const noInstructions = (xs: { title: string; body: string }[]) => { for (const x of xs) { expect(x.title).not.toMatch(INSTRUCTION_WORDS); expect(x.body).not.toMatch(INSTRUCTION_WORDS); } };

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
    expect(aprComparison(snapshot(person()), 20000, 48, 9.9).rows.map((r) => r.apr)).toEqual([8, 9.9, 12, 15]);
    expect(aprComparison(snapshot(person()), 20000, 48, 12).rows.map((r) => r.apr)).toEqual([8, 12, 15]);
    expect([otherTerm(60), otherTerm(48)]).toEqual([48, 60]);
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
    expect(ins[0]).toMatchObject({ id: "debt-ending", kind: "changes_soon", title: "Something changes in month 5" });
    expect(ins[0].body).toMatch(/^Its last payment is in month 4. /);
    expect(ins[0].body).toMatch(/increase your estimated monthly remaining by £180 from month 5, assuming everything else stays the same/);
  });

  it("buffer: savings in context, never judged", () => {
    const b = insightsFor("buffer", base()).find((i) => i.id === "buffer")!;
    expect(b.body).toBe("The £5,000 you’ve told us about is equivalent to approximately 3.4 months of the £1,450 essential monthly costs you’ve entered.");
    expect(b.body).not.toMatch(/enough/);
  });

  it("deposit using all savings outranks everything else, and offers a smaller deposit", () => {
    const ins = insightsFor("deposit", { ...base(), car: { price: 25000, deposit: 5000, scenario: sc(20000), depositFromSavings: true } });
    expect(ins[0].id).toBe("deposit-two");
    expect(ins[0].body).toMatch(/£25,000 − £5,000 = £20,000 financed\. Your cash savings: £5,000 − £5,000 = £0 remaining/);
    expect(ins[0].action).toEqual({ label: "What if I kept £1,000 of my savings?", does: "keepCash" });
    expect(ins[1].id).toBe("bonus");
    noInstructions(ins);
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
    expect(term.body).toMatch(/48 months would increase the monthly commitment by £[\d.,]+ but reduce the total borrowing cost by £[\d,]+/);
    expect(ins.find((i) => i.id === "apr")!.chain).toHaveLength(4);
    noInstructions(ins);
  });

  it("long-term saving projection with a +£50 comparison", () => {
    const s = insightsFor("longterm", base()).find((i) => i.id === "saving")!;
    expect(s.title).toBe("At £200 a month, that’s £2,400 of contributions over 12 months");
    expect(s.body).toMatch(/At £250 a month it would be £3,000 after 12 months \(\+£600\)/);
  });
});
