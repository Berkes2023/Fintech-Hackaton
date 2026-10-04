export interface NavLink { href: string; title: string; desc: string; icon: string }
export interface NavGroup {
  key: string;
  label: string;
  intro: string;
  links: NavLink[];
  feature: { href: string; eyebrow: string; title: string; body: string; cta: string };
}

// Fewer choices, clearer purpose. Products holds the main experiences; Tools only genuinely different utilities.
export const NAV: NavGroup[] = [
  {
    key: "products",
    label: "Products",
    intro: "Start with a decision, an offer or your month.",
    links: [
      { href: "/plan", title: "Plan a decision step by step", desc: "Your situation, credit, the decision and what it changes", icon: "spark" },
      { href: "/small-print", title: "Read the small print", desc: "Paste or upload terms; see what they mean for you", icon: "doc" },
      { href: "/stress-test", title: "Stress test your month", desc: "What if bills rise, income falls or something unexpected happens?", icon: "wallet" },
      { href: "/cost-checker?type=loan", title: "Loans", desc: "Personal loans, car and store finance", icon: "loan" },
      { href: "/cost-checker?type=card", title: "Credit cards", desc: "0% offers, minimum payments, APR", icon: "card" },
      { href: "/cost-checker?type=overdraft", title: "Overdrafts", desc: "What being below £0 really costs", icon: "overdraft" },
      { href: "/cost-checker?type=bnpl", title: "Buy Now Pay Later", desc: "Pay in 3, pay monthly, late fees", icon: "bnpl" },
      { href: "/cost-checker?type=subscription", title: "Subscriptions", desc: "Intro prices and yearly rises", icon: "subscription" },
      { href: "/cost-checker?type=household", title: "Household bills", desc: "Phone, broadband, energy contracts", icon: "household" },
    ],
    feature: {
      href: "/plan",
      eyebrow: "Start here",
      title: "Thinking about a car, a home or a big purchase?",
      body: "Tell us about your situation and see what the decision could change, before you commit.",
      cta: "Plan step by step",
    },
  },
  {
    key: "tools",
    label: "Tools",
    intro: "Specialised utilities, each for a different job.",
    links: [
      { href: "/compare", title: "Compare options", desc: "Up to four products, side by side, never ranked", icon: "compare" },
      { href: "/diff", title: "Contract diff", desc: "Two offers, clause by clause", icon: "doc" },
      { href: "/commitments", title: "Commitment map", desc: "Everything you already pay, on one timeline", icon: "chart" },
      { href: "/reverse", title: "Reverse calculator", desc: "What a monthly budget means over different terms", icon: "calc" },
    ],
    feature: {
      href: "/compare",
      eyebrow: "Example",
      title: "Paying for a £1,200 laptop?",
      body: "See Pay in 3, a credit card and store finance side by side, with every cost made clear.",
      cta: "Compare the options",
    },
  },
  {
    key: "learn",
    label: "Learn",
    intro: "Plain-English guides to the words lenders use.",
    links: [
      { href: "/learn#jargon", title: "Jargon buster", desc: "APR, EAR, representative APR and more", icon: "book" },
      { href: "/learn#apr", title: "What APR really means", desc: "Why the headline rate isn’t the whole story", icon: "chart" },
      { href: "/learn#minimum", title: "Minimum payments", desc: "Why they keep you in debt for years", icon: "card" },
      { href: "/learn#bnpl", title: "BNPL explained", desc: "How pay-later plans work in the UK", icon: "bnpl" },
      { href: "/rates", title: "Interest rates", desc: "Live Bank Rate vs the Fed and ECB", icon: "chart" },
    ],
    feature: {
      href: "/learn#help",
      eyebrow: "Free help",
      title: "Worried about money?",
      body: "MoneyHelper and StepChange give free, impartial help. You don’t need to be in debt to call.",
      cta: "Where to get help",
    },
  },
  {
    key: "about",
    label: "About",
    intro: "How Before You Sign works, and what it doesn’t do.",
    links: [
      { href: "/about#how", title: "How it works", desc: "One journey, from your situation to the small print", icon: "spark" },
      { href: "/about#ai", title: "Calculations & responsible AI", desc: "Code calculates. AI explains.", icon: "calc" },
      { href: "/about#dont", title: "What we don’t do", desc: "No lending, no advice, no rankings", icon: "help" },
      { href: "/about#privacy", title: "Privacy & your data", desc: "What stays on your device, and what AI sees", icon: "shield" },
      { href: "/#sources", title: "Sources & methodology", desc: "Every statistic, with its official source", icon: "book" },
      { href: "/about#roadmap", title: "Roadmap", desc: "Ideas we haven’t built yet", icon: "chart" },
    ],
    feature: {
      href: "/about",
      eyebrow: "Our approach",
      title: "We explain. You decide.",
      body: "We never tell you which product to choose. The decision stays with you.",
      cta: "About Before You Sign",
    },
  },
];
