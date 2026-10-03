// Removes personal details from document text in the browser, BEFORE anything is sent to AI.
// None of these are needed to understand a financial product's cost.

export interface Redaction { kind: string; count: number }

const RULES: { kind: string; label: string; re: RegExp }[] = [
  { kind: "email", label: "[EMAIL]", re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { kind: "card number", label: "[CARD NUMBER]", re: /\b(?:\d[ -]?){15,18}\d\b/g },
  { kind: "National Insurance number", label: "[NI NUMBER]", re: /\b[A-CEGHJ-PR-TW-Z]{2} ?\d{2} ?\d{2} ?\d{2} ?[A-D]\b/gi },
  { kind: "sort code", label: "[SORT CODE]", re: /\b\d{2}-\d{2}-\d{2}\b/g },
  { kind: "account number", label: "[ACCOUNT NUMBER]", re: /\b(?:account|acc(?:ount)?\.?\s*(?:no|number)|a\/c)\s*[:#.]?\s*\d{6,10}\b/gi },
  { kind: "account number", label: "[ACCOUNT NUMBER]", re: /\b\d{8}\b/g },
  { kind: "phone number", label: "[PHONE]", re: /(?:\+44\s?7\d{3}|\b07\d{3})\s?\d{3}\s?\d{3}\b/g },
  { kind: "postcode", label: "[POSTCODE]", re: /\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/g },
  { kind: "name", label: "[NAME]", re: /\b(?:Mr|Mrs|Ms|Miss|Mx|Dr)\.? [A-Z][a-z]+(?: [A-Z][a-z]+)*/g },
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
