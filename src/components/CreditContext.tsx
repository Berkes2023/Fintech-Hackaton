"use client";

import { useState } from "react";
import {
  bandFor, bandPosition, CRA_LABEL, exploreProfile, QUESTIONS, SCALES, withScore,
  type Cra, type CreditProfile, type Scale, type ScaleId,
} from "@/lib/credit";

/** The selected agency's own scale, with the person's score marked on it. */
export function ScaleBar({ scale, score }: { scale: Scale; score?: number }) {
  const band = score === undefined ? null : bandFor(scale, score);
  const at = score === undefined || !band ? null : bandPosition(scale, score);
  return (
    <figure className="scale" aria-label={`${scale.name} scale, ${scale.min} to ${scale.max}${band ? `. Your score ${score} is in the ${band.label} band.` : ""}`}>
      <div className="scale-track">
        {scale.bands.map((b) => (
          <span key={b.label} className={`scale-band${band?.label === b.label ? " on" : ""}`} style={{ flexGrow: 1 }}>
            <span className="scale-label">{b.label}</span>
            <span className="scale-range">{b.from}–{b.to}</span>
          </span>
        ))}
        {at !== null && <span className="scale-marker" style={{ left: `${at * 100}%` }} aria-hidden="true"><b>{score}</b></span>}
      </div>
      <figcaption className="small muted">Bands drawn at equal widths for readability. Scale published by {scale.name.split(" ")[0]}. <a className="link" href={scale.url} target="_blank" rel="noreferrer">Source</a>{scale.note ? ` · ${scale.note}` : ""}</figcaption>
    </figure>
  );
}

/**
 * The credit-context starting point: pick an agency and enter the score you've seen, or explore your profile.
 * Everything is user-supplied. We never calculate or convert a score, and never link it to a rate.
 */
export function CreditContext({ credit, onChange }: { credit: CreditProfile; onChange: (c: CreditProfile) => void }) {
  const [choice, setChoice] = useState<Cra | "unknown" | null>(credit.mode === "score" ? credit.creditProvider ?? null : credit.mode === "explore" ? "unknown" : null);
  const scaleId: ScaleId | null = choice === "transunion" ? (credit.creditScale === "transunion_old" ? "transunion_old" : "transunion_new") : choice === "experian" || choice === "equifax" ? choice : null;
  const scale = scaleId ? SCALES[scaleId] : null;
  const score = credit.mode === "score" && credit.creditScale === scaleId ? credit.creditScore : undefined;
  const band = scale && score !== undefined ? bandFor(scale, score) : null;
  const answers = credit.explore ?? {};
  const result = exploreProfile(answers);

  const pick = (c: Cra | "unknown") => {
    setChoice(c);
    if (c === "unknown") onChange({ mode: "unknown", creditSource: "USER_SUPPLIED", explore: credit.explore });
    else onChange(withScore(credit, c === "transunion" ? "transunion_new" : c, undefined));
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="cra-grid" role="group" aria-label="Which credit score are you using?">
        {(Object.keys(CRA_LABEL) as Cra[]).map((c) => (
          <button key={c} type="button" className={`choice cra${choice === c ? " on" : ""}`} aria-pressed={choice === c} onClick={() => pick(c)}>
            <b>{CRA_LABEL[c]}</b>
            <span className="small muted">{c === "transunion" ? "0–999 (new) or 0–710" : `0–${SCALES[c].max}`}</span>
          </button>
        ))}
        <button type="button" className={`choice cra${choice === "unknown" ? " on" : ""}`} aria-pressed={choice === "unknown"} onClick={() => pick("unknown")}>
          <b>I don’t know my score</b><span className="small muted">Explore your profile instead</span>
        </button>
      </div>

      {scale && scaleId && (
        <section className="card stack" aria-labelledby="cs-title">
          <span className="caption" id="cs-title">Your credit profile · {CRA_LABEL[scale.cra]}</span>
          {scale.cra === "transunion" && (
            <div className="segmented" role="group" aria-label="Which TransUnion scale does your score use?">
              <button type="button" aria-pressed={scaleId === "transunion_new"} onClick={() => onChange(withScore(credit, "transunion_new", score))}>New 0–999 scale</button>
              <button type="button" aria-pressed={scaleId === "transunion_old"} onClick={() => onChange(withScore(credit, "transunion_old", score))}>Older 0–710 scale</button>
            </div>
          )}
          <div className="field" style={{ maxWidth: 260 }}>
            <label htmlFor="cs-score">What’s your score?</label>
            <div className="input"><input id="cs-score" type="number" inputMode="numeric" min={scale.min} max={scale.max} placeholder={`${scale.min}–${scale.max}`} value={score ?? ""} onChange={(e) => onChange(withScore(credit, scaleId, e.target.value === "" ? undefined : Math.round(Number(e.target.value))))} /></div>
            <p className="help">As shown in your {CRA_LABEL[scale.cra]} app or report.</p>
          </div>
          {score !== undefined && !band && <p className="missing-banner small">That’s outside this scale’s range ({scale.min}–{scale.max}). Check which scale your app uses.</p>}
          <ScaleBar scale={scale} score={band ? score : undefined} />
          {band && <p><b>{score} is in {CRA_LABEL[scale.cra]}’s “{band.label}” band ({band.from}–{band.to}).</b> {band.plain}</p>}
          <p className="small muted">You supplied this score; Before You Sign doesn’t calculate it. Agencies use different scales and methods, so a score from one isn’t comparable with another, and each lender uses its own criteria.</p>
        </section>
      )}

      {choice === "unknown" && (
        <section className="card stack" aria-labelledby="ex-title">
          <span className="caption" id="ex-title">Explore my credit profile</span>
          <p className="small">A few plain questions about things that can show on a credit report. This won’t produce an Experian, Equifax or TransUnion score: their methods are their own.</p>
          {QUESTIONS.map((q) => (
            <fieldset key={q.id} className="ex-q">
              <legend>{q.ask}</legend>
              <div className="chips">
                {q.options.map((o) => (
                  <button key={o.id} type="button" className="chip" aria-pressed={answers[q.id] === o.id}
                    onClick={() => onChange({ mode: "explore", creditSource: "USER_SUPPLIED", explore: { ...answers, [q.id]: o.id } })}>{o.label}</button>
                ))}
              </div>
            </fieldset>
          ))}
          {result.reasons.length > 0 && (
            <div className="ex-result stack">
              <span className="caption">Before You Sign credit profile · not an official score</span>
              <b className="h3">{result.label}</b>
              <p className="small">{result.summary}</p>
              <details className="why">
                <summary>Why?</summary>
                <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 6 }}>
                  {result.reasons.map((r) => <li key={r.question}><b>{r.answer}</b> to “{r.question}” · {r.why}</li>)}
                </ul>
              </details>
            </div>
          )}
        </section>
      )}

      <div className="grid-2 not-equal">
        <div className="card stack"><span className="caption">Credit profile</span><p className="small">Can influence how lenders assess an application, and the products or rates they may offer.</p></div>
        <div className="card stack"><span className="caption">Affordability</span><p className="small">Whether a new commitment fits your income, spending and plans. A high score doesn’t mean a payment fits.</p></div>
      </div>
      <p className="small muted">That’s why Before You Sign looks at both: your credit context, your situation now, the decision, the finance terms, and what you know about your future.</p>
    </div>
  );
}
