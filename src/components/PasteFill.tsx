"use client";

import { useState } from "react";
import { defaults, isProductType, PRODUCTS, type ProductType, type Values } from "@/lib/finance";

const SAMPLE = `KEY FACTS - Flexi Pay Monthly
Spread the cost of your purchase of £899.00 over 12 monthly payments.
Representative 29.9% APR (variable). Monthly payment £86.73. Total amount payable £1,040.76.
A late payment fee of £12 applies to each missed payment. Missed payments may be reported to credit reference agencies.
No fee to settle early. First payment due 30 days after purchase.`;

interface Extracted { product: string; values: { id: string; value: string }[]; missing: string[]; unusual: string[] }

const ERRORS: Record<string, string> = {
  not_configured: "Reading the small print needs the AI assistant, which isn’t switched on for this site yet. You can still type the figures in yourself.",
  rate_limited: "The assistant is busy. Try again in a minute.",
  invalid_json: "Couldn’t pick out the figures from that text. Try pasting just the key facts section.",
  refused: "The assistant couldn’t read that text. Try pasting just the key facts section.",
};

export function PasteFill({ onFill }: { onFill: (type: ProductType, values: Values, filled: string[]) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<React.ReactNode>(null);

  async function run() {
    if (!text.trim()) { setMsg("Paste some terms first, or use the example text."); return; }
    setBusy(true);
    setMsg("Reading the terms…");
    try {
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = (await res.json()) as Extracted & { error?: string };
      if (!res.ok || data.error) { setMsg(ERRORS[data.error ?? ""] ?? "Something went wrong. Try again."); return; }
      if (!isProductType(data.product)) { setMsg(ERRORS.invalid_json); return; }
      const type = data.product;
      const values = defaults(type);
      const filled: string[] = [];
      for (const f of PRODUCTS[type].fields) {
        const got = data.values.find((v) => v.id === f.id)?.value?.replace(/[£,%\s]/g, "");
        if (!got) continue;
        if (f.type === "select") {
          if (f.options?.some((o) => o[0] === got)) { values[f.id] = got; filled.push(f.id); }
        } else if (Number.isFinite(Number(got))) { values[f.id] = Number(got); filled.push(f.id); }
      }
      onFill(type, values, filled);
      setMsg(
        <>
          <b>Filled {filled.length} field{filled.length === 1 ? "" : "s"} as a {PRODUCTS[type].label.toLowerCase()}.</b> They’re outlined in the form. Check each one against the document.
          {data.missing?.length > 0 && <> Not stated in the text: {data.missing.slice(0, 5).join(", ")}. Standard values are used for these.</>}
          {data.unusual?.length > 0 && <> Worth checking: {data.unusual.slice(0, 3).join(" ")}</>}
        </>,
      );
    } catch {
      setMsg("Something went wrong reaching the assistant. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="paste list anchor-target" id="paste">
      <summary>Paste the small print instead <span aria-hidden="true">+</span></summary>
      <div className="stack" style={{ marginTop: 14 }}>
        <p className="small muted">Paste the terms or key facts. AI reads them and fills in the form. You check every value before relying on it.</p>
        <label htmlFor="paste-text" className="sr-only">Product terms</label>
        <textarea id="paste-text" className="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the terms here…" maxLength={8000} />
        <div className="row">
          <button type="button" className="btn btn-dark btn-sm" onClick={run} disabled={busy}>Fill in the form</button>
          <button type="button" className="btn btn-light btn-sm" onClick={() => setText(SAMPLE)}>Use example text</button>
        </div>
        {msg && <p className="small" aria-live="polite">{msg}</p>}
      </div>
    </details>
  );
}
