"use client";

import { useState } from "react";
import type { Concept } from "@/lib/concepts";

/** A 30-second explainer and one-question check, offered when someone keeps asking about the same idea. */
export function LearnNudge({ concept, onDismiss }: { concept: Concept; onDismiss: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === concept.check.answer;
  return (
    <div className="nudge" role="region" aria-label={`Explainer: ${concept.title}`}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <b>Looks like {concept.title} is the tricky bit. Here’s a 30-second explainer.</b>
        <button type="button" className="link small" onClick={onDismiss}>Hide</button>
      </div>
      <p className="small">{concept.explain}</p>
      <p className="small"><b>Example:</b> {concept.example}</p>
      <fieldset className="quiz">
        <legend className="small" style={{ fontWeight: 700 }}>{concept.check.q}</legend>
        {concept.check.options.map((o, i) => (
          <label key={o} className={`quiz-option${picked === i ? " picked" : ""}`} style={{ padding: "8px 14px" }}>
            <input type="radio" name={`nudge-${concept.id}`} checked={picked === i} onChange={() => setPicked(i)} />
            {o}
          </label>
        ))}
      </fieldset>
      {picked !== null && <p className="small" role="status"><b>{right ? "✓ Got it. " : "Not quite. "}</b>{concept.check.why}</p>}
    </div>
  );
}
