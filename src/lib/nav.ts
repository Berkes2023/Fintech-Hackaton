export interface NavLink { href: string; title: string; desc: string; icon: string }
export interface NavGroup {
  key: string;
  label: string;
  intro: string;
  links: NavLink[];
  feature: { href: string; eyebrow: string; title: string; body: string; cta: string };
}

export const NAV: NavGroup[] = [
  {
    key: "products",
    label: "Products",
    intro: "Pick what you’re looking at. We’ll show the real cost.",
    links: [
      { href: "/cost-checker?type=loan", title: "Loans", desc: "Personal loans, car and store finance", icon: "loan" },
      { href: "/cost-checker?type=card", title: "Credit cards", desc: "0% offers, minimum payments, APR", icon: "card" },
      { href: "/cost-checker?type=overdraft", title: "Overdrafts", desc: "What being below £0 really costs", icon: "overdraft" },
      { href: "/cost-checker?type=bnpl", title: "Buy Now Pay Later", desc: "Pay in 3, pay monthly, late fees", icon: "bnpl" },
      { href: "/cost-checker?type=subscription", title: "Subscriptions", desc: "Intro prices and yearly rises", icon: "subscription" },
      { href: "/cost-checker?type=household", title: "Household bills", desc: "Phone, broadband, energy contracts", icon: "household" },
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
    key: "tools",
    label: "Tools",
    intro: "Simple tools that turn small print into understanding.",
    links: [
      { href: "/check", title: "Think a decision through", desc: "Your situation, your future, simulated", icon: "spark" },
      { href: "/start", title: "Not sure where to start?", desc: "Three quick questions", icon: "help" },
      { href: "/plan", title: "Plan step by step", desc: "Car, home, borrowing or investing", icon: "spark" },
      { href: "/cost-checker", title: "Cost checker", desc: "Short-term and long-term cost in one view", icon: "calc" },
      { href: "/compare", title: "Compare options", desc: "Up to four products, side by side", icon: "compare" },
      { href: "/cost-checker#paste", title: "Read the small print", desc: "Paste the terms and AI fills in the form", icon: "doc" },
      { href: "/cost-checker#afford", title: "Stress test your month", desc: "What’s left if bills rise or income falls", icon: "wallet" },
      { href: "/diff", title: "Contract diff", desc: "Two offers, clause by clause", icon: "doc" },
      { href: "/commitments", title: "Commitment map", desc: "Everything you pay, on one timeline", icon: "chart" },
      { href: "/reverse", title: "Reverse calculator", desc: "What £150 a month really means", icon: "calc" },
    ],
    feature: {
      href: "/cost-checker?type=card",
      eyebrow: "Try this",
      title: "The minimum payment trap",
      body: "Switch a card to minimum payments and watch how long £1,200 takes to clear.",
      cta: "Open the checker",
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
    intro: "How Before You Sign works, and what it will never do.",
    links: [
      { href: "/responsible-ai", title: "Responsible AI", desc: "Where we use AI, and the rules it follows", icon: "shield" },
      { href: "/responsible-ai#maths", title: "How we calculate", desc: "The maths behind every number", icon: "calc" },
      { href: "/responsible-ai#limits", title: "What we don’t do", desc: "No advice, no bank access, no data kept", icon: "help" },
      { href: "/developers", title: "Developer API", desc: "Money Labels and Product DNA for any website", icon: "code" },
      { href: "/firewall", title: "Commitment Firewall", desc: "Future vision: an optional checkout companion", icon: "shield" },
    ],
    feature: {
      href: "/responsible-ai",
      eyebrow: "Our promise",
      title: "We explain. You decide.",
      body: "We never tell you which product to choose. The decision stays with you.",
      cta: "Read our approach",
    },
  },
];
