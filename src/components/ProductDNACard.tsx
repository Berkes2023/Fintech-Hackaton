"use client";

import { useState } from "react";
import type { ProductDNA } from "@/lib/dna";
import { money, pct } from "@/lib/format";

const val = (x: number | null, f: (n: number) => string) => (x === null ? "—" : f(x));

/** The universal fingerprint: the same fields for any product, readable by people and by machines. */
export function ProductDNACard({ dna }: { dna: ProductDNA }) {
  const [copied, setCopied] = useState(false);
  const fees = Object.entries(dna.fees).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${money(v)}`).join(" · ") || "None stated";
  const rows: [string, string][] = [
    ["Principal", val(dna.principal, (x) => money(x))],
    ["Payment", `${money(dna.regular_payment, true)} ${dna.frequency}`],
    ["Term", val(dna.term_months, (x) => `${x} months`)],
    ["Rate", dna.rate.measure ? `${pct(dna.rate.value ?? 0)} ${dna.rate.measure} · ${dna.rate.kind === "not stated" ? "fixed or variable not stated" : dna.rate.kind}` : "No interest rate"],
    ["Fees", fees],
    ["Total payable", val(dna.total_payable, (x) => money(x))],
    ["Early repayment", dna.early_repayment],
    ["Auto-renews", dna.auto_renews === null ? "Not stated" : dna.auto_renews ? "Yes" : "No"],
  ];
  const copy = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(dna, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
  };
  return (
    <section className="card stack" aria-labelledby="dna-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="dna-title" className="h3">Product DNA</h2>
        <button type="button" className="btn btn-light btn-sm" onClick={copy}>{copied ? "Copied" : "Copy as JSON"}</button>
      </div>
      <p className="small muted">Every product, however its contract is written, translated into the same standard fields. That’s what makes any two offers comparable.</p>
      <dl className="dna">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {dna.estimated_fields.length > 0 && <p className="small">Estimated (not in the document): {dna.estimated_fields.join(", ")}.</p>}
    </section>
  );
}
