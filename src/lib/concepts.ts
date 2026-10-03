// Short, fixed explainers for the ideas people most often find confusing. Written by us, not generated,
// so the learning nudge and the misconceptions list never depend on the AI.

export interface Concept {
  id: string;
  title: string;
  /** Spots the concept in a person's question. */
  match: RegExp;
  explain: string;
  example: string;
  misconception: string;
  check: { q: string; options: string[]; answer: number; why: string };
}

export const CONCEPTS: Concept[] = [
  {
    id: "apr",
    title: "APR",
    match: /\bapr\b|annual percentage|interest rate/i,
    explain: "APR is the yearly cost of borrowing, including most fees, shown as a percentage. It lets you compare offers like for like, but it isn’t a price in pounds.",
    example: "£1,000 at 20% APR repaid over a year costs about £100 in interest, not £200, because you pay the balance down as you go.",
    misconception: "“20% APR means I pay back 20% more.” The real cost depends on how long you borrow for and how fast you repay.",
    check: { q: "Two loans have the same APR. One lasts 2 years, the other 5. Which costs more in total?", options: ["They cost the same", "The 5-year loan", "The 2-year loan"], answer: 1, why: "The same rate charged for longer adds up to more interest overall." },
  },
  {
    id: "minimum",
    title: "Minimum payments",
    match: /minimum (payment|repayment)|just the minimum|only the minimum/i,
    explain: "A credit card’s minimum payment is set to keep the account up to date, not to clear it. As the balance falls, the minimum falls too, so the debt shrinks more and more slowly.",
    example: "£1,200 at 24.9% APR, paying only the minimum, takes about 7 years and costs over £1,100 in interest.",
    misconception: "“If I pay the minimum, I’ll clear it in a reasonable time.” Minimums are designed to be small, so clearing can take many years.",
    check: { q: "What happens to the minimum payment as your balance goes down?", options: ["It stays the same", "It goes down too", "It goes up"], answer: 1, why: "It’s a percentage of the balance, which is why paying only the minimum takes so long." },
  },
  {
    id: "credit",
    title: "Your credit file",
    match: /credit (score|file|rating|record|report)/i,
    explain: "Lenders record how you repay on your credit file. Missed or late payments can stay there for years and make borrowing harder or more expensive.",
    example: "Missing a single Buy Now Pay Later payment can be reported, just like a missed loan payment.",
    misconception: "“Buy Now Pay Later doesn’t count as real borrowing.” It’s still credit, and providers can check and report it.",
    check: { q: "Can a missed Buy Now Pay Later payment affect your credit file?", options: ["No, it isn’t real credit", "Yes, it can be reported", "Only if it’s over £1,000"], answer: 1, why: "Providers can report missed payments to credit reference agencies." },
  },
  {
    id: "variable",
    title: "Variable rates",
    match: /variable|rate (go|goes|change|rise)|base rate/i,
    explain: "A variable rate can change during the agreement, often when the Bank of England changes Bank Rate. A fixed rate stays the same for the fixed period.",
    example: "On £5,000 over 3 years, a 3-point rise after year one adds about £106 to what you pay.",
    misconception: "“The rate I sign up at is the rate I’ll always pay.” Only true if the rate is fixed.",
    check: { q: "Your loan has a variable rate. What could happen to your payments?", options: ["Nothing, they’re fixed", "They could go up or down", "They can only go down"], answer: 1, why: "A variable rate can move either way, and your payments move with it." },
  },
  {
    id: "total",
    title: "Total amount payable",
    match: /total (cost|amount|payable)|how much (do|will) i (pay|repay)|cost of borrowing/i,
    explain: "The total amount payable is everything you’ll hand over: what you borrowed, plus interest, plus fees. It’s the clearest single number for comparing offers.",
    example: "£83 a month sounds small. For 36 months it’s £2,988, before any interest or fees.",
    misconception: "“A lower monthly payment means a cheaper deal.” Lower payments often mean a longer term and a bigger total.",
    check: { q: "Offer A is £60 a month for 2 years. Offer B is £50 a month for 3 years. Which has the lower total?", options: ["Offer A (£1,440)", "Offer B (£1,800)", "They’re the same"], answer: 0, why: "Multiply the payment by the number of months: £1,440 vs £1,800." },
  },
];

/** The concept a person keeps coming back to, if any (asked about at least twice). */
export function strugglingWith(questions: string[]): Concept | null {
  let best: Concept | null = null, bestCount = 1;
  for (const c of CONCEPTS) {
    const count = questions.filter((q) => c.match.test(q)).length;
    if (count > bestCount) { best = c; bestCount = count; }
  }
  return best;
}
