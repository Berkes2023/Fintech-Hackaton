// The user agreement: the short user terms and privacy statement a person acknowledges once, on this device.
// The acknowledgement itself is kept in this browser's localStorage under "bys:ack" (see components/Acknowledge.tsx):
// no account and nothing sent anywhere, and "Clear everything saved on this device" removes it too.
// Bump the version when the wording changes materially, so people are asked again.

export const AGREEMENT_VERSION = 1;
export const AGREEMENT_UPDATED = "4 October 2026";
export const ACK_KEY = "bys:ack";

/** What someone acknowledges about the product. Plain statements, each one true of the current prototype. */
export const USER_TERMS = [
  "Before You Sign is an educational prototype built for the UKFinnovator Bristol 2026 hackathon.",
  "It explains. It isn’t financial advice, it doesn’t lend or broker credit, and it doesn’t predict lender approval, lender rates or official credit scores.",
  "Figures are estimates from what you enter. Projections, what-ifs and example providers are illustrations, not predictions or offers.",
  "AI explanations can make mistakes. Check the provider’s own documents before you commit.",
  "The decision is always yours.",
];

/** What someone acknowledges about their data. Checked against the code: lib/store.ts, lib/privacy.ts, app/api/*. */
export const PRIVACY_STATEMENT = [
  "No account, no bank connection, no cookies and no analytics.",
  "What you enter is saved in this browser (keys beginning “bys:”) until you clear it. We have no database.",
  "Only when you use an AI feature is your document or question sent through our server to Google Gemini. Common personal details are removed from pasted text first; files are sent as they are.",
  "Our code doesn’t log what you send. Our host, Vercel, may keep standard request logs.",
  "You can clear everything saved on this device at any time from Privacy & your data.",
];

export interface Acknowledgement { version: number; at: string }

export const isAcknowledgement = (x: unknown): x is Acknowledgement =>
  !!x && typeof x === "object" && typeof (x as Acknowledgement).version === "number" && typeof (x as Acknowledgement).at === "string";

/** True when an acknowledgement covers the current wording. */
export const isCurrent = (a: Acknowledgement | null | undefined) => !!a && a.version >= AGREEMENT_VERSION;
