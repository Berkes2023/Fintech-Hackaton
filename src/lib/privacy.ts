// Removes personal details from document text in the browser, BEFORE anything is sent to AI.
// None of these are needed to understand a financial product's cost.

export interface Redaction { kind: string; count: number }

const RULES: { kind: string; label: string; re: RegExp }[] = [
  { kind: "email", label: "[EMAIL]", re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { kind: "card number", label: "[CARD NUMBER]", re: /\b(?:\d[ -]?){15,18}\d\b/g },
  { kind: "National Insurance number", label: "[NI NUMBER]", re: /\b[A-CEGHJ-PR-TW-Z]{2} ?\d{2} ?\d{2} ?\d{2} ?[A-D]\b/gi },
  // A labelled sort code in any usual format ("Sort code: 12 34 56", "sort code 123456"), keeping the label.
  { kind: "sort code", label: "Sort code: [SORT CODE]", re: /\bsort[\s-]?code\s*:?\s*\d{2}[\s-]?\d{2}[\s-]?\d{2}\b/gi },
  { kind: "sort code", label: "[SORT CODE]", re: /\b\d{2}-\d{2}-\d{2}\b/g },
  { kind: "account number", label: "[ACCOUNT NUMBER]", re: /\b(?:account|acc(?:ount)?\.?\s*(?:no|number)|a\/c)\s*[:#.]?\s*\d{6,10}\b/gi },
  { kind: "account number", label: "[ACCOUNT NUMBER]", re: /\b\d{8}\b/g },
  // UK mobiles: 07…, +44 7… or +44 (0) 7…, with spaces or dashes between the groups.
  { kind: "phone number", label: "[PHONE]", re: /(?:\+44\s?(?:\(0\)\s?)?7\d{3}|\b07\d{3})[\s-]?\d{3}[\s-]?\d{3}\b/g },
  // Landlines written with a bracketed area code, as on most letters: "(0117) 496 0123", "(020) 7946 0018".
  { kind: "phone number", label: "[PHONE]", re: /\(0[123]\d{1,3}\)\s?\d{3,4}[\s-]?\d{3,4}\b/g },
  // UK landlines and non-geographic numbers: 01…, 02…, 03… or +44 1/2/3 (optionally "+44 (0)"), with or without spaces.
  { kind: "phone number", label: "[PHONE]", re: /(?:\+44\s?(?:\(0\)\s?)?[123]|\b0[123])\d{1,3}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g },
  // Capitals first, so "LS1 1ST" is caught; then any case ("bs1 4dj"), skipping ordinals such as "Q1 2nd" or "v2 1st".
  { kind: "postcode", label: "[POSTCODE]", re: /\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/g },
  { kind: "postcode", label: "[POSTCODE]", re: /\b[A-Z]{1,2}\d[A-Z\d]? ?\d(?!(?:st|nd|rd|th)\b)[A-Z]{2}\b/gi },
  // A title, up to two initials, then the name: mixed case ("Mrs O'Neill", "Ms Smith-Jones", "Dr Jane Mary Smith")
  // or capitals as in agreement headers ("MR JOHN SMITH", "MR J SMITH"). Case-sensitive, so "ms word" is left alone.
  { kind: "name", label: "[NAME]", re: /\b(?:Mr|Mrs|Ms|Miss|Mx|Dr|MR|MRS|MS|MISS|MX|DR)\.? (?:[A-Z]\.? ){0,2}(?:[A-Z][A-Za-z'’-]*[a-z](?: [A-Z][A-Za-z'’-]*[a-z])*|[A-Z][A-Z'’-]+(?: [A-Z][A-Z'’-]+)?)/g },
  { kind: "name", label: "Dear [NAME]", re: /\bDear [A-Z][a-z]+(?: [A-Z][a-z]+)*/g },
  { kind: "name", label: "Name: [NAME]", re: /\b(?:Customer name|Name)\s*:\s*[^\n,]+/gi },
  { kind: "address", label: "Address: [ADDRESS]", re: /\bAddress\s*:\s*[^\n]+/gi },
  { kind: "date of birth", label: "[DATE OF BIRTH]", re: /\b(?:Date of birth|DOB)\s*:?\s*[\d/.-]{6,10}/gi },
];

/** Returns the text with personal details replaced, and what kinds were found. */
export function redact(text: string): { text: string; found: Redaction[] } {
  const counts = new Map<string, number>();
  let out = text;
  for (const { kind, label, re } of RULES) {
    out = out.replace(re, () => {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
      return label;
    });
  }
  return { text: out, found: [...counts].map(([kind, count]) => ({ kind, count })) };
}
