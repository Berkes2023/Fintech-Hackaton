// Every statistic we cite, in one place, each checked against its official source on 4 October 2026.
// Change a figure here and it changes everywhere. Never add one without a source.

export interface Stat {
  id: string;
  /** The headline number as displayed, e.g. "45.7 million". */
  headline: string;
  /** For animated counters: the number to count to, its decimals and suffix. */
  count: { to: number; decimals: number; suffix: string };
  /** A second figure, usually the share of the population. */
  share?: string;
  /** Plain-English description, keeping the source's own meaning. */
  description: string;
  population: string;
  year: string;
  geography: string;
  source: string;
  url: string;
  /** Exact wording or definition from the source, for the methodology section. */
  sourceWording: string;
}

const FCA_BLOG = "https://www.fca.org.uk/news/blogs/evolution-consumer-credit-what-next-decade-holds";
const FLS_2024 = "https://www.fca.org.uk/publication/financial-lives/financial-lives-survey-2024-key-findings.pdf";

export const STATS = {
  holdCredit: {
    id: "holdCredit", headline: "45.7 million", count: { to: 45.7, decimals: 1, suffix: " million" }, share: "84%",
    description: "UK adults held at least one credit or loan product in the previous 12 months.",
    population: "UK adults (18+)", year: "2024", geography: "UK",
    source: "FCA, Financial Lives 2024 survey, cited in “The evolution of consumer credit” (FCA blog, 14 Aug 2025)", url: FCA_BLOG,
    sourceWording: "84% of UK adults (45.7 million people) held at least one credit or loan product in the previous 12 months.",
  },
  poorNumeracy: {
    id: "poorNumeracy", headline: "9.8 million", count: { to: 9.8, decimals: 1, suffix: " million" }, share: "18%",
    description: "UK adults demonstrated poor financial numeracy: they answered none of three questions on interest, cumulative interest and inflation correctly.",
    population: "UK adults (18+)", year: "2024 (fieldwork 5 Feb–16 Jun 2024)", geography: "UK",
    source: "FCA, Financial Lives 2024 survey: key findings", url: FLS_2024,
    sourceWording: "In 2024, 9.8 million adults (18%) demonstrated poor financial numeracy, answering none of the three questions correctly. The questions covered interest, cumulative interest and inflation, designed by National Numeracy.",
  },
  lowConfidence: {
    id: "lowConfidence", headline: "10.3 million", count: { to: 10.3, decimals: 1, suffix: " million" }, share: "19%",
    description: "UK adults reported low confidence working with numbers in everyday life.",
    population: "UK adults (18+)", year: "2024 (fieldwork 5 Feb–16 Jun 2024)", geography: "UK",
    source: "FCA, Financial Lives 2024 survey: key findings", url: FLS_2024,
    sourceWording: "In 2024, 10.3 million adults (19%) reported low confidence in working with numbers in their everyday lives.",
  },
  limitedUnderstanding: {
    id: "limitedUnderstanding", headline: "6.3 million", count: { to: 6.3, decimals: 1, suffix: " million" }, share: "12%",
    description: "UK adults had limited understanding of the financial products they held.",
    population: "UK adults (18+)", year: "2024", geography: "UK",
    source: "FCA, “Consumer understanding: good practice and areas for improvement” (13 Mar 2026), citing Financial Lives 2024",
    url: "https://www.fca.org.uk/publications/good-and-poor-practice/consumer-understanding-good-practice-areas-improvement",
    sourceWording: "12% of adults (around 6.3 million) had limited understanding of the products they held.",
  },
  persistentCard: {
    id: "persistentCard", headline: "2.8 million", count: { to: 2.8, decimals: 1, suffix: " million" }, share: "5%",
    description: "UK adults had persistent credit-card debt: they paid more in interest and charges than they paid off.",
    population: "UK adults (18+)", year: "2024", geography: "UK",
    source: "FCA, Financial Lives 2024 survey, cited in “The evolution of consumer credit” (FCA blog, 14 Aug 2025)", url: FCA_BLOG,
    sourceWording: "5% (2.8 million) had persistent credit card debt, meaning they paid more in interest and charges than they paid off.",
  },
  loansEveryday: {
    id: "loansEveryday", headline: "1.6 million", count: { to: 1.6, decimals: 1, suffix: " million" }, share: "10% of personal-loan holders",
    description: "Of UK adults with personal loans, 10% used them to cover everyday expenses such as food, travel or rent: around 1.6 million adults.",
    population: "UK adults (18+) with personal loans", year: "2024", geography: "UK",
    source: "FCA, Financial Lives 2024 survey, cited in “The evolution of consumer credit” (FCA blog, 14 Aug 2025)", url: FCA_BLOG,
    sourceWording: "Of those with personal loans, 10% - equivalent to around 1.6 million UK adults - used them to cover everyday expenses like food, travel, or rent.",
  },
  insolvencies: {
    id: "insolvencies", headline: "126,240", count: { to: 126240, decimals: 0, suffix: "" }, share: "1 in 395 adults",
    description: "individual insolvencies in England and Wales in 2025: 7% higher than 2024 (117,958). This total is bankruptcies, Debt Relief Orders and Individual Voluntary Arrangements combined, not bankruptcies alone.",
    population: "Adults in England and Wales", year: "2025", geography: "England and Wales",
    source: "The Insolvency Service, Individual insolvencies: December 2025 (GOV.UK, 20 Jan 2026)",
    url: "https://www.gov.uk/government/statistics/individual-insolvencies-december-2025",
    sourceWording: "126,240 individual insolvencies in 2025, 7% higher than the 117,958 in 2024; one in 395 adults (25.3 per 10,000 adults). Bankruptcies 7,460; Debt Relief Orders 46,939; Individual Voluntary Arrangements 71,841.",
  },
} satisfies Record<string, Stat>;

/** The official 2025 breakdown of the insolvency total (England and Wales). */
export const INSOLVENCY_BREAKDOWN = [
  { label: "Individual Voluntary Arrangements", short: "IVAs", n: 71841 },
  { label: "Debt Relief Orders", short: "DROs", n: 46939 },
  { label: "Bankruptcies", short: "Bankruptcies", n: 7460 },
];

/** Other official sources referenced on the page. */
export const OTHER_SOURCES = [
  { name: "Financial Conduct Authority: Financial Lives survey", url: "https://www.fca.org.uk/financial-lives" },
  { name: "Experian: credit score ranges", url: "https://www.experian.co.uk/consumer/experian-credit-score.html" },
  { name: "Equifax: credit score ranges", url: "https://www.equifax.co.uk/resources/loans-and-credit/understanding-credit-score-ranges.html" },
  { name: "TransUnion: new 0–999 consumer score", url: "https://newsroom.transunion.co.uk/transunion-launches-next-generation-expanded-0--999-consumer-credit-score-in-the-uk" },
  { name: "MoneyHelper: free, impartial money guidance (government-backed)", url: "https://www.moneyhelper.org.uk/" },
];
