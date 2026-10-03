import { dur, money, pct } from "./format";

export type ProductType = "loan" | "card" | "overdraft" | "bnpl" | "subscription" | "household";
export type Values = Record<string, number | string>;

export interface Field {
  id: string;
  label: string;
  pre?: string;
  post?: string;
  def: number | string;
  step?: number;
  help?: string;
  type?: "number" | "select";
  options?: [string, string][];
  showIf?: (v: Values) => boolean;
}

export interface Product {
  label: string;
  blurb: string;
  /** Credit products have an amount borrowed; bills and subscriptions don't. */
  credit: boolean;
  fields: Field[];
}

export const PRODUCT_TYPES: ProductType[] = ["loan", "card", "overdraft", "bnpl", "subscription", "household"];

export const PRODUCTS: Record<ProductType, Product> = {
  loan: {
    label: "Loan", blurb: "Personal loan, car or store finance", credit: true,
    fields: [
      { id: "amount", label: "Amount borrowed", pre: "£", def: 5000, step: 100 },
      { id: "apr", label: "Interest rate (APR)", post: "%", def: 9.9, step: 0.1, help: "The yearly cost of borrowing. Lenders must show this." },
      { id: "term", label: "Repayment term", post: "months", def: 48, step: 1 },
      { id: "fee", label: "Arrangement fee", pre: "£", def: 0, step: 5, help: "Any one-off fee to set the loan up." },
      { id: "lateFee", label: "Late payment fee", pre: "£", def: 12, step: 1 },
    ],
  },
  card: {
    label: "Credit card", blurb: "Paying off a card balance", credit: true,
    fields: [
      { id: "balance", label: "Balance you will owe", pre: "£", def: 1200, step: 50 },
      { id: "apr", label: "Purchase rate (APR)", post: "%", def: 24.9, step: 0.1, help: "The rate charged on what you spend, once any 0% offer ends." },
      { id: "intro", label: "0% interest period", post: "months", def: 0, step: 1, help: "Put 0 if there is no introductory offer." },
      { id: "payType", label: "How you plan to repay", type: "select", def: "fixed", options: [["fixed", "A fixed amount each month"], ["min", "Only the minimum payment"]] },
      { id: "fixedPay", label: "Fixed monthly payment", pre: "£", def: 50, step: 5, showIf: (v) => v.payType === "fixed" },
      { id: "annualFee", label: "Annual fee", pre: "£", def: 0, step: 1 },
      { id: "lateFee", label: "Late payment fee", pre: "£", def: 12, step: 1 },
    ],
  },
  overdraft: {
    label: "Overdraft", blurb: "Going below £0 in your account", credit: true,
    fields: [
      { id: "amount", label: "How far overdrawn", pre: "£", def: 800, step: 50 },
      { id: "ear", label: "Overdraft rate (EAR)", post: "%", def: 39.9, step: 0.1, help: "EAR is the yearly interest rate on an overdraft. Many UK banks charge around 35–40%." },
      { id: "buffer", label: "Interest-free buffer", pre: "£", def: 0, step: 25, help: "Some accounts charge nothing on the first part of the overdraft." },
      { id: "repay", label: "Amount you can pay back each month", pre: "£", def: 100, step: 10 },
      { id: "monthlyFee", label: "Monthly account fee", pre: "£", def: 0, step: 1 },
    ],
  },
  bnpl: {
    label: "Buy Now Pay Later", blurb: "Split a purchase into instalments", credit: true,
    fields: [
      { id: "price", label: "Purchase price", pre: "£", def: 1200, step: 10 },
      { id: "n", label: "Number of instalments", post: "payments", def: 3, step: 1 },
      { id: "interval", label: "How often you pay", type: "select", def: "month", options: [["month", "Monthly"], ["fortnight", "Every two weeks"]] },
      { id: "apr", label: "Interest (APR)", post: "%", def: 0, step: 0.1, help: "Pay-in-3 plans are usually 0%. Longer “pay monthly” plans often charge interest." },
      { id: "lateFee", label: "Late fee per missed payment", pre: "£", def: 5, step: 1 },
      { id: "missed", label: "“What if” I miss this many payments", post: "missed", def: 0, step: 1, help: "A stress test. Leave at 0 for the normal plan." },
    ],
  },
  subscription: {
    label: "Subscription", blurb: "Streaming, gym, apps, boxes", credit: false,
    fields: [
      { id: "monthly", label: "Full monthly price", pre: "£", def: 14.99, step: 0.5 },
      { id: "introPrice", label: "Introductory price", pre: "£", def: 4.99, step: 0.5, help: "The deal price at the start. Same as the full price if there is no deal." },
      { id: "introMonths", label: "Introductory period", post: "months", def: 3, step: 1 },
      { id: "rise", label: "Expected yearly price rise", post: "%", def: 5, step: 0.5 },
      { id: "years", label: "How long you might keep it", post: "years", def: 3, step: 1 },
      { id: "cancelFee", label: "Cancellation fee", pre: "£", def: 0, step: 1 },
    ],
  },
  household: {
    label: "Household bill", blurb: "Phone, broadband, energy contract", credit: false,
    fields: [
      { id: "monthly", label: "Monthly price", pre: "£", def: 32, step: 0.5 },
      { id: "upfront", label: "Upfront cost", pre: "£", def: 49, step: 1 },
      { id: "term", label: "Contract length", post: "months", def: 24, step: 1 },
      { id: "riseAmt", label: "Yearly price rise", pre: "£", post: "/month", def: 3, step: 0.5, help: "Many UK phone and broadband contracts state rises in pounds and pence, usually each April." },
      { id: "exitFee", label: "Fee to leave early", pre: "£", def: 180, step: 5 },
    ],
  },
};

export const GLOSSARY: Record<ProductType, [string, string][]> = {
  loan: [
    ["APR", "Annual Percentage Rate. The yearly cost of borrowing, including most fees. Use it to compare like with like."],
    ["Representative APR", "The rate at least half of approved customers get. You might be offered more."],
    ["Total amount payable", "Everything you will pay back, including interest and fees."],
  ],
  card: [
    ["Minimum payment", "The smallest amount you must pay each month. Paying only this keeps you in debt much longer."],
    ["Introductory 0%", "A period with no interest. After it ends, the normal APR applies to anything left."],
    ["Persistent debt", "The FCA term for paying more in interest and fees than you repay over 18 months. Your card provider must contact you if this happens."],
  ],
  overdraft: [
    ["EAR", "Equivalent Annual Rate. How overdraft interest is shown. It works like a yearly interest rate."],
    ["Arranged overdraft", "An overdraft agreed with your bank in advance. Going past the limit can lead to refused payments."],
    ["Buffer", "An amount you can be overdrawn without paying interest."],
  ],
  bnpl: [
    ["Instalment", "One of the equal payments you split the price into."],
    ["Late fee", "A charge if a payment fails. Missed payments can also be reported to credit reference agencies."],
    ["Pay monthly plan", "A longer BNPL plan that may charge interest, unlike most pay-in-3 plans."],
  ],
  subscription: [
    ["Introductory price", "A lower starting price that rises automatically unless you cancel."],
    ["Auto-renewal", "The subscription continues and charges you until you cancel it."],
    ["Notice period", "How long before cancelling takes effect."],
  ],
  household: [
    ["Minimum term", "The length of contract you are committed to."],
    ["Early exit fee", "What you pay to leave before the contract ends. Often close to the remaining payments."],
    ["Mid-contract price rise", "A price increase built into the contract, often each April."],
  ],
};

export function isProductType(t: unknown): t is ProductType {
  return typeof t === "string" && (PRODUCT_TYPES as string[]).includes(t);
}

export function defaults(type: ProductType): Values {
  return Object.fromEntries(PRODUCTS[type].fields.map((f) => [f.id, f.def]));
}

export function visibleFields(type: ProductType, v: Values): Field[] {
  return PRODUCTS[type].fields.filter((f) => !f.showIf || f.showIf(v));
}

/* ---------- simulation ---------- */

export interface Point { t: number; pay: number; interest: number; fee: number; bal: number; cum: number }
export interface Metrics {
  s: Point[];
  principal: number;
  total: number;
  interest: number;
  fees: number;
  /** A typical payment once the plan is running. */
  regular: number;
  /** What leaves your account in the first three months. */
  next3: number;
  /** Months until the last payment. */
  end: number;
  /** Credit: total minus borrowed. Bills: total minus the advertised price. */
  onTop: number;
  /** True when payments never clear the balance within the cap. */
  never: boolean;
  left: number;
  advertised: number;
  headlineTotal: number;
}

const n = (x: number | string | undefined) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};
/** Monthly rate equivalent to an annual percentage rate. */
export const monthlyRate = (apr: number) => Math.pow(1 + apr / 100, 1 / 12) - 1;
const annuity = (p: number, r: number, k: number) => (r ? (p * r) / (1 - Math.pow(1 + r, -k)) : p / k);

export const CARD_CAP_MONTHS = 360;
export const OVERDRAFT_CAP_MONTHS = 120;

export function simulate(type: ProductType, v: Values): Metrics {
  const s: Omit<Point, "cum">[] = [];
  let principal = 0, never = false, left = 0, advertised = 0, headlineTotal = 0;

  if (type === "loan") {
    principal = n(v.amount);
    const r = monthlyRate(n(v.apr)), k = Math.max(1, Math.round(n(v.term) || 1));
    const pay = annuity(principal, r, k);
    if (n(v.fee)) s.push({ t: 0, pay: n(v.fee), interest: 0, fee: n(v.fee), bal: principal });
    let bal = principal;
    for (let i = 1; i <= k; i++) {
      const int = bal * r;
      bal = bal + int - pay;
      s.push({ t: i, pay, interest: int, fee: 0, bal: Math.max(0, bal) });
    }
  } else if (type === "card") {
    principal = n(v.balance);
    const r = monthlyRate(n(v.apr)), intro = n(v.intro);
    let bal = principal, i = 0;
    while (bal > 0.005 && i < CARD_CAP_MONTHS) {
      i++;
      const pre = bal;
      const int = i <= intro ? 0 : bal * r;
      const fee = n(v.annualFee) > 0 && (i - 1) % 12 === 0 ? n(v.annualFee) : 0;
      bal += int + fee;
      // Common UK minimum: the greater of £25 or 1% of the balance plus interest and fees.
      let pay = v.payType === "min" ? Math.max(25, pre * 0.01 + int + fee) : n(v.fixedPay);
      pay = Math.min(pay, bal);
      bal -= pay;
      s.push({ t: i, pay, interest: int, fee, bal });
    }
    never = bal > 0.005;
    left = bal;
  } else if (type === "overdraft") {
    principal = n(v.amount);
    const r = monthlyRate(n(v.ear)), buf = n(v.buffer);
    let bal = principal, i = 0;
    while (bal > 0.005 && i < OVERDRAFT_CAP_MONTHS) {
      i++;
      const int = Math.max(0, bal - buf) * r, fee = n(v.monthlyFee);
      bal += int + fee;
      const pay = Math.min(n(v.repay), bal);
      bal -= pay;
      s.push({ t: i, pay, interest: int, fee, bal });
    }
    never = bal > 0.005;
    left = bal;
  } else if (type === "bnpl") {
    principal = n(v.price);
    const k = Math.max(1, Math.round(n(v.n) || 1));
    const per = v.interval === "fortnight" ? 14 / 30.44 : 1;
    const r = n(v.apr) > 0 ? monthlyRate(n(v.apr)) : 0;
    const pay = annuity(principal, r, k);
    const missed = Math.min(k, Math.max(0, Math.round(n(v.missed))));
    let bal = principal;
    for (let i = 1; i <= k; i++) {
      // Interest-free pay-in-N plans usually take the first payment at checkout.
      const t = r ? i * per : (i - 1) * per;
      const int = bal * r;
      bal = bal + int - pay;
      const fee = i <= missed ? n(v.lateFee) : 0;
      s.push({ t, pay: pay + fee, interest: int, fee, bal: Math.max(0, bal) });
    }
  } else if (type === "subscription") {
    const months = Math.max(1, Math.round(n(v.years || 1) * 12)), im = n(v.introMonths);
    for (let m = 1; m <= months; m++) {
      const price = m <= im ? n(v.introPrice) : n(v.monthly) * Math.pow(1 + n(v.rise) / 100, Math.floor((m - 1) / 12));
      s.push({ t: m - 1, pay: price, interest: 0, fee: 0, bal: 0 });
    }
    advertised = im ? n(v.introPrice) : n(v.monthly);
    headlineTotal = advertised * months;
  } else {
    const k = Math.max(1, Math.round(n(v.term) || 1));
    if (n(v.upfront)) s.push({ t: 0, pay: n(v.upfront), interest: 0, fee: 0, bal: 0 });
    for (let m = 1; m <= k; m++) {
      s.push({ t: m, pay: n(v.monthly) + n(v.riseAmt) * Math.floor((m - 1) / 12), interest: 0, fee: 0, bal: 0 });
    }
    advertised = n(v.monthly);
    headlineTotal = advertised * k + n(v.upfront);
  }

  s.sort((a, b) => a.t - b.t);
  let cum = 0;
  const pts: Point[] = s.map((p) => ({ ...p, cum: (cum += p.pay) }));
  const total = cum;
  const interest = pts.reduce((a, p) => a + p.interest, 0);
  const fees = pts.reduce((a, p) => a + p.fee, 0);
  const regularPts = pts.filter((p) => p.t > 0 || type === "bnpl" || type === "subscription");
  const regular = regularPts.length ? regularPts[Math.min(1, regularPts.length - 1)].pay : 0;
  // Plans that take the first regular payment at the start (subscriptions, interest-free BNPL) cover
  // three months with payments at t = 0, 1, 2; the rest pay at the end of months 1, 2, 3.
  const startsNow = type === "subscription" || (type === "bnpl" && !(n(v.apr) > 0));
  const next3 = pts.filter((p) => (startsNow ? p.t < 3 : p.t <= 3)).reduce((a, p) => a + p.pay, 0);
  const end = pts.length ? pts[pts.length - 1].t + (type === "subscription" ? 1 : 0) : 0;
  const onTop = PRODUCTS[type].credit ? total - principal : total - headlineTotal;
  return { s: pts, principal, total, interest, fees, regular, next3, end, onTop, never, left, advertised, headlineTotal };
}

/* ---------- plain English ---------- */

/** Paragraphs with **marked** key figures. */
export function explain(type: ProductType, v: Values, m: Metrics): string[] {
  const P: string[] = [];
  const b = (x: string) => `**${x}**`;
  if (type === "loan") {
    P.push(`You borrow ${b(money(m.principal))} and pay ${b(money(m.regular, true))} every month for ${dur(n(v.term))}.`);
    P.push(`By the end you will have paid back ${b(money(m.total))}. That is ${money(m.onTop)} more than you borrowed${n(v.fee) ? `, including a ${money(n(v.fee))} fee at the start` : ""}.`);
    if (m.principal > 0) P.push(`Each £1 you borrow costs you about ${Math.round((m.onTop / m.principal) * 100)}p on top. A shorter term means bigger monthly payments but less interest overall.`);
  }
  if (type === "card") {
    if (m.never) P.push(`At ${money(n(v.fixedPay))} a month you would ${b("never clear this balance")}. The interest added each month is bigger than, or nearly as big as, your payment.`);
    else P.push(`You owe ${b(money(m.principal))}. ${v.payType === "min" ? "Paying only the minimum" : `Paying ${money(n(v.fixedPay))} a month`}, it takes ${b(dur(m.end))} to clear.`);
    if (n(v.intro)) P.push(`For the first ${n(v.intro)} months there is no interest. After that, ${pct(n(v.apr))} APR applies to whatever is left.`);
    if (!m.never) P.push(`In total you pay ${b(money(m.total))}, of which ${money(m.interest)} is interest${m.fees ? ` and ${money(m.fees)} is fees` : ""}.`);
    if (v.payType === "min") P.push("Minimum payments shrink as the balance shrinks, which is why it takes so long. Paying a fixed amount clears it faster.");
  }
  if (type === "overdraft") {
    const firstInt = Math.max(0, n(v.amount) - n(v.buffer)) * monthlyRate(n(v.ear));
    P.push(`Being ${money(n(v.amount))} overdrawn costs about ${b(money(firstInt, true))} in interest in the first month${n(v.buffer) ? ` (the first ${money(n(v.buffer))} is interest-free)` : ""}.`);
    if (m.never) P.push(`Paying back ${money(n(v.repay))} a month is ${b("not enough to clear it")}: the interest and fees keep up with your payments.`);
    else P.push(`Paying back ${money(n(v.repay))} a month, you are back above £0 in ${b(dur(m.end))} and pay ${money(m.onTop)} in interest and fees.`);
    P.push(`Overdrafts are designed for short, unexpected gaps. At around ${pct(n(v.ear))}, they cost more than most loans or cards for longer borrowing.`);
  }
  if (type === "bnpl") {
    const per = v.interval === "fortnight" ? "every two weeks" : "each month";
    const count = Math.max(1, n(v.n));
    P.push(`You split ${b(money(m.principal))} into ${count} payments of ${b(money((m.total - m.fees) / count, true))}, paid ${per}.`);
    P.push(n(v.apr) > 0 ? `This plan charges ${pct(n(v.apr))} interest, so you pay back ${money(m.total - m.fees)} in total.` : "There is no interest if every payment goes through on time.");
    if (n(v.missed)) P.push(`If you miss ${n(v.missed)} payment${n(v.missed) > 1 ? "s" : ""}, late fees add ${b(money(m.fees))}, and the missed payment may show on your credit file.`);
    P.push(`The whole amount is ${m.end < 1 ? "due within a month" : `paid off in about ${dur(m.end)}`}. It feels like a small cost, but it is still borrowing.`);
  }
  if (type === "subscription") {
    const im = n(v.introMonths), years = n(v.years) || 1;
    if (im) P.push(`It starts at ${b(money(n(v.introPrice), true))} a month for ${im} months, then goes up to ${b(money(n(v.monthly), true))} automatically unless you cancel.`);
    else P.push(`It costs ${b(money(n(v.monthly), true))} a month.`);
    P.push(`If you keep it for ${dur(years * 12)}${n(v.rise) ? ` and the price rises by ${pct(n(v.rise))} a year` : ""}, you pay ${b(money(m.total))} in total.`);
    P.push(`That is ${money(m.total / (years * 52), true)} a week on average.`);
  }
  if (type === "household") {
    P.push(`You commit to ${b(dur(n(v.term)))} at ${money(n(v.monthly), true)} a month${n(v.upfront) ? `, plus ${money(n(v.upfront))} upfront` : ""}.`);
    if (n(v.riseAmt)) P.push(`The price goes up by ${money(n(v.riseAmt), true)} a month each year, so by the final year you pay ${b(money(n(v.monthly) + n(v.riseAmt) * Math.floor((n(v.term) - 1) / 12), true))} a month.`);
    P.push(`Over the whole contract you pay ${b(money(m.total))}. Leaving early costs ${money(n(v.exitFee))}.`);
  }
  return P;
}

/* ---------- risks ---------- */

export type RiskLevel = "high" | "watch" | "info";
export interface Risk { lvl: RiskLevel; title: string; body: string }
export const RISK_LABEL: Record<RiskLevel, string> = { high: "Watch out", watch: "Check", info: "Good to know" };

/** Monthly-equivalent payment, used for the affordability check. */
export function monthlyEquivalent(type: ProductType, v: Values, m: Metrics): number {
  return type === "bnpl" && v.interval === "fortnight" ? m.regular * 2.17 : m.regular;
}

export function risks(type: ProductType, v: Values, m: Metrics, spare = 0): Risk[] {
  const R: Risk[] = [];
  const add = (lvl: RiskLevel, title: string, body: string) => R.push({ lvl, title, body });

  if (type === "loan") {
    if (n(v.apr) >= 30) add("high", "This is high-cost credit", `At ${pct(n(v.apr))} APR, borrowing is expensive. Check whether a lower-rate option is available to you.`);
    if (n(v.fee) > 0) add("watch", "There is an upfront fee", `${money(n(v.fee))} is charged at the start. Some adverts show the rate without it.`);
    if (n(v.term) > 24) {
      const shorter = Math.max(12, n(v.term) - 24);
      const alt = simulate("loan", { ...v, term: shorter });
      add("watch", "A longer term costs more overall", `Over ${dur(shorter)} instead, payments rise to ${money(alt.regular, true)} a month, but you save ${money(m.total - alt.total)} in interest.`);
    }
    add("info", "Paying off early", "You have the right to repay a loan early. The lender can charge up to 1–2 months’ interest for doing so. Ask what it would be.");
    add("info", "Missing a payment", `A ${money(n(v.lateFee))} late fee, plus a mark on your credit file that can make future borrowing harder or dearer.`);
  }
  if (type === "card") {
    if (m.never) add("high", "Your payment never clears the balance", `After 30 years you would still owe ${money(m.left)}. Try a higher monthly amount to see when it clears.`);
    if (v.payType === "min" && !m.never && m.principal > 0) add("high", "Minimum payments only", `It takes ${dur(m.end)} and costs ${money(m.interest)} in interest. That is ${Math.round((m.interest / m.principal) * 100)}% of what you spent.`);
    const first18 = m.s.filter((p) => p.t <= 18);
    const cost18 = first18.reduce((a, p) => a + p.interest + p.fee, 0);
    const paid18 = first18.reduce((a, p) => a + p.pay, 0);
    if (m.s.length >= 18 && cost18 > paid18 - cost18) add("high", "Risk of “persistent debt”", `In the first 18 months you’d pay ${money(cost18)} in interest and fees but only ${money(paid18 - cost18)} off the balance.`);
    if (n(v.intro) > 0) {
      const at = m.s.find((p) => p.t === n(v.intro));
      if (at && at.bal > 0) add("watch", `The 0% offer ends after month ${n(v.intro)}`, `You’d still owe ${money(at.bal)} at that point, and ${pct(n(v.apr))} APR starts on it.`);
    }
    if (n(v.annualFee) > 0) add("watch", "Annual fee", `${money(n(v.annualFee))} a year is added to your balance while you have the card.`);
    add("info", "Late or missed payments", `A ${money(n(v.lateFee))} fee, and you can lose any 0% offer. It may also be reported to credit reference agencies.`);
  }
  if (type === "overdraft") {
    if (n(v.ear) >= 30) add("high", "Expensive for longer borrowing", `${pct(n(v.ear))} EAR is higher than most personal loans and many credit cards.`);
    if (m.never) add("high", "Payments don’t reduce the overdraft", "Interest and fees match your repayment, so the balance stays put.");
    else if (m.end > 6) add("watch", "Using it for more than a few months", `Overdrafts suit short gaps. Staying overdrawn for ${dur(m.end)} costs ${money(m.onTop)}.`);
    add("watch", "Going over your limit", "Payments can be refused, and returned payments can lead to missed bills. Ask your bank about alerts.");
    add("info", "Your bank must help if you struggle", "Banks should contact customers who use their overdraft heavily and offer support. You can ask for help first.");
  }
  if (type === "bnpl") {
    if (n(v.missed) > 0) add("high", "Missed payments add up", `${n(v.missed)} missed payment${n(v.missed) > 1 ? "s" : ""} add ${money(m.fees)} in late fees and may be reported to credit reference agencies.`);
    if (n(v.apr) > 0) add("watch", "This plan charges interest", `At ${pct(n(v.apr))} APR you pay ${money(m.interest)} more than the price.`);
    if (v.interval === "fortnight") add("watch", "Payments come round quickly", "A payment every two weeks can clash with when you get paid. Check the dates line up with your income.");
    add("watch", "Several plans at once", "Each plan looks small, but three or four running together can take a big share of your month. Add up every plan you have.");
    add("info", "It is still borrowing", "Providers may check your credit before lending and can report how you repay. A refund or return does not stop payments automatically.");
  }
  if (type === "subscription") {
    if (n(v.introMonths) > 0 && n(v.monthly) > n(v.introPrice)) add("watch", `Price jumps after month ${n(v.introMonths)}`, `From ${money(n(v.introPrice), true)} to ${money(n(v.monthly), true)} a month. Set a reminder before the offer ends.`);
    if (n(v.rise) > 0) add("watch", "Yearly price rises", `At ${pct(n(v.rise))} a year, the monthly price could reach ${money(n(v.monthly) * Math.pow(1 + n(v.rise) / 100, Math.max(0, (n(v.years) || 1) - 1)), true)} by year ${n(v.years) || 1}.`);
    if (n(v.cancelFee) > 0) add("watch", "It costs money to leave", `A ${money(n(v.cancelFee))} cancellation fee applies. Check the notice period too.`);
    add("info", "It renews automatically", "You keep paying until you cancel. Check you can cancel online as easily as you signed up.");
  }
  if (type === "household") {
    add("watch", `You are locked in for ${dur(n(v.term))}`, `Leaving early costs ${money(n(v.exitFee))}. Moving home or a change in income doesn’t automatically end the contract.`);
    if (n(v.riseAmt) > 0) add("watch", "Built-in price rises", `${money(n(v.riseAmt), true)} a month extra each year adds ${money(m.onTop)} over the contract compared with the advertised price.`);
    add("info", "When the contract ends", "Prices often go up after the minimum term. Providers must tell you when it ends, so look out for that message and compare deals.");
  }
  if (spare > 0) {
    const monthly = monthlyEquivalent(type, v, m);
    const share = monthly / spare;
    if (share > 1) add("high", "More than your spare money", `About ${money(monthly)} a month is more than the ${money(spare)} you have left after bills.`);
    else if (share > 0.3) add("watch", "A big share of your spare money", `About ${money(monthly)} a month is ${Math.round(share * 100)}% of what you have left after bills. Think about what happens if costs go up.`);
    else add("info", "Fits within your spare money", `About ${money(monthly)} a month is ${Math.round(share * 100)}% of what you have left after bills.`);
  }
  const order: Record<RiskLevel, number> = { high: 0, watch: 1, info: 2 };
  return R.sort((a, b) => order[a.lvl] - order[b.lvl]);
}

export function suggestName(type: ProductType, v: Values): string {
  switch (type) {
    case "loan": return `Loan, ${v.term} months at ${v.apr}%`;
    case "card": return v.payType === "min" ? "Card, minimum payments" : `Card, £${v.fixedPay} a month`;
    case "overdraft": return `Overdraft, £${v.repay} a month`;
    case "bnpl": return `BNPL, ${v.n} payments`;
    case "subscription": return `Subscription, ${v.years} years`;
    case "household": return `Contract, ${v.term} months`;
  }
}

/* ---------- examples ---------- */

export interface SavedOption { id: string; name: string; type: ProductType; values: Values; example?: boolean }

export const EXAMPLES: SavedOption[] = [
  { id: "ex1", name: "Pay in 3 (BNPL)", type: "bnpl", values: { price: 1200, n: 3, interval: "month", apr: 0, lateFee: 5, missed: 0 }, example: true },
  { id: "ex2", name: "Credit card, £50 a month", type: "card", values: { balance: 1200, apr: 24.9, intro: 0, payType: "fixed", fixedPay: 50, annualFee: 0, lateFee: 12 }, example: true },
  { id: "ex3", name: "Store finance, 24 months", type: "loan", values: { amount: 1200, apr: 19.9, term: 24, fee: 0, lateFee: 12 }, example: true },
];
