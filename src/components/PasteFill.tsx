"use client";

import { useState } from "react";
import { defaults, fieldLabel, isProductType, PRODUCTS, REQUIRED, type ProductType, type Values } from "@/lib/finance";

const SAMPLE = `KEY FACTS - Flexi Pay Monthly
Spread the cost of your purchase of £899.00 over 12 monthly payments.
Representative 29.9% APR (variable). Monthly payment £86.73. Total amount payable £1,040.76.
A late payment fee of £12 applies to each missed payment. Missed payments may be reported to credit reference agencies.
No fee to settle early. First payment due 30 days after purchase.`;

const ADVERT = `NEW LAPTOP - ONLY £83/MONTH!
Spread the cost with easy monthly payments. Apply in minutes. Subject to status.`;

const MAX_FILE = 3 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

interface Extracted {
  product: string;
  values: { id: string; value: string; quote: string }[];
  missing: string[];
  unusual: { note: string; quote: string }[];
}

export interface FillResult {
  type: ProductType;
  values: Values;
  filled: string[];
  /** Field id -> the exact words it came from. */
  evidence: Record<string, string>;
  /** Fields needed for the total cost that the document didn't state. */
  missing: string[];
  unusual: { note: string; quote: string }[];
  source: string;
}

const ERRORS: Record<string, string> = {
  not_configured: "Reading documents needs the AI assistant, which isn’t switched on for this site yet. You can still type the figures in yourself.",
  rate_limited: "The assistant is busy. Try again in a minute.",
  invalid_json: "Couldn’t pick out the figures. Try pasting just the key facts section.",
  refused: "The assistant couldn’t read that. Try pasting just the key facts section.",
  bad_file: "That file couldn’t be read. Use a PDF, PNG or JPG under 3 MB.",
};

const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
  r.onerror = () => reject(r.error);
  r.readAsDataURL(f);
});

export function PasteFill({ onFill }: { onFill: (r: FillResult) => void }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (!text.trim() && !file) { setMsg("Paste some terms or choose a file first, or use an example."); return; }
    if (file && file.size > MAX_FILE) { setMsg(ERRORS.bad_file); return; }
    setBusy(true);
    setMsg(file ? `Reading ${file.name}…` : "Reading the terms…");
    try {
      const body: { text?: string; file?: { type: string; data: string } } = {};
      if (text.trim()) body.text = text;
      if (file) body.file = { type: file.type, data: await toBase64(file) };
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as Extracted & { error?: string };
      if (!res.ok || data.error) { setMsg(ERRORS[data.error ?? ""] ?? "Something went wrong. Try again."); return; }
      if (!isProductType(data.product)) { setMsg(ERRORS.invalid_json); return; }

      const type = data.product;
      const values = defaults(type);
      const filled: string[] = [];
      const evidence: Record<string, string> = {};
      for (const f of PRODUCTS[type].fields) {
        const hit = data.values.find((x) => x.id === f.id);
        const got = hit?.value?.replace(/[£,%\s]/g, "");
        if (!hit || !got) continue;
        if (f.type === "select" ? f.options?.some((o) => o[0] === got) : Number.isFinite(Number(got))) {
          values[f.id] = f.type === "select" ? got : Number(got);
          filled.push(f.id);
          if (hit.quote) evidence[f.id] = hit.quote.slice(0, 200);
        }
      }
      // Trust the code, not the model, for what's missing: any required field we couldn't fill.
      const missing = REQUIRED[type].filter((id) => !filled.includes(id));
      onFill({ type, values, filled, evidence, missing, unusual: (data.unusual ?? []).slice(0, 3), source: text.trim() || file?.name || "" });
      setMsg(`Filled ${filled.length} field${filled.length === 1 ? "" : "s"} as a ${PRODUCTS[type].label.toLowerCase()}. Each one shows the words it came from. Check them against the document.${missing.length ? ` Not stated: ${missing.map((id) => fieldLabel(type, id)).join(", ")}.` : ""}`);
    } catch {
      setMsg("Something went wrong reaching the assistant. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="paste list anchor-target" id="paste">
      <summary>Upload or paste the small print <span aria-hidden="true">+</span></summary>
      <div className="stack" style={{ marginTop: 14 }}>
        <p className="small muted">Add the key facts, terms or an advert. AI reads them and fills in the form, showing the exact words behind each value. You check every one.</p>
        <label htmlFor="paste-file" className="small" style={{ fontWeight: 600 }}>PDF or photo (under 3 MB)</label>
        <input id="paste-file" type="file" accept={ACCEPT} className="small" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <label htmlFor="paste-text" className="small" style={{ fontWeight: 600 }}>Or paste the text</label>
        <textarea id="paste-text" className="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the terms here…" maxLength={8000} />
        <div className="row">
          <button type="button" className="btn btn-dark btn-sm" onClick={run} disabled={busy}>{busy ? "Reading…" : "Fill in the form"}</button>
          <button type="button" className="btn btn-light btn-sm" onClick={() => { setText(SAMPLE); setFile(null); }}>Example: key facts</button>
          <button type="button" className="btn btn-light btn-sm" onClick={() => { setText(ADVERT); setFile(null); }}>Example: advert</button>
        </div>
        {msg && <p className="small" aria-live="polite">{msg}</p>}
      </div>
    </details>
  );
}
