import type { Goal } from "./journey";

// "Not sure where to start?": three questions that point to places in the app, never to financial products.

export type Mind = "buy" | "owe" | "ahead" | "offer" | "unsure";
export type Feel = "comfortable" | "okay" | "tight" | "struggling";
export type When = "now" | "months" | "later" | "exploring";

export interface Answers { mind?: Mind; feel?: Feel; when?: When; buy?: Goal }

export const MIND: Record<Mind, string> = {
  buy: "Buying or paying for something",
  owe: "Getting on top of what I already pay or owe",
  ahead: "Planning ahead or making my money go further",
  offer: "I’ve been offered something and want to understand it",
  unsure: "I’m not sure yet",
};
export const FEEL: Record<Feel, string> = {
  comfortable: "Comfortable",
  okay: "Okay, but I keep an eye on it",
  tight: "Tight most months",
  struggling: "I’m struggling",
};
export const WHEN: Record<When, string> = {
  now: "Now",
  months: "In the next few months",
  later: "Later this year or beyond",
  exploring: "I’m just exploring",
};

export interface Suggestion { id: string; title: string; why: string; href?: string; goal?: Goal; help?: boolean }

/** Up to four places to start, most relevant first. Free help comes first whenever money is a struggle. */
export function suggest(a: Answers): Suggestion[] {
  const out: Suggestion[] = [];
  const add = (x: Suggestion) => { if (!out.some((o) => o.id === x.id)) out.push(x); };

  if (a.feel === "struggling") {
    add({ id: "help", title: "Talk to someone, free", why: "MoneyHelper (0800 138 7777) and StepChange (0800 138 1111) give free, confidential help. You don’t need to be in debt to call.", help: true });
  }
  if (a.feel === "struggling" || a.feel === "tight") {
    add({ id: "map", title: "See everything you already pay", why: "Your commitments on one timeline shows what goes out each month and when things end.", href: "/commitments" });
  }

  switch (a.mind) {
    case "buy":
      if (a.buy) add({ id: `goal-${a.buy}`, title: "Plan it step by step", why: "Walk through the cost, your month and the ways to pay, before you commit.", goal: a.buy });
      if (a.when === "later" || a.when === "exploring") add({ id: "save", title: "Saving towards it instead", why: "See what putting money aside each month adds up to by the time you need it.", goal: "invest" });
      if (a.when === "now") add({ id: "decode", title: "Check an offer you’ve been given", why: "Paste or snap the terms and see the real cost and the small print.", href: "/cost-checker#paste" });
      add({ id: "reverse", title: "What could a monthly budget cover?", why: "Start from what you can afford each month and see what it means over different lengths.", href: "/reverse" });
      break;
    case "owe":
      add({ id: "map", title: "See everything you already pay", why: "Your commitments on one timeline, with the monthly total and when each one ends.", href: "/commitments" });
      add({ id: "card", title: "Check a credit card or overdraft", why: "See how long it takes to clear and what minimum payments really cost.", href: "/cost-checker?type=card" });
      add({ id: "learn-min", title: "Why minimum payments take so long", why: "A short explainer with a real example.", href: "/learn#minimum" });
      break;
    case "ahead":
      add({ id: "save", title: "See how saving or investing could grow", why: "An illustration over the years, with risks explained. Not advice.", goal: "invest" });
      add({ id: "map", title: "See everything you already pay", why: "Knowing what’s committed makes it easier to plan what’s left.", href: "/commitments" });
      add({ id: "rates", title: "Where interest rates are now", why: "Bank Rate affects savings and borrowing.", href: "/rates" });
      break;
    case "offer":
      add({ id: "decode", title: "Decode the offer", why: "Paste or snap the terms: real cost, hidden conditions and the exact sentences behind them.", href: "/cost-checker#paste" });
      add({ id: "diff", title: "Got two offers? Compare them", why: "Clause by clause, with the biggest differences listed.", href: "/diff" });
      break;
    default:
      add({ id: "goals", title: "Have a look at what people plan", why: "Buying a car or a home, borrowing, a big purchase or saving. Pick one to explore, nothing is committed.", href: "/#dashboard" });
      add({ id: "learn", title: "Learn the words first", why: "APR, EAR, minimum payments and more, in plain English.", href: "/learn" });
      add({ id: "map", title: "See everything you already pay", why: "A calm place to start: what goes out each month.", href: "/commitments" });
  }
  return out.slice(0, 4);
}
