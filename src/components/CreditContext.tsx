"use client";

import { useState } from "react";
import {
  bandFor, bandPosition, COMPONENT_MAX, CRA_LABEL, creditEstimate, ESTIMATE_BANDS, LABELS, missingAnswers, SCALES, withScore,
  type BorrowingKind, type Cra, type CreditProfile, type EstimateInputs, type Scale, type ScaleId,
} from "@/lib/credit";
import { money } from "@/lib/format";
import { Icon } from "./Icon";

/* ---------- the gauge ---------- */

const GREYS = ["#e3e3e6", "#c9c9cd", "#a1a1a6", "#717173", "#1f1f1f"];
const pt = (t: number, r: number) => { const a = Math.PI * (1 - t); return [100 + r * Math.cos(a), 100 - r * Math.sin(a)]; };
const arc = (t0: number, t1: number, r: number) => { const [x0, y0] = pt(t0, r), [x1, y1] = pt(t1, r); return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}`; };

/** A half-circle gauge. Bands are drawn at equal widths; `at` (0–1) places the needle within them. */
export function Gauge({ bands, at, value, sub, label }: { bands: string[]; at: number | null; value: string; sub: string; label: string }) {
  const n = bands.length, gap = 0.008;
  return (
    <figure className="gauge" role="img" aria-label={label}>
      <svg viewBox="0 0 200 116">
        {bands.map((b, i) => <path key={b} d={arc(i / n + gap, (i + 1) / n - gap, 80)} stroke={GREYS[i] ?? "#1f1f1f"} strokeWidth="16" fill="none" />)}
        {at !== null && (() => { const [x, y] = pt(at, 62); return <><line x1="100" y1="100" x2={x} y2={y} stroke="#1f1f1f" strokeWidth="3.5" strokeLinecap="round" /><circle cx="100" cy="100" r="6" fill="#1f1f1f" /></>; })()}
      </svg>
      <figcaption><b>{value}</b><span>{sub}</span></figcaption>
      <ol className="gauge-legend">{bands.map((b, i) => <li key={b}><i style={{ background: GREYS[i] }} />{b}</li>)}</ol>
    </figure>
  );
}

/** An agency's own scale, with the person's score marked on it. */
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

/* ---------- step 1: understand your credit ---------- */

type Path = "score" | "estimate";
const SECTIONS = [
  { title: "Repayment history", max: 35, keys: ["onTime", "missed", "defaults", "ccj"] },
  { title: "Credit utilisation", max: 25, keys: ["cardLimits", "cardBalances"] },
  { title: "Length of credit history", max: 15, keys: ["history"] },
  { title: "Recent credit applications", max: 10, keys: ["applications"] },
  { title: "Existing borrowing", max: 10, keys: ["borrowing", "keeping", "overdraftRegular"] },
  { title: "Credit report indicators", max: 5, keys: ["electoralRoll", "insolvency"] },
];

function Choice<T extends string>({ legend, help, options, value, onPick }: { legend: string; help?: string; options: Record<T, string>; value?: T; onPick: (v: T) => void }) {
  return (
    <fieldset className="ex-q">
      <legend>{legend}</legend>
      {help && <p className="small muted" style={{ margin: "0 0 4px" }}>{help}</p>}
      <div className="chips">
        {(Object.keys(options) as T[]).map((k) => <button key={k} type="button" className="chip" aria-pressed={value === k} onClick={() => onPick(k)}>{options[k]}</button>)}
      </div>
    </fieldset>
  );
}

const numOrUndef = (s: string) => (s.trim() === "" ? undefined : Number(s));

/**
 * The gateway into Before You Sign. Two paths: enter a score you already know (Experian, Equifax or TransUnion, on
 * its own scale), or build our educational 0–100 estimate. Calls onResult when there is a result to show.
 */
export function CreditStart({ credit, onChange, onResult }: { credit: CreditProfile; onChange: (c: CreditProfile) => void; onResult: () => void }) {
  const [path, setPath] = useState<Path | null>(credit.mode === "score" ? "score" : credit.mode === "estimate" ? "estimate" : null);
  const [section, setSection] = useState(0);
  const cra: Cra | null = credit.mode === "score" ? credit.creditProvider ?? null : null;
  const scaleId: ScaleId | null = credit.mode === "score" ? credit.creditScale ?? null : null;
  const scale = scaleId ? SCALES[scaleId] : null;
  const score = credit.mode === "score" ? credit.creditScore : undefined;
  const band = scale && score !== undefined ? bandFor(scale, score) : null;
  const a: EstimateInputs = credit.estimate ?? {};
  const setA = (patch: Partial<EstimateInputs>) => onChange({ mode: "estimate", creditSource: "USER_SUPPLIED", estimate: { ...a, ...patch }, calculated: false });
  const missing = missingAnswers(a);
  const sec = SECTIONS[section];
  const secDone = sec.keys.every((k) => !missing.includes(k));
  const r = creditEstimate(a);
  const util = a.cardLimits && a.cardLimits > 0 && a.cardBalances !== undefined && a.cardBalances >= 0 ? Math.round((a.cardBalances / a.cardLimits) * 1000) / 10 : null;
  const kinds = a.borrowing ?? [];

  const pickPath = (p: Path) => {
    setPath(p);
    if (p === "estimate" && credit.mode !== "estimate") onChange({ mode: "estimate", creditSource: "USER_SUPPLIED", estimate: credit.estimate ?? {}, calculated: false });
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="path-grid">
        <button type="button" className={`path-card${path === "score" ? " on" : ""}`} aria-pressed={path === "score"} onClick={() => pickPath("score")}>
          <span className="goal-icon" aria-hidden="true"><Icon name="shield" size={26} /></span>
          <b>I know my credit score</b>
          <span className="small">From Experian, Equifax or TransUnion. We’ll show it on that agency’s own scale.</span>
        </button>
        <button type="button" className={`path-card${path === "estimate" ? " on" : ""}`} aria-pressed={path === "estimate"} onClick={() => pickPath("estimate")}>
          <span className="goal-icon" aria-hidden="true"><Icon name="calc" size={26} /></span>
          <b>Help me estimate my credit profile</b>
          <span className="small">A few questions, then our transparent 0–100 educational estimate, worked out step by step.</span>
        </button>
      </div>

      {path === "score" && (
        <section className="card stack" aria-labelledby="cra-q">
          <h3 id="cra-q" className="h3">Which credit reference agency is your score from?</h3>
          <div className="cra-grid">
            {(Object.keys(CRA_LABEL) as Cra[]).map((c) => (
              <button key={c} type="button" className={`choice cra${cra === c ? " on" : ""}`} aria-pressed={cra === c} onClick={() => onChange(withScore(credit, c === "transunion" ? "transunion_new" : c, undefined))}>
                <b>{CRA_LABEL[c]}</b><span className="small muted">{c === "transunion" ? "0–999 (new) or 0–710" : `0–${SCALES[c].max}`}</span>
              </button>
            ))}
          </div>
          {scale && scaleId && (<>
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
            <button type="button" className="btn btn-dark" style={{ justifySelf: "start" }} disabled={!band} onClick={onResult}>See my credit result <Icon name="arrow" size={18} /></button>
          </>)}
        </section>
      )}

      {path === "estimate" && (
        <section className="card stack" aria-labelledby="est-q">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="caption" id="est-q">Section {section + 1} of {SECTIONS.length} · {sec.title} · up to {sec.max} points</span>
            <span className="small muted">Before You Sign Credit Estimate</span>
          </div>
          <ol className="sec-dots" aria-hidden="true">{SECTIONS.map((s, i) => <li key={s.title} className={i < section ? "done" : i === section ? "now" : undefined} />)}</ol>

          {section === 0 && (<>
            <Choice legend="Do you usually make repayments on time?" options={LABELS.onTime} value={a.onTime} onPick={(onTime) => setA({ onTime })} />
            {a.onTime && a.onTime !== "no_history" && (<>
              <Choice legend="Missed or late repayments in the last 12 months?" options={LABELS.missed} value={a.missed} onPick={(missed) => setA({ missed })} />
              <Choice legend="Any defaults in the last 6 years?" options={LABELS.defaults} value={a.defaults} onPick={(defaults) => setA({ defaults })} />
              <Choice legend="Any county court judgments (CCJs) in the last 6 years?" options={LABELS.ccj} value={a.ccj} onPick={(ccj) => setA({ ccj })} />
            </>)}
          </>)}

          {section === 1 && (<>
            <p className="small muted">Add up all your credit cards. Enter 0 if you don’t have any.</p>
            <div className="journey-fields">
              <div className="field"><label htmlFor="ce-lim">Total credit-card limits</label><div className="input"><span>£</span><input id="ce-lim" type="number" min={0} step={100} inputMode="decimal" value={a.cardLimits ?? ""} placeholder="e.g. 5000" onChange={(e) => setA({ cardLimits: numOrUndef(e.target.value) })} /></div></div>
              <div className="field"><label htmlFor="ce-bal">Current credit-card balances</label><div className="input"><span>£</span><input id="ce-bal" type="number" min={0} step={50} inputMode="decimal" value={a.cardBalances ?? ""} placeholder="e.g. 1000" onChange={(e) => setA({ cardBalances: numOrUndef(e.target.value) })} /></div></div>
            </div>
            {!r.ok && r.invalid.length > 0 && <p className="missing-banner small">Amounts can’t be negative.</p>}
            {util !== null && <div className="big-fact" aria-live="polite"><span className="caption">Your utilisation</span><span className="small">{money(a.cardBalances!)} used ÷ {money(a.cardLimits!)} available</span><b>= {util}%</b></div>}
            {a.cardLimits === 0 && <p className="small">No card limits: there’s no utilisation to measure, so this section is treated as neutral.</p>}
          </>)}

          {section === 2 && <Choice legend="How long have you had credit accounts?" options={LABELS.history} value={a.history} onPick={(history) => setA({ history })} />}

          {section === 3 && <Choice legend="Approximately how many hard credit applications have you made recently?" help="Applications for loans, cards or finance in roughly the last 6 months. Only what you remember: we can’t see your credit report." options={LABELS.applications} value={a.applications} onPick={(applications) => setA({ applications })} />}

          {section === 4 && (<>
            <fieldset className="ex-q">
              <legend>Which kinds of borrowing do you have at the moment?</legend>
              <div className="chips">
                {(Object.keys(LABELS.borrowing) as BorrowingKind[]).map((k) => (
                  <button key={k} type="button" className="chip" aria-pressed={kinds.includes(k)} onClick={() => setA({ borrowing: kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k] })}>{LABELS.borrowing[k]}</button>
                ))}
                <button type="button" className="chip" aria-pressed={a.borrowing !== undefined && kinds.length === 0} onClick={() => setA({ borrowing: [], keeping: undefined, overdraftRegular: undefined })}>None</button>
              </div>
            </fieldset>
            {kinds.length > 0 && <Choice legend="How are you keeping up with these repayments?" options={LABELS.keeping} value={a.keeping} onPick={(keeping) => setA({ keeping })} />}
            {kinds.includes("overdraft") && <Choice legend="Are you regularly in your overdraft?" options={LABELS.yesNo} value={a.overdraftRegular} onPick={(overdraftRegular) => setA({ overdraftRegular })} />}
            <p className="small muted">Having credit isn’t penalised. Your income and living costs aren’t used here: they belong to your situation, later.</p>
          </>)}

          {section === 5 && (<>
            <Choice legend="Are you registered on the electoral roll at your current address?" options={LABELS.electoralRoll} value={a.electoralRoll} onPick={(electoralRoll) => setA({ electoralRoll })} />
            <Choice legend="Any bankruptcy, IVA or debt relief order in the last 6 years?" options={LABELS.yesNo} value={a.insolvency} onPick={(insolvency) => setA({ insolvency })} />
          </>)}

          <div className="wizard-nav">
            {section > 0 ? <button type="button" className="btn btn-light" onClick={() => setSection(section - 1)}>Previous section</button> : <span />}
            {section < SECTIONS.length - 1
              ? <button type="button" className="btn btn-dark" disabled={!secDone} onClick={() => setSection(section + 1)}>Next section <Icon name="arrow" size={18} /></button>
              : <button type="button" className="btn btn-dark" disabled={!r.ok} onClick={() => { onChange({ mode: "estimate", creditSource: "USER_SUPPLIED", estimate: a, calculated: true }); onResult(); }}>Calculate my estimate <Icon name="arrow" size={18} /></button>}
          </div>
        </section>
      )}

      <p className="small muted">Your credit profile can influence the borrowing options and terms you may see. It’s a different question from whether a commitment fits your situation, and we look at that next.</p>
    </div>
  );
}

/* ---------- step 2: your credit context ---------- */

/** The result before anything else: the agency score on its own scale, or our calculated estimate with every point explained. */
export function CreditResult({ credit }: { credit: CreditProfile }) {
  if (credit.mode === "score" && credit.creditScale && credit.creditScore !== undefined) {
    const scale = SCALES[credit.creditScale];
    const band = bandFor(scale, credit.creditScore);
    return (
      <div className="stack" style={{ gap: 16 }}>
        <span className="src-tag">USER-SUPPLIED CREDIT SCORE</span>
        <Gauge bands={scale.bands.map((b) => b.label)} at={band ? bandPosition(scale, credit.creditScore) : null} value={String(credit.creditScore)} sub={`${CRA_LABEL[scale.cra]} · out of ${scale.max}`}
          label={`${CRA_LABEL[scale.cra]} score ${credit.creditScore}, in the ${band?.label ?? "unknown"} band`} />
        <dl className="mlabel-rows">
          <div><dt>Provider</dt><dd>{CRA_LABEL[scale.cra]}</dd></div>
          <div><dt>Score</dt><dd>{credit.creditScore} (scale {scale.min}–{scale.max})</dd></div>
          <div className="strong"><dt>Band</dt><dd>{band ? `${band.label} (${band.from}–${band.to})` : "Outside this scale"}</dd></div>
        </dl>
        {band && <p>{band.plain} This is {CRA_LABEL[scale.cra]}’s own band for your score. Other agencies use different scales, so we don’t convert it.</p>}
        <ScaleBar scale={scale} score={credit.creditScore} />
      </div>
    );
  }
  if (credit.mode === "estimate" && credit.estimate) {
    const r = creditEstimate(credit.estimate);
    if (!r.ok) return <p className="missing-banner small">Some answers are missing, so we can’t calculate an estimate yet.</p>;
    const e = r.estimate;
    return (
      <div className="stack" style={{ gap: 16 }}>
        <span className="src-tag">BEFORE YOU SIGN CREDIT ESTIMATE · EDUCATIONAL</span>
        <Gauge bands={ESTIMATE_BANDS.map((b) => b.label.replace(" indicators", ""))} at={e.total / 100} value={`${e.total} / 100`} sub={e.bandLabel} label={`Before You Sign Credit Estimate ${e.total} out of 100, ${e.bandLabel}`} />
        <p className="estimate-note small"><b>This is an educational Before You Sign estimate, not an official Experian, Equifax or TransUnion credit score and not a prediction of lender approval.</b> The bands (80–100 stronger, 60–79 generally positive, 40–59 mixed, 20–39 some weaker, 0–19 significant weaker) are ours, not a credit reference agency’s.</p>
        <section className="stack" aria-labelledby="why-est">
          <h3 id="why-est" className="h3">Why did I get {e.total}?</h3>
          <div className="est-table">
            {e.components.map((c) => (
              <details key={c.key} className="est-row">
                <summary><span>{c.key === "stability" ? "Other report indicators" : c.label}</span><span className="est-bar" aria-hidden="true"><i style={{ width: `${(c.points / c.max) * 100}%` }} /></span><b>{c.points} / {c.max}</b></summary>
                <ul className="small">
                  {c.why.map((w) => <li key={w}>{w}</li>)}
                </ul>
                <table className="why-table small"><tbody>
                  {c.steps.map((s) => <tr key={s.text}><td>{s.text}</td><td className="num">{s.points > 0 && c.steps.length > 1 && s !== c.steps[0] ? "+" : ""}{s.points}</td></tr>)}
                  <tr className="why-total"><td>= {c.label}{c.steps.reduce((x, s) => x + s.points, 0) !== c.points ? " (kept between 0 and the maximum)" : ""}</td><td className="num">{c.points} / {COMPONENT_MAX[c.key]}</td></tr>
                </tbody></table>
              </details>
            ))}
            <div className="est-total"><span>Total</span><b>{e.total} / 100</b></div>
          </div>
          <p className="small muted">Our weights (35, 25, 15, 10, 10, 5) are an educational model, not the weights any credit reference agency uses. Your salary, rent, bonus and living costs are not part of this number.</p>
        </section>
      </div>
    );
  }
  return <p className="missing-banner small">No credit result yet.</p>;
}
