"use client";

import { useState } from "react";
import { SourceBadge } from "./CarParts";
import type { Condition } from "./PasteFill";

const KIND: Record<string, string> = {
  variable_rate: "Rate can change",
  late_fee: "Fee",
  promo_ends: "Offer ends",
  auto_renewal: "Renews itself",
  early_repayment_charge: "Charge to leave",
  price_rise: "Price rise",
  exit_fee: "Charge to leave",
  credit_check: "Credit file",
  other: "Condition",
};
const CONF = { high: "High", medium: "Medium", low: "Low: check this one" } as const;

/** Every condition the AI found, each opening into a traceable explanation linked to its sentence. */
export function CostScanner({ conditions, onShow }: { conditions: Condition[]; onShow: (key: string) => void }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!conditions.length) return null;
  return (
    <section className="card stack" aria-labelledby="scan-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="scan-title" className="h3">Hidden cost scanner</h2>
        <span className="pill-label">{conditions.length} condition{conditions.length === 1 ? "" : "s"} found</span>
      </div>
      <ul className="risks">
        {conditions.map((c, i) => (
          <li key={i} className="risk">
            <span className="sev watch">{KIND[c.kind] ?? "Condition"}</span>
            <button type="button" className="clause-toggle" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <b>{c.title}</b><span aria-hidden="true">{open === i ? "−" : "+"}</span>
            </button>
            {open === i ? (
              <ol className="clause">
                <li><span className="caption">Original wording <SourceBadge source="document_says" /></span><p className="quote">“{c.quote}”</p></li>
                <li><span className="caption">What it means <SourceBadge source="ai_explained" /></span><p>{c.plain}</p></li>
                {c.why && <li><span className="caption">Why it matters</span><p>{c.why}</p></li>}
                <li><span className="caption">Evidence</span><button type="button" className="link small" onClick={() => onShow(`cond-${i}`)}>Show me where in the document</button></li>
                <li><span className="caption">Confidence</span><p>{CONF[c.confidence] ?? "Medium"}</p></li>
              </ol>
            ) : <p>{c.plain}</p>}
          </li>
        ))}
      </ul>
      <p className="small muted">Found by AI in your document. Every one links to its exact sentence, so you can check it yourself.</p>
    </section>
  );
}
