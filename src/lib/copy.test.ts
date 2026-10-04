import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Copy safety across the whole app, not just engine output: user-facing strings must never give a verdict,
// an instruction or a prediction. Comments are ignored; deliberate negations ("we don’t rank any product as best")
// are allowed by the phrases below.

const ROOT = join(__dirname, "..");
const BANNED = /\b(safe|unsafe|affordable|unaffordable|affordability|you can afford|you can'?t afford|recommended|we recommend|best (option|deal|product|choice)|you should|you will have|you'll have|will become|guaranteed?|good decision|bad decision)\b/i;

// Phrases that contain a banned word on purpose: negations, quotes of what we don’t do, or third-party names.
const ALLOWED = [
  /not an official affordability assessment/i,
  /isn[’']t an (official )?affordability (assessment|check)/i,
  /official affordability (assessment|check)/i,
  /affordability (assessment|check)s? (is|are) (done|carried out) by (the )?lender/i,
  /never (call|calls|label|labels)[^.]*safe/i,
  /safe,\s*unsafe/i,
  /\bnot\b[^.]{0,40}\b(safe|recommend\w*|best|you should|affordab\w*)\b/i,
  /\bnever\b[^.]{0,40}\b(recommend\w*|best|you should)\b/i,
  /\bdon[’']t\b[^.]{0,40}\b(recommend\w*|best|you should)\b/i,
  /\bno\b[^.]{0,20}\b(recommend\w*|best)\b/i,
  /guaranteed asset protection/i,
  /\bGAP\b/,
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx|ts)$/.test(name) && !/\.test\.ts$/.test(name) ? [p] : [];
  });
}

/** String literals and JSX text only; comments and identifiers are dropped. */
function userText(src: string): string[] {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const out: string[] = [];
  for (const m of noComments.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`|>([^<>{}]+)</g)) {
    const t = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (t && /[a-z]{3,}\s+[a-z]{2,}/i.test(t)) out.push(t);
  }
  return out;
}

describe("copy safety", () => {
  const hits: string[] = [];
  for (const f of [...files(join(ROOT, "components")), ...files(join(ROOT, "app")), ...files(join(ROOT, "lib"))]) {
    if (/[\\/]lib[\\/](ai|stats)\.ts$/.test(f)) continue; // system prompts list the banned words on purpose; stats quote sources verbatim
    for (const t of userText(readFileSync(f, "utf8"))) {
      if (!BANNED.test(t)) continue;
      if (ALLOWED.some((a) => a.test(t))) continue;
      if (/^\/.*\/[a-z]*$/.test(t) || /[|\\]/.test(t)) continue; // regex source, not copy
      hits.push(`${relative(ROOT, f)}: ${t.slice(0, 140)}`);
    }
  }

  it("never gives a verdict, an instruction or a prediction in user-facing copy", () => {
    expect(hits).toEqual([]);
  });
});
