// Finds quoted wording inside a document so "Show me where" can highlight it.
// Matching ignores case, spacing and curly-vs-straight quotes, because copied text rarely matches byte for byte.

export interface Mark { key: string; quote: string }
export interface Segment { text: string; key?: string }

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function pattern(quote: string): RegExp | null {
  const words = quote.trim().replace(/[“”"]/g, "").split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const parts = words.map((w) => escape(w).replace(/['’‘]/g, "['’‘]"));
  return new RegExp(parts.join("[\\s\"“”]+"), "i");
}

/** Where a quote appears in the text, or null if it can't be found. */
export function locate(text: string, quote: string): [number, number] | null {
  const re = pattern(quote);
  const m = re ? re.exec(text) : null;
  return m ? [m.index, m.index + m[0].length] : null;
}

/** Splits the text into plain and highlighted runs. Overlapping quotes keep the first one. */
export function segments(text: string, marks: Mark[]): Segment[] {
  const ranges = marks
    .map((m) => { const at = locate(text, m.quote); return at && { key: m.key, start: at[0], end: at[1] }; })
    .filter((r): r is { key: string; start: number; end: number } => !!r)
    .sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start < pos) continue;
    if (r.start > pos) out.push({ text: text.slice(pos, r.start) });
    out.push({ text: text.slice(r.start, r.end), key: r.key });
    pos = r.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
