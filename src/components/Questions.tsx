"use client";

import { useState } from "react";
import type { Question } from "@/lib/dna";

/** Turns what's missing or unclear into questions to ask the provider. Preparation, not advice. */
export function Questions({ questions }: { questions: Question[] }) {
  const [copied, setCopied] = useState(false);
  if (!questions.length) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(questions.map((q, i) => `${i + 1}. ${q.q}`).join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
  };
  return (
    <section className="card stack" aria-labelledby="questions-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="questions-title" className="h3">Questions worth asking</h2>
        <button type="button" className="btn btn-light btn-sm" onClick={copy}>{copied ? "Copied" : "Copy the list"}</button>
      </div>
      <ol className="questions">
        {questions.map((q) => <li key={q.q}><b>{q.q}</b><p className="small muted">{q.why}</p></li>)}
      </ol>
    </section>
  );
}
