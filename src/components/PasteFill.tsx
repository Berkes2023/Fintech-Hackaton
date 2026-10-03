"use client";

import { useState } from "react";
import { defaults, fieldLabel, isProductType, PRODUCTS, REQUIRED, type ProductType, type Values } from "@/lib/finance";
import { redact, type Redaction } from "@/lib/privacy";

const SAMPLE = `KEY FACTS - Flexi Pay Monthly
Dear Jane Smith, Address: 12 High Street, Bristol BS1 4DJ. Account number 12345678.
Spread the cost of your purchase of £899.00 over 12 monthly payments.
Representative 29.9% APR (variable). Monthly payment £86.73. Total amount payable £1,040.76.
A late payment fee of £12 applies to each missed payment. Missed payments may be reported to credit reference agencies.
Your rate may change if the Bank of England base rate changes. No fee to settle early. First payment due 30 days after purchase.`;

const ADVERT = `NEW LAPTOP - ONLY £83/MONTH!
Spread the cost with easy monthly payments. Apply in minutes. Subject to status.`;

const MAX_FILE = 3 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export type Confidence = "high" | "medium" | "low";
export interface Condition { kind: string; title: string; plain: string; why: string; quote: string; confidence: Confidence }
export interface Contradiction { headline: string; headline_quote: string; full_terms: string; terms_quote: string }
export type Prominence = "headline" | "body" | "small_print" | "absent";
export type ProminenceMap = Record<"monthly_payment" | "total_payable" | "length" | "interest_rate" | "fees", Prominence>;

interface Extracted {
  product: string;
  values: { id: string; value: string; quote: string; confidence: Confidence }[];
  conditions: Condition[];
  contradictions: Contradiction[];
  prominence: ProminenceMap | null;
  claim: string;
  stated: { monthly: string; monthly_quote: string; total: string; total_quote: string };
  document_text: string;
}

export interface FillResult {
  type: ProductType;
  values: Values;
  filled: string[];
  /** Field id -> the exact words it came from, and how sure the AI was. */
  evidence: Record<string, { quote: string; confidence: Confidence }>;
  /** Fields needed for the total cost that the document didn't state (decided by code, not AI). */
  missing: string[];
  conditions: Condition[];
  contradictions: Contradiction[];
  prominence: ProminenceMap | null;
  claim: string;
  stated: { monthly?: number; total?: number; monthlyQuote?: string; totalQuote?: string };
  /** The document text as the AI saw it (already redacted), for "show me where". */
  source: string;
  redactions: Redaction[];
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
const num = (s: string) => { const x = Number(String(s).replace(/[£,%\s]/g, "")); return Number.isFinite(x) && x > 0 ? x : undefined; };

export interface Sample { label: string; text: string }
const DEFAULT_SAMPLES: Sample[] = [{ label: "Example: key facts", text: SAMPLE }, { label: "Example: advert", text: ADVERT }];

export function PasteFill({ onFill, samples = DEFAULT_SAMPLES, idPrefix = "paste", title = "Upload or paste the small print", open = true }: {
  onFill: (r: FillResult) => void; samples?: Sample[]; idPrefix?: string; title?: string; open?: boolean;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const preview = text.trim() ? redact(text) : null;

  async function run() {
    if (!text.trim() && !file) { setMsg("Paste some terms or choose a file first, or use an example."); return; }
    if (file && file.size > MAX_FILE) { setMsg(ERRORS.bad_file); return; }
    setBusy(true);
    setMsg(file ? `Reading ${file.name}…` : "Reading the terms…");
    try {
      // Personal details are removed here, in the browser, before anything is sent.
      const safe = text.trim() ? redact(text) : { text: "", found: [] };
      const body: { text?: string; file?: { type: string; data: string } } = {};
      if (safe.text) body.text = safe.text;
      if (file) body.file = { type: file.type, data: await toBase64(file) };
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as Extracted & { error?: string };
      if (!res.ok || data.error) { setMsg(ERRORS[data.error ?? ""] ?? "Something went wrong. Try again."); return; }
      if (!isProductType(data.product)) { setMsg(ERRORS.invalid_json); return; }

      const type = data.product;
      const values = defaults(type);
      const filled: string[] = [];
      const evidence: FillResult["evidence"] = {};
      for (const f of PRODUCTS[type].fields) {
        const hit = data.values.find((x) => x.id === f.id);
        const got = hit?.value?.replace(/[£,%\s]/g, "");
        if (!hit || !got) continue;
        if (f.type === "select" ? f.options?.some((o) => o[0] === got) : Number.isFinite(Number(got))) {
          values[f.id] = f.type === "select" ? got : Number(got);
          filled.push(f.id);
          evidence[f.id] = { quote: (hit.quote ?? "").slice(0, 200), confidence: hit.confidence ?? "medium" };
        }
      }
      // Trust the code, not the model, for what's missing: any required field we couldn't fill.
      const missing = REQUIRED[type].filter((id) => !filled.includes(id));
      onFill({
        type, values, filled, evidence, missing,
        conditions: (data.conditions ?? []).slice(0, 12),
        contradictions: (data.contradictions ?? []).slice(0, 4),
        prominence: data.prominence ?? null,
        claim: data.claim ?? "",
        stated: {
          monthly: num(data.stated?.monthly ?? ""), total: num(data.stated?.total ?? ""),
          monthlyQuote: data.stated?.monthly_quote || undefined, totalQuote: data.stated?.total_quote || undefined,
        },
        source: safe.text || (data.document_text ?? "").slice(0, 3000),
        redactions: safe.found,
      });
      setMsg(`Filled ${filled.length} field${filled.length === 1 ? "" : "s"} as a ${PRODUCTS[type].label.toLowerCase()}, and found ${data.conditions?.length ?? 0} condition${data.conditions?.length === 1 ? "" : "s"}.${missing.length ? ` Not stated: ${missing.map((id) => fieldLabel(type, id)).join(", ")}.` : ""}`);
    } catch {
      setMsg("Something went wrong reaching the assistant. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="paste list anchor-target" id={idPrefix} open={open}>
      <summary>{title} <span aria-hidden="true">+</span></summary>
      <div className="stack" style={{ marginTop: 14 }}>
        <p className="small muted">Add the key facts, terms, a letter or an advert. AI reads it, fills in the form and shows the exact words behind every value.</p>
        <label htmlFor={`${idPrefix}-file`} className="small" style={{ fontWeight: 600 }}>PDF or photo (under 3 MB), e.g. snap an advert</label>
        <input id={`${idPrefix}-file`} type="file" accept={ACCEPT} capture="environment" className="small" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <label htmlFor={`${idPrefix}-text`} className="small" style={{ fontWeight: 600 }}>Or paste the text</label>
        <textarea id={`${idPrefix}-text`} className="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the terms here…" maxLength={8000} />
        {preview && preview.found.length > 0 && (
          <p className="privacy small" role="status">
            <b>Privacy shield:</b> we’ll remove {preview.found.map((f) => `${f.count} ${f.kind}${f.count > 1 ? "s" : ""}`).join(", ")} before anything is sent. They aren’t needed to work out the cost.
          </p>
        )}
        <div className="row">
          <button type="button" className="btn btn-dark btn-sm" onClick={run} disabled={busy}>{busy ? "Reading…" : "Decode it"}</button>
          {samples.map((x) => <button key={x.label} type="button" className="btn btn-light btn-sm" onClick={() => { setText(x.text); setFile(null); }}>{x.label}</button>)}
        </div>
        {file && <p className="small muted">Photos and PDFs go to the AI as they are, so cover any personal details first.</p>}
        {msg && <p className="small" aria-live="polite">{msg}</p>}
      </div>
    </details>
  );
}
