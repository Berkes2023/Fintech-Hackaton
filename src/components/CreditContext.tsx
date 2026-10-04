"use client";

import { useState } from "react";
import {
  bandFor, bandPosition, COMPONENT_MAX, CRA_LABEL, CRA_ORDER, creditEstimate, CURRENT_SCALE, ESTIMATE_BANDS, LABELS, makeScore, missingAnswers,
  removeScore, SCALES, upsertScore,
  type BorrowingKind, type Cra, type CraScore, type CreditProfile, type EstimateInputs, type Scale, type ScaleId,
} from "@/lib/credit";
import { money } from "@/lib/format";
import { Icon } from "./Icon";

/* ---------- gauges ---------- */

const GREYS = ["#e3e3e6", "#c9c9cd", "#a1a1a6", "#717173", "#1f1f1f"];
const pt = (t: number, r: number) => { const a = Math.PI * (1 - t); return [100 + r * Math.cos(a), 100 - r * Math.sin(a)]; };
const arc = (t0: number, t1: number, r: number) => { const [x0, y0] = pt(t0, r), [x1, y1] = pt(t1, r); return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}`; };

/** A half-circle gauge for one agency's scale. Bands are drawn at equal widths; `at` (0–1) places the needle within them. */
export function Gauge({ bands, at, value, sub, label, legend = true }: { bands: string[]; at: number | null; value: string; sub: string; label: string; legend?: boolean }) {
  const n = bands.length, gap = 0.008;
  return (
    <figure className="gauge" role="img" aria-label={label}>
      <svg viewBox="0 0 200 116">
        {bands.map((b, i) => <path key={b} d={arc(i / n + gap, (i + 1) / n - gap, 80)} stroke={GREYS[i] ?? "#1f1f1f"} strokeWidth="16" fill="none" />)}
        {at !== null && (() => { const [x, y] = pt(at, 62); return <><line x1="100" y1="100" x2={x} y2={y} stroke="#1f1f1f" strokeWidth="3.5" strokeLinecap="round" /><circle cx="100" cy="100" r="6" fill="#1f1f1f" /></>; })()}
      </svg>
      <figcaption><b>{value}</b><span>{sub}</span></figcaption>
      {legend && <ol className="gauge-legend">{bands.map((b, i) => <li key={b}><i style={{ background: GREYS[i] }} />{b}</li>)}</ol>}
    </figure>
  );
}

/** One agency's published bands as a strip, for the selection cards and the story. */
export function BandStrip({ scale, score }: { scale: Scale; score?: number }) {
  const band = score === undefined ? null : bandFor(scale, score);
  return (
    <ol className="band-strip" aria-label={`${scale.name} bands`}>
      {scale.bands.map((b, i) => (
        <li key={b.label} className={band?.label === b.label ? "on" : undefined}>
          <i style={{ background: GREYS[i] }} />
          <span>{b.label}</span>
          <span className="muted">{b.from}–{b.to}</span>
        </li>
      ))}
    </ol>
  );
}

/** A gauge card for one entered score, on that agency's own scale only. */
export function ScoreCard({ s, explain = true }: { s: CraScore; explain?: boolean }) {
  const scale = SCALES[s.creditScale];
  const band = bandFor(scale, s.creditScore);
  return (
    <div className="score-card stack">
      <div className="row" style={{ justifyContent: "space-between" }}><b className="h3">{CRA_LABEL[s.creditProvider]}</b><span className="src-tag">Score entered by you</span></div>
      <Gauge bands={scale.bands.map((b) => b.label)} at={band ? bandPosition(scale, s.creditScore) : null} value={`${s.creditScore}`} sub={`/ ${scale.max} · ${s.creditBand}`} label={`${CRA_LABEL[s.creditProvider]} ${s.creditScore} out of ${scale.max}, ${s.creditBand}`} legend={false} />
      <BandStrip scale={scale} score={s.creditScore} />
      {explain && band && <p className="small">{band.plain} {scale.cra === "transunion" && s.creditScale === "transunion_old" ? "Shown on TransUnion’s older 0–710 scale, as you chose." : ""}</p>}
      <p className="small muted">{scale.name.split(" (")[0]} scale {scale.min}–{scale.max}. <a className="link" href={scale.url} target="_blank" rel="noreferrer">Source</a></p>
    </div>
  );
}

/** The three agencies and their ranges: the "you don't have one credit score" story. */
export function ThreeScales() {
  return (
    <div className="three-scales">
      {CRA_ORDER.map((c) => {
        const s = SCALES[CURRENT_SCALE[c]];
        return <div key={c} className="three-scale"><b>{CRA_LABEL[c]}</b><span className="range">{s.min}–{s.max}</span><BandStrip scale={s} /></div>;
      })}
    </div>
  );
}

/* ---------- step 1: let's understand your credit ---------- */

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
 * The gateway into Before You Sign, built around the three UK credit reference agencies. Enter any or all of your
 * Experian, Equifax and TransUnion scores (each read only on its own scale), or, if you don't know them, answer a few
 * questions for our separate, educational profile estimate. Calls onResult when there's a credit context to show.
 */
export function CreditStart({ credit, onChange, onResult, initial = null }: { credit: CreditProfile; onChange: (c: CreditProfile) => void; onResult: () => void; initial?: Cra | "unknown" | null }) {
  const [active, setActive] = useState<Cra | "unknown" | null>(initial);
  const [drafts, setDrafts] = useState<Partial<Record<Cra, string>>>(() => Object.fromEntries(credit.scores.map((s) => [s.creditProvider, String(s.creditScore)])));
  const [tuScale, setTuScale] = useState<ScaleId>(credit.scores.find((s) => s.creditProvider === "transunion")?.creditScale ?? "transunion_new");
  const [section, setSection] = useState(0);
  const entered = (c: Cra) => credit.scores.find((s) => s.creditProvider === c);
  const scaleOf = (c: Cra): ScaleId => (c === "transunion" ? tuScale : CURRENT_SCALE[c]);

  const enter = (c: Cra, raw: string, scaleId = scaleOf(c)) => {
    setDrafts({ ...drafts, [c]: raw });
    const v = raw.trim() === "" ? NaN : Number(raw);
    const s = makeScore(scaleId, v);
    onChange(s ? upsertScore(credit, s) : removeScore(credit, c));
  };

  const a: EstimateInputs = credit.estimate ?? {};
  const setA = (patch: Partial<EstimateInputs>) => onChange({ ...credit, estimate: { ...a, ...patch }, calculated: false });
  const missing = missingAnswers(a);
  const sec = SECTIONS[section];
  const secDone = sec.keys.every((k) => !missing.includes(k));
  const r = creditEstimate(a);
  const util = a.cardLimits && a.cardLimits > 0 && a.cardBalances !== undefined && a.cardBalances >= 0 ? Math.round((a.cardBalances / a.cardLimits) * 1000) / 10 : null;
  const kinds = a.borrowing ?? [];

  const craPanel = (c: Cra) => {
    const scaleId = scaleOf(c);
    const scale = SCALES[scaleId];
    const raw = drafts[c] ?? "";
    const v = raw.trim() === "" ? null : Number(raw);
    const valid = v !== null && makeScore(scaleId, v);
    const remaining = CRA_ORDER.filter((x) => x !== c && !entered(x));
    return (
      <section className="card stack" aria-labelledby={`q-${c}`}>
        <label id={`q-${c}`} htmlFor={`score-${c}`} className="h3">What is your {CRA_LABEL[c]} score?</label>
        <div className="score-entry">
          <div className="input"><input id={`score-${c}`} type="number" inputMode="numeric" min={scale.min} max={scale.max} step={1} placeholder="Your score" value={raw} onChange={(e) => enter(c, e.target.value)} /></div>
          <span className="score-max">/ {scale.max}</span>
        </div>
        {c === "transunion" && (
          <label className="quiz-option small"><input type="checkbox" checked={tuScale === "transunion_old"} onChange={(e) => { const id: ScaleId = e.target.checked ? "transunion_old" : "transunion_new"; setTuScale(id); enter(c, raw, id); }} /> My app still shows TransUnion’s older 0–710 scale</label>
        )}
        {v !== null && !valid && <p className="missing-banner small">{CRA_LABEL[c]} scores on this scale are whole numbers from {scale.min} to {scale.max}. Please check the number in your {CRA_LABEL[c]} app.</p>}
        {valid ? <ScoreCard s={valid} /> : <BandStrip scale={scale} />}
        {valid && (
          <div className="row" style={{ gap: 10 }}>
            {remaining.length > 0 && <span className="small muted">Add another credit score:</span>}
            {remaining.map((x) => <button key={x} type="button" className="btn btn-light btn-sm" onClick={() => setActive(x)}>+ {CRA_LABEL[x]}</button>)}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="cra-cards" role="group" aria-label="Choose a credit reference agency">
        {CRA_ORDER.map((c) => {
          const s = SCALES[CURRENT_SCALE[c]];
          const e = entered(c);
          return (
            <button key={c} type="button" className={`cra-card${active === c ? " on" : ""}${e ? " has" : ""}`} aria-pressed={active === c} onClick={() => setActive(c)}>
              <b className="cra-name">{CRA_LABEL[c]}</b>
              <span className="small">{c === "transunion" ? "Current/new score range" : "Score range"}</span>
              <span className="cra-range">{s.min}–{s.max}</span>
              <span className="cra-mini" aria-hidden="true">{s.bands.map((b, i) => <i key={b.label} style={{ background: GREYS[i] }} />)}</span>
              <span className="cra-state small">{e ? <><Icon name="shield" size={14} /> {e.creditScore} / {SCALES[e.creditScale].max} · {e.creditBand}</> : "Enter my score"}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className={`unknown-card${active === "unknown" ? " on" : ""}`} aria-pressed={active === "unknown"} onClick={() => setActive("unknown")}>
        <span><b>I don’t know my credit score</b><span className="small">Help me understand my credit profile with a few questions instead.</span></span>
        <Icon name="arrow" size={20} />
      </button>

      {active && active !== "unknown" && craPanel(active)}

      {active === "unknown" && (
        <section className="card stack" aria-labelledby="est-q">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="caption" id="est-q">Section {section + 1} of {SECTIONS.length} · {sec.title} · up to {sec.max} points</span>
            <span className="small muted">Before You Sign profile estimate</span>
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
            <Choice legend="Are you registered on the electoral register at your current address?" options={LABELS.electoralRoll} value={a.electoralRoll} onPick={(electoralRoll) => setA({ electoralRoll })} />
            <Choice legend="Any bankruptcy, IVA or debt relief order in the last 6 years?" options={LABELS.yesNo} value={a.insolvency} onPick={(insolvency) => setA({ insolvency })} />
          </>)}

          <div className="wizard-nav">
            {section > 0 ? <button type="button" className="btn btn-light" onClick={() => setSection(section - 1)}>Previous section</button> : <span />}
            {section < SECTIONS.length - 1
              ? <button type="button" className="btn btn-dark" disabled={!secDone} onClick={() => setSection(section + 1)}>Next section <Icon name="arrow" size={18} /></button>
              : <button type="button" className="btn btn-dark" disabled={!r.ok} onClick={() => { onChange({ ...credit, estimate: a, calculated: true }); onResult(); }}>Calculate my profile estimate <Icon name="arrow" size={18} /></button>}
          </div>
        </section>
      )}

      {credit.scores.length > 0 && (
        <div className="entered-bar">
          <span className="small"><b>Your scores so far:</b> {credit.scores.map((s) => `${CRA_LABEL[s.creditProvider]} ${s.creditScore} / ${SCALES[s.creditScale].max} (${s.creditBand})`).join(" · ")}</span>
          <button type="button" className="btn btn-dark" onClick={onResult}>See my credit context <Icon name="arrow" size={18} /></button>
        </div>
      )}
    </div>
  );
}

/* ---------- step 2: your credit context ---------- */

/** Every entered score on its own scale (never averaged), and/or our clearly separate profile estimate. */
export function CreditResult({ credit, onEnter }: { credit: CreditProfile; onEnter: (c: Cra) => void }) {
  const r = credit.calculated && credit.estimate ? creditEstimate(credit.estimate) : null;
  const e = r?.ok ? r.estimate : null;
  const notEntered = CRA_ORDER.filter((c) => !credit.scores.some((s) => s.creditProvider === c));
  return (
    <div className="stack" style={{ gap: 20 }}>
      {credit.scores.length > 0 && (<>
        <div className="score-grid">{credit.scores.map((s) => <ScoreCard key={s.creditProvider} s={s} />)}</div>
        <div className="list stack" style={{ gap: 6 }}>
          {credit.scores.map((s) => <p key={s.creditProvider} className="score-row"><b>{CRA_LABEL[s.creditProvider]}</b><span>{s.creditScore} / {SCALES[s.creditScale].max}</span><span className="src-tag">{s.creditBand}</span></p>)}
          {credit.scores.length > 1 && <p className="small"><b>It’s normal for your scores to differ.</b> The three agencies use different data and scoring methods. We never average them or turn them into one score.</p>}
          {credit.scores.length === 1 && <p className="small">Your other agencies may show a different number: they use different data and scoring methods.</p>}
        </div>
      </>)}

      {e && (
        <section className="estimate-card stack" aria-labelledby="pe-title">
          <span id="pe-title" className="caption">Before You Sign profile estimate</span>
          <div className="pe-head"><b>{e.total}</b><span>/ 100</span><span className="pe-band">{e.bandLabel.toUpperCase()}</span></div>
          <div className="pe-bar" aria-hidden="true">
            {ESTIMATE_BANDS.map((b) => <span key={b.band} className={b.band === e.band ? "on" : undefined} style={{ flexGrow: b.to - b.from + 1 }}>{b.from}–{b.to}</span>)}
            <i style={{ left: `${e.total}%` }} />
          </div>
          <p className="pe-warning"><b>This is our educational profile estimate. It is not your Experian, Equifax or TransUnion score,</b> and not a prediction of lender approval. The bands are ours, not an agency’s.</p>
          <details className="why">
            <summary>Why did I get {e.total}?</summary>
            <div className="est-table" style={{ marginTop: 10 }}>
              {e.components.map((c) => (
                <details key={c.key} className="est-row">
                  <summary><span>{c.key === "stability" ? "Other report indicators" : c.label}</span><span className="est-bar" aria-hidden="true"><i style={{ width: `${(c.points / c.max) * 100}%` }} /></span><b>{c.points} / {c.max}</b></summary>
                  <ul className="small">{c.why.map((w) => <li key={w}>{w}</li>)}</ul>
                  <table className="why-table small"><tbody>
                    {c.steps.map((s, i) => <tr key={s.text}><td>{s.text}</td><td className="num">{i > 0 && s.points > 0 ? "+" : ""}{s.points}</td></tr>)}
                    <tr className="why-total"><td>= {c.label}</td><td className="num">{c.points} / {COMPONENT_MAX[c.key]}</td></tr>
                  </tbody></table>
                </details>
              ))}
              <div className="est-total"><span>Total</span><b>{e.total} / 100</b></div>
            </div>
            <p className="small muted">Our weights (35, 25, 15, 10, 10, 5) are an educational model, not any agency’s. Your salary, rent, bonus and living costs aren’t part of this number.</p>
          </details>
        </section>
      )}

      {notEntered.length > 0 && (
        <div className="row" style={{ gap: 10 }}>
          {notEntered.map((c) => <button key={c} type="button" className="btn btn-light btn-sm" onClick={() => onEnter(c)}>Enter my {CRA_LABEL[c]} score</button>)}
        </div>
      )}
    </div>
  );
}
