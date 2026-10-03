"use client";

import { useRef, useState } from "react";
import { dur, money } from "@/lib/format";
import { PRODUCTS, type Metrics, type ProductType, type Risk, type UnderstandingCheck } from "@/lib/finance";

interface Props {
  type: ProductType;
  m: Metrics;
  risks: Risk[];
  check: UnderstandingCheck | null;
  perLabel: string;
  onSave: () => void;
}

/** The pause before commitment: a plain summary, one question, then “the choice is yours”. */
export function CommitCheck({ type, m, risks, check, perLabel, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [answer, setAnswer] = useState<number | null>(null);
  const [understood, setUnderstood] = useState(false);
  const credit = PRODUCTS[type].credit;

  const open = () => { setStep(1); setAnswer(null); setUnderstood(false); dialog.current?.showModal(); };
  const close = () => dialog.current?.close();
  const correct = answer !== null && check?.options[answer]?.correct;
  const top = risks.filter((r) => r.lvl !== "info").slice(0, 3);

  return (
    <>
      <section className="commit-cta" aria-labelledby="commit-title">
        <div className="stack" style={{ gap: 4 }}>
          <span className="caption">Before you sign</span>
          <h2 id="commit-title" className="h3">Take 30 seconds to check you’re sure what you’re agreeing to</h2>
          <p className="small muted">A short summary of what you’d commit to, and one quick question. Nothing is signed or sent.</p>
        </div>
        <button type="button" className="btn btn-dark" onClick={open}>Start the check</button>
      </section>

      <dialog ref={dialog} className="commit" aria-labelledby="commit-dialog-title" onClose={() => setStep(1)}>
        <div className="commit-head">
          <span className="caption">Step {step} of 3</span>
          <button type="button" className="link small" onClick={close}>Close</button>
        </div>

        {step === 1 && (
          <div className="stack">
            <h2 id="commit-dialog-title" className="h2">You’d be committing to</h2>
            <div className="commit-big">
              <span><b>{money(m.regular, true)}</b> {perLabel}</span>
              <span>for <b>{m.never ? "more than 30 years" : dur(m.end)}</b></span>
            </div>
            <dl className="mlabel-rows">
              <div className="strong"><dt>Total you pay</dt><dd>{m.never ? "Never cleared" : money(m.total)}</dd></div>
              <div className="strong"><dt>{credit ? "More than you borrowed" : "More than the advertised price"}</dt><dd>{m.never ? "Keeps growing" : money(Math.max(0, m.onTop))}</dd></div>
            </dl>
            {top.length > 0 && (
              <ul className="mlabel-notes">
                {top.map((r) => <li key={r.title}><span aria-hidden="true" className="mark warn">!</span>{r.title}</li>)}
              </ul>
            )}
            <button type="button" className="btn btn-dark" onClick={() => setStep(check ? 2 : 3)}>Next</button>
          </div>
        )}

        {step === 2 && check && (
          <div className="stack">
            <h2 id="commit-dialog-title" className="h2">Quick check</h2>
            <fieldset className="quiz">
              <legend className="lead">{check.question}</legend>
              {check.options.map((o, i) => (
                <label key={o.label} className={`quiz-option${answer === i ? " picked" : ""}`}>
                  <input type="radio" name="quiz" checked={answer === i} onChange={() => setAnswer(i)} />
                  {o.label}
                </label>
              ))}
            </fieldset>
            {answer !== null && (
              <p className="list small" role="status">
                <b>{correct ? "✓ That’s right. " : "Not quite. "}</b>{check.explain}
              </p>
            )}
            <div className="row">
              <button type="button" className="btn btn-light" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn btn-dark" disabled={!correct} onClick={() => setStep(3)}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <h2 id="commit-dialog-title" className="h2">The choice is yours</h2>
            <p className="muted">
              You’ve seen the monthly cost, the total and the things to check. We don’t recommend products. Whatever you decide, it’s your decision to make.
            </p>
            <label className="quiz-option">
              <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
              I understand what this commitment means
            </label>
            {understood && <p className="small" role="status">✓ Nice one. You’ve checked the real cost before signing.</p>}
            <div className="row">
              <button type="button" className="btn btn-light" disabled={!understood} onClick={() => { onSave(); close(); }}>Save it to compare</button>
              <button type="button" className="btn btn-dark" disabled={!understood} onClick={close}>Done</button>
            </div>
            <p className="small muted">Worried about money? MoneyHelper (0800 138 7777) and StepChange (0800 138 1111) give free, impartial help.</p>
          </div>
        )}
      </dialog>
    </>
  );
}
