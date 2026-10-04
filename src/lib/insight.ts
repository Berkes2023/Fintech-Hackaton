import { aprScenarios, gbp, paymentConsequence, pct1, snapshot, savingsConsequence, scenarioRow, termConsequence, termSentence, type Snapshot } from "./consequence";
import { amountOf, debtPayments, schedule, toMonthly, type Debt, type DebtKind, type FutureEvent, type Item, type Picture, type Scenario } from "./sim";

// THE INSIGHT ENGINE. Input → calculation → context → insight → optional what-if.
// Projections only carry forward what the person entered, “assuming everything else stayed the same”. No returns,
// no predicted pay rises, rates, scores or approvals. Insights notice and explain; they never tell anyone what to do.

const r2 = (x: number) => Math.round(x * 100) / 100;
const WEEKS_PER_MONTH = 52 / 12;

export type InsightKind = "did_you_know" | "changes_soon" | "two_things" | "looking_ahead" | "compare" | "what_if" | "worth_noticing";
export const KIND_LABEL: Record<InsightKind, string> = {
  did_you_know: "Did you know?",
  changes_soon: "Something changes soon",
  two_things: "This affects two things",
  looking_ahead: "Looking ahead",
  compare: "Compare the consequence",
  what_if: "What if this changed?",
  worth_noticing: "Worth noticing",
};

/** A suggested what-if the person can choose to run. Never an instruction. */
export type SuggestionAction = "waitBonus" | "waitLoan" | "smallerDeposit" | "keepCash" | "term48" | "term60" | "cheaperCar" | "spendingCut" | "aprDown";
export interface Insight {
  id: string;
  kind: InsightKind;
  /** Higher shows first. */
  priority: number;
  title: string;
  body: string;
  /** Optional chain of figures, shown as a → b → c. */
  chain?: string[];
  action?: { label: string; does: SuggestionAction };
  /** An optional what-if revealed in place: no journey state changes. */
  whatIf?: { label: string; title: string; chain?: string[] };
}

/* ---------- building blocks ---------- */

/** Monthly contributions carried forward, ignoring interest or returns. */
export function savingsProjection(monthly: number, months: number[] = [6, 12, 24]) {
  return months.map((m) => ({ months: m, total: r2(Math.max(0, monthly) * m) }));
}

export const annualise = (monthly: number) => r2(monthly * 12);

/** A small purchase repeated each week, turned into week, month and year totals. */
export function repeatedPurchase(amount: number, timesPerWeek: number) {
  const week = r2(Math.max(0, amount) * Math.max(0, timesPerWeek));
  return { week, month: r2(week * WEEKS_PER_MONTH), year: r2(week * 52) };
}

/** What a smaller recurring cost would do to the year and to monthly remaining. */
export function spendingChange(monthly: number, remaining: number, cuts: number[] = [25, 50, 100]) {
  return cuts.filter((c) => c <= monthly).map((c) => ({ cut: c, perYear: annualise(c), remainingAfter: r2(remaining + c) }));
}

/**
 * The first existing debt with a known end date that is still in next month's position, and what it gives back each month.
 * A debt whose last payment is this month (endsIn 1) is already left out of the position, so it isn't "ending soon".
 */
export function nextDebtEnding(p: Picture): { debt: Debt; month: number; monthly: number } | null {
  const ending = p.debts.filter((d) => d.endsIn && d.endsIn > 1 && d.amount > 0).sort((a, b) => (a.endsIn ?? 0) - (b.endsIn ?? 0))[0];
  return ending ? { debt: ending, month: ending.endsIn!, monthly: r2(toMonthly(ending.amount, ending.freq)) } : null;
}

/** The same scenario at a different purchase price, keeping the deposit. */
export function priceChange(s: Snapshot, sc: Scenario, price: number, deposit: number, newPrice: number) {
  const a = scenarioRow(s, { ...sc, amount: Math.max(0, price - deposit) });
  const b = scenarioRow(s, { ...sc, amount: Math.max(0, newPrice - deposit) });
  return { a, b, financeBefore: a.amount, financeAfter: b.amount };
}

/** The illustrative rates to compare on the scenario in use (its amount, term and fees): its own rate plus 8%, 12% and 15%, in order. */
export function aprComparison(s: Snapshot, base: Scenario, preferredBuffer?: number | null) {
  const rates = [...new Set([8, r2(base.apr), 12, 15])].sort((x, y) => x - y);
  return aprScenarios(s, base, rates, preferredBuffer);
}

/** The term to compare with: 48 months, or 60 if they already chose 48. */
export const otherTerm = (term: number) => (term === 48 ? 60 : 48);

/* ---------- the live picture: the person's month forming as they tell us ---------- */

/** Monthly total of the items still running next month, the same way position(p, 1) counts them. */
const sumItems = (l: Item[]) => l.filter((i) => i.endsIn === undefined || i.endsIn > 1).reduce((a, i) => a + toMonthly(i.amount, i.freq), 0);

/** A short noun for a debt, for titles like “Your £180/month loan ends in Feb 2027”. */
const DEBT_NOUN: Record<DebtKind, string> = { loan: "loan", car: "car finance", card: "credit-card plan", overdraft: "overdraft", bnpl: "Buy Now Pay Later plan", other: "" };
const debtNoun = (d: Debt) => DEBT_NOUN[d.kind] || d.label.toLowerCase();

/** Conversational lines describing the month so far, in the order things were asked. */
export function pictureNarrative(p: Picture): string[] {
  const out: string[] = [];
  const salary = amountOf(p.income, "salary");
  const income = r2(sumItems(p.income));
  if (!income) return out;
  out.push(salary === income ? `Okay: ${gbp(income)} monthly take-home.` : `Okay: ${gbp(income)} coming in each month.`);
  const rent = amountOf(p.essentials, "rent");
  let left = income;
  if (rent) { left = r2(left - rent); out.push(`After the ${gbp(rent)} rent or mortgage, ${gbp(left)} remains before your other costs.`); }
  const otherEssentials = r2(sumItems(p.essentials) - rent);
  if (otherEssentials) { left = r2(left - otherEssentials); out.push(`Bills, food, transport and insurance (${gbp(otherEssentials)}) bring that to ${gbp(left)}.`); }
  const disc = r2(sumItems(p.discretionary));
  if (disc) { left = r2(left - disc); out.push(`Other regular spending of ${gbp(disc)} leaves ${gbp(left)}.`); }
  const debt = debtPayments(p);
  if (debt) {
    left = r2(left - debt);
    const end = nextDebtEnding(p);
    out.push(`${gbp(debt)} a month of your cash flow is committed to existing borrowing${end ? `, ${gbp(end.monthly)} of it until its last payment` : ""}. That leaves ${gbp(left)}.`);
  }
  const commit = r2((p.pension.alreadyDeducted ? 0 : p.pension.amount) + sumItems(p.otherSaving));
  if (commit) { left = r2(left - commit); out.push(`After ${gbp(commit)} of saving and pension, an estimated ${gbp(left)} remains each month.`); }
  const buffer = r2(p.reserves.savings + p.reserves.emergency);
  if (buffer) out.push(`You have ${gbp(buffer)} set aside as a cash buffer.`);
  return out;
}

/* ---------- insights for each moment of the journey ---------- */

export type Moment = "income" | "spending" | "borrowing" | "buffer" | "longterm" | "snapshot" | "price" | "deposit" | "finance";

export interface InsightContext {
  picture: Picture;
  events: FutureEvent[];
  monthName: (m: number) => string;
  /** Once a car is being considered. */
  car?: { price: number; deposit: number; scenario: Scenario; depositFromSavings: boolean };
  preferredBuffer?: number | null;
  /** A repeated purchase the person described (spending step). */
  repeated?: { amount: number; timesPerWeek: number };
}

/** Every relevant insight for this moment, most relevant first. Deterministic: same inputs, same insights. */
export function insightsFor(moment: Moment, ctx: InsightContext): Insight[] {
  const p = ctx.picture;
  const s = snapshot(p);
  const out: Insight[] = [];
  const add = (i: Insight) => out.push(i);

  // A negative month matters most, wherever it shows up.
  if (s.income > 0 && s.remaining < 0) add({ id: "negative", kind: "worth_noticing", priority: 100, title: `Regular costs are ${gbp(-s.remaining)} more than regular income`, body: "Based on what you’ve entered, your regular costs are higher than what comes in each month. Check the figures, or see what a change would do." });

  // Income: take-home vs the share already committed.
  if ((moment === "income" || moment === "spending") && s.income > 0) {
    const committed = r2(s.income - s.remaining);
    if (committed > 0) add({ id: "committed", kind: "did_you_know", priority: 35, title: `${pct1((committed / s.income) * 100)}% of your take-home is already committed`, body: `${gbp(committed)} of your ${gbp(s.income)} goes on the regular costs you’ve entered so far, leaving ${gbp(s.remaining)}.` });
  }

  // Spending: the biggest flexible cost, annualised, and what a change would do.
  if (moment === "spending") {
    const disc = p.discretionary.filter((i) => i.amount > 0).sort((a, b) => toMonthly(b.amount, b.freq) - toMonthly(a.amount, a.freq));
    const top = disc[0];
    if (top) {
      const m = r2(toMonthly(top.amount, top.freq));
      const cuts = spendingChange(m, s.remaining);
      add({
        id: "annualised", kind: "what_if", priority: 45, title: `${top.label}: ${gbp(m)} a month is ${gbp(annualise(m))} a year`,
        body: cuts.length ? `If this fell by ${gbp(cuts[Math.min(1, cuts.length - 1)].cut)} a month, your estimated monthly remaining would be ${gbp(cuts[Math.min(1, cuts.length - 1)].remainingAfter)}, assuming everything else stayed the same.` : "Small regular costs add up over a year.",
        chain: cuts.map((c) => `−${gbp(c.cut)}/month = ${gbp(c.perYear)} a year`),
        action: cuts.length ? { label: `Explore a ${gbp(cuts[Math.min(1, cuts.length - 1)].cut)}/month change`, does: "spendingCut" } : undefined,
      });
    }
    const subs = amountOf(p.discretionary, "subs");
    if (subs) add({ id: "subs", kind: "did_you_know", priority: 25, title: `Subscriptions: ${gbp(subs)} a month is ${gbp(annualise(subs))} a year`, body: "Recurring payments are easy to forget because each one is small." });
    if (ctx.repeated && ctx.repeated.amount > 0 && ctx.repeated.timesPerWeek > 0) {
      const r = repeatedPurchase(ctx.repeated.amount, ctx.repeated.timesPerWeek);
      add({ id: "repeated", kind: "did_you_know", priority: 50, title: `${gbp(ctx.repeated.amount)}, ${ctx.repeated.timesPerWeek} times a week, is about ${gbp(Math.round(r.year))} a year`, body: `A repeated ${gbp(ctx.repeated.amount)} purchase ${ctx.repeated.timesPerWeek} times a week adds up over time.`, chain: [`about ${gbp(r.week)} a week`, `about ${gbp(Math.round(r.month))} a month`, `about ${gbp(Math.round(r.year))} a year`] });
    }
  }

  // Borrowing: something changes when a debt ends.
  const end = nextDebtEnding(p);
  if (end && (moment === "borrowing" || moment === "snapshot" || moment === "finance" || moment === "deposit")) {
    const last = ctx.monthName(end.month - 1), next = ctx.monthName(end.month);
    add({
      id: "debt-ending", kind: "changes_soon", priority: end.month <= 3 || (moment !== "finance" && end.month <= 6) ? 80 : 55,
      title: `Your ${gbp(end.monthly)}/month ${debtNoun(end.debt)} ends in ${last}`,
      body: `Its last payment is in ${last}. From ${next}, that ${gbp(end.monthly)}/month of flexibility returns: your estimated monthly remaining could increase by ${gbp(end.monthly)}, assuming everything else stays the same.`,
      chain: [`${gbp(end.monthly)}/month`, "£0/month", `+${gbp(end.monthly)} remaining`],
      // Offered once a car is on the table (deposit/finance), so an early step never jumps ahead past the credit context.
      action: ctx.car && (moment === "deposit" || moment === "finance") ? { label: `What if I wait until ${last}?`, does: "waitLoan" } : undefined,
    });
  }
  if (moment === "borrowing" && s.debtPct !== null && s.debt > 0) add({ id: "debt-share", kind: "did_you_know", priority: 40, title: `Existing borrowing takes ${s.debtPct}% of your take-home`, body: `${gbp(s.debt)} of your ${gbp(s.income)} a month goes on repayments you already have.` });

  // Buffer: savings in context, not judged.
  if ((moment === "buffer" || moment === "snapshot") && s.buffer > 0 && s.monthsOfEssentials !== null) {
    add({ id: "buffer", kind: "did_you_know", priority: moment === "buffer" ? 60 : 30, title: `Your cash buffer in context: about ${s.monthsOfEssentials} months`, body: `The ${gbp(s.buffer)} you’ve told us about is equivalent to approximately ${s.monthsOfEssentials} months of the ${gbp(s.essentials)} essential monthly costs you’ve entered.`, chain: [`${gbp(s.buffer)} ÷ ${gbp(s.essentials)}`, `≈ ${s.monthsOfEssentials} months`] });
  }

  // Regular saving: contributions carried forward.
  if (moment === "longterm" || moment === "snapshot") {
    const saving = r2(sumItems(p.otherSaving.filter((i) => i.id === "regular")));
    if (saving > 0) {
      const pr = savingsProjection(saving);
      const more = savingsProjection(saving + 50);
      add({
        id: "saving", kind: "did_you_know", priority: moment === "longterm" ? 55 : 20,
        title: `At ${gbp(saving)} a month, that’s ${gbp(pr[1].total)} of contributions over 12 months`,
        body: "Assuming the same contribution continues, ignoring interest or returns.",
        chain: pr.map((x) => `${gbp(x.total)} in ${x.months} months`),
        whatIf: {
          label: "What if I saved £50 more?",
          title: `At ${gbp(saving + 50)} a month: ${gbp(more[1].total)} over 12 months (+${gbp(r2(more[1].total - pr[1].total))})`,
          chain: more.map((x) => `${gbp(x.total)} in ${x.months} months`),
        },
      });
    }
  }

  // Looking ahead: a bonus the bank doesn't know about.
  const bonus = ctx.events.filter((e) => e.recurrence === "one_off" && e.direction === "in").sort((a, b) => a.month - b.month)[0];
  if (bonus && ctx.car && (moment === "deposit" || moment === "finance")) {
    const what = bonus.label.trim() ? bonus.label.trim().charAt(0).toLowerCase() + bonus.label.trim().slice(1) : "one-off income";
    add({
      id: "bonus", kind: "looking_ahead", priority: bonus.month <= 3 ? 85 : 50,
      title: `You told us ${gbp(bonus.amount)} is expected ${bonus.month === 1 ? "next month" : `in ${ctx.monthName(bonus.month)}`}`,
      body: `This ${what} is one-off money, so it isn’t counted as regular income. You can see what waiting would change, and choose how much of it, if any, to put towards the deposit.`,
      action: { label: "What if I wait?", does: "waitBonus" },
    });
  }

  if (ctx.car) {
    const { price, deposit, scenario, depositFromSavings } = ctx.car;
    // The proposed payment against the month: below zero, or below the person's own buffer.
    if ((moment === "deposit" || moment === "finance") && scenario.amount > 0 && s.income > 0 && s.remaining >= 0) {
      const pc = paymentConsequence(s, schedule(scenario).regular, ctx.preferredBuffer);
      const chain = [`${gbp(pc.before)} remaining`, `−${gbp(pc.payment)}/month`, `${gbp(pc.after)}`];
      if (pc.after < 0) {
        add({ id: "after-negative", kind: "worth_noticing", priority: 98, title: `With this payment, regular costs would be ${gbp(-pc.after)} more than regular income`, body: `The ${gbp(pc.payment)}/month payment is more than the ${gbp(pc.before)} currently left each month. Your estimated monthly remaining would change from ${gbp(pc.before)} to ${gbp(pc.after)} under the information you’ve provided.`, chain });
      } else if (pc.bufferGap !== null && pc.bufferGap < 0) {
        add({ id: "below-buffer", kind: "compare", priority: 72, title: `${gbp(-pc.bufferGap)} below the monthly buffer you said you’d like to keep`, body: `With a ${gbp(pc.payment)}/month payment, your estimated monthly remaining would change from ${gbp(pc.before)} to ${gbp(pc.after)}. You said you’d like to keep ${gbp(pc.after - pc.bufferGap)} uncommitted each month.`, chain });
      }
    }
    // Deposit: borrowing and cash both change.
    if (moment === "deposit" && deposit > 0) {
      const sav = savingsConsequence(s.buffer, depositFromSavings ? deposit : 0);
      const cash = !depositFromSavings ? "" : sav.shortfall > 0 || sav.before === 0
        ? ` Your cash savings: ${sav.sentence.charAt(0).toLowerCase()}${sav.sentence.slice(1)}`
        : ` Your cash savings: ${gbp(sav.before)} − ${gbp(sav.deposit)} = ${gbp(sav.after)} remaining.`;
      const keep = depositFromSavings && sav.before > 1000 && sav.after < 1000;
      add({
        id: "deposit-two", kind: "two_things", priority: depositFromSavings && sav.before > 0 && sav.after === 0 ? 95 : 70,
        title: "A deposit changes two things",
        body: `Your borrowing: ${gbp(price)} − ${gbp(deposit)} = ${gbp(Math.max(0, price - deposit))} financed.${cash} A larger deposit reduces the amount financed, while also using more cash upfront.`,
        action: keep
          ? { label: `What if I kept ${gbp(1000)} of my savings?`, does: "keepCash" }
          : depositFromSavings && sav.before > 0 && sav.before <= 1000 && sav.usedPct !== null && sav.usedPct >= 80 ? { label: "Try a smaller deposit", does: "smallerDeposit" } : undefined,
      });
    }
    // Price: what if it changed?
    // Price in context of income, before any deposit is known.
    if (moment === "price" && s.income > 0) add({ id: "price-context", kind: "did_you_know", priority: 40, title: `${gbp(price)} is about ${pct1(price / s.income)} months of your take-home income`, body: `Based on the ${gbp(s.income)} a month you’ve told us about. Next, we’ll look at how it could be paid for and what that changes.` });
    if (moment === "deposit" && deposit > 0 && price > 2000) {
      const pc = priceChange(s, scenario, price, deposit, price - 2000);
      add({ id: "price", kind: "what_if", priority: 35, title: `What if the price were ${gbp(price - 2000)}?`, body: `With the same ${gbp(deposit)} deposit and ${scenario.apr}% over ${scenario.term} months, the monthly payment would be ${gbp(pc.b.monthly)} instead of ${gbp(pc.a.monthly)}, the total repaid ${gbp(Math.round(pc.b.total))} instead of ${gbp(Math.round(pc.a.total))}, the borrowing cost ${gbp(Math.round(pc.b.cost))} instead of ${gbp(Math.round(pc.a.cost))}, and your estimated monthly remaining ${gbp(pc.b.remainingAfter)} instead of ${gbp(pc.a.remainingAfter)}.`, chain: [`${gbp(pc.financeBefore)} → ${gbp(pc.financeAfter)} financed`, `${gbp(pc.a.monthly)} → ${gbp(pc.b.monthly)} a month`], action: { label: "See it as a what-if", does: "cheaperCar" } });
    }
    // Finance: what the APR means here, and the term trade-off.
    if (moment === "finance" && scenario.amount > 0) {
      const sch = schedule(scenario);
      const rates = aprComparison(s, scenario, ctx.preferredBuffer);
      const lo = rates.rows[0], hi = rates.rows[rates.rows.length - 1];
      add({ id: "apr", kind: "compare", priority: 75, title: `What does ${scenario.apr}% mean here?`, body: `On ${gbp(scenario.amount)} over ${scenario.term} months: ${gbp(sch.regular)} a month, ${gbp(Math.round(sch.total))} in total, ${gbp(Math.round(sch.cost))} borrowing cost. Between the illustrative ${lo.apr}% and ${hi.apr}% scenarios, the borrowing cost differs by about ${gbp(Math.round(hi.cost - lo.cost))}.`, chain: rates.rows.map((r) => `${r.apr}%: ${gbp(r.monthly)}/m`), action: { label: "What if the rate were 2 points lower?", does: "aprDown" } });
      const other = otherTerm(scenario.term);
      const t = termConsequence(s, scenario, scenario.term, other, ctx.preferredBuffer);
      add({
        id: "term", kind: "compare", priority: 50, title: `${scenario.term} vs ${other} months changes more than the payment`,
        body: termSentence(t.a, t.b),
        chain: [`${scenario.term}m: ${gbp(t.a.monthly)}/m, ${gbp(Math.round(t.a.cost))} cost`, `${other}m: ${gbp(t.b.monthly)}/m, ${gbp(Math.round(t.b.cost))} cost`],
        action: other === 48 ? { label: "Compare 48 months", does: "term48" } : other === 60 ? { label: "Compare 60 months", does: "term60" } : undefined,
      });
    }
  }

  return out.sort((a, b) => b.priority - a.priority);
}

/** Words an insight must never use. */
export const INSTRUCTION_WORDS = /\b(you should|you must|you need to|stop (eating|spending)|don'?t buy|safe|unsafe|affordable|unaffordable|bad decision|good decision)\b/i;
