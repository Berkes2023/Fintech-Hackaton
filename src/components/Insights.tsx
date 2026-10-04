"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gbp, snapshot, type Snapshot } from "@/lib/consequence";
import { KIND_LABEL, pictureNarrative, type Insight, type SuggestionAction } from "@/lib/insight";
import { position, type Picture } from "@/lib/sim";
import { SourceBadge, WhyBreakdown } from "./CarParts";
import { Icon } from "./Icon";
import { useReducedMotion, useSettled } from "./StoryKit";

/** A number that glides from its old value to its new one, so the person sees their picture change. */
export function Tween({ value, ms = 600 }: { value: number; ms?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced) return;
    const start = performance.now(), a = from.current, b = value;
    let t = 0;
    const tick = () => {
      const k = Math.min(1, (performance.now() - start) / ms);
      setShown(a + (b - a) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) t = window.setTimeout(tick, 16);
      else from.current = b;
    };
    t = window.setTimeout(tick, 0);
    return () => { window.clearTimeout(t); from.current = b; };
  }, [value, ms, reduced]);
  return <>{gbp(Math.round(reduced ? value : shown))}</>;
}

interface LedgerRow { label: string; sign: "+" | "−"; amount: number }

/** The lines behind the live figure, in the order the questions are asked. Rows the person hasn't filled in are left out. */
function ledger(s: Snapshot): LedgerRow[] {
  const rows: LedgerRow[] = [
    { label: "Income", sign: "+", amount: s.income },
    { label: "Essential costs", sign: "−", amount: s.essentials },
    { label: "Other regular spending", sign: "−", amount: s.otherSpending },
    { label: "Debt repayments", sign: "−", amount: s.debt },
    { label: "Saving and pension", sign: "−", amount: s.commitments },
  ];
  return rows.filter((r) => r.amount !== 0);
}

/** The person's month forming as they tell us about it: a live ledger, then the latest line of the story. */
export function LivePicture({ picture }: { picture: Picture }) {
  const s = snapshot(picture);
  const rows = ledger(s);
  const lines = pictureNarrative(picture);
  const latest = lines[lines.length - 1];
  // Announced once the figure has stopped changing, not on every keystroke.
  const said = useSettled(rows.length > 0 ? `Estimated monthly remaining: ${gbp(s.remaining)}` : "");
  return (
    <aside className="card stack position-card live" aria-label="Your situation so far">
      <span className="row" style={{ justifyContent: "space-between" }}><span className="caption">Your picture so far</span><SourceBadge source="you_told_us" /></span>
      {rows.length > 0 ? (
        <>
          <dl className="mlabel-rows">
            {rows.map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.sign}{gbp(r.amount)}</dd></div>)}
            <div className="strong" style={{ alignItems: "baseline" }}>
              <dt>= Estimated monthly remaining</dt>
              {/* The gliding figure is hidden from screen readers; the live region below announces it once typing pauses. */}
              <dd><b className="h2 live-num" aria-hidden="true"><Tween value={s.remaining} /></b></dd>
            </div>
          </dl>
          {latest && <p className="small" style={{ margin: 0 }}>{latest}</p>}
        </>
      ) : <p className="small">Tell us what comes in, and we’ll start building your picture.</p>}
      <span className="sr-only" aria-live="polite">{said}</span>
      <WhyBreakdown title="Regular income minus regular costs, from what you’ve told us." result={position(picture)} />
    </aside>
  );
}

/** Figures shown as a → b → c. */
function Chain({ items }: { items: string[] }) {
  return <p className="insight-chain">{items.map((c, k) => <span key={`${k}-${c}`}>{k > 0 && <Icon name="arrow" size={14} />}{c}</span>)}</p>;
}

function Card({ i, onAction, prominent }: { i: Insight; onAction?: (a: SuggestionAction) => void; prominent?: boolean }) {
  const [open, setOpen] = useState(false);
  const whatIfId = useId();
  return (
    <div className={`insight-card${prominent ? " prominent" : ""}`}>
      <span className="row" style={{ gap: 8 }}><span className="insight-kind">{KIND_LABEL[i.kind]}</span><SourceBadge source="we_calculated" /></span>
      <b className="insight-title">{i.title}</b>
      <p className="insight-body">{i.body}</p>
      {i.chain && <Chain items={i.chain} />}
      {i.whatIf && (
        <>
          {/* An in-place what-if: it only reveals more figures, nothing in the journey changes. */}
          <button type="button" className="btn btn-light btn-sm" aria-expanded={open} aria-controls={open ? whatIfId : undefined} onClick={() => setOpen(!open)}>
            {i.whatIf.label} <span aria-hidden="true" style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : undefined }}><Icon name="chevron" size={16} /></span>
          </button>
          {open && (
            <div id={whatIfId} className="stack" style={{ gap: 6 }}>
              <b>{i.whatIf.title}</b>
              {i.whatIf.chain && <Chain items={i.whatIf.chain} />}
            </div>
          )}
        </>
      )}
      {i.action && onAction && <button type="button" className="btn btn-light btn-sm" onClick={() => onAction(i.action!.does)}>{i.action.label} <Icon name="arrow" size={16} /></button>}
    </div>
  );
}

/** The most relevant insight up front, then at most two more, folded away. Never fifteen cards at once. */
export function InsightPanel({ items, onAction }: { items: Insight[]; onAction?: (a: SuggestionAction) => void }) {
  if (!items.length) return null;
  const [top, ...rest] = items;
  const more = rest.slice(0, 2);
  return (
    <section className="insights" aria-label="Insights from what you’ve told us">
      <Card key={top.id} i={top} onAction={onAction} prominent />
      {more.length > 0 && (
        <details className="insight-more">
          <summary>{more.length === 1 ? "1 more thing worth knowing" : `${more.length} more things worth knowing`}</summary>
          <div className="stack" style={{ gap: 10, marginTop: 10 }}>{more.map((i) => <Card key={i.id} i={i} onAction={onAction} />)}</div>
        </details>
      )}
      <details className="why">
        <summary>Why am I seeing this?</summary>
        <p className="small muted" style={{ margin: "8px 0 0" }}>Based on what you’ve entered, assuming everything else stays the same.</p>
      </details>
    </section>
  );
}

/** On small screens the full picture sits below the questions, so this keeps the live figure in view. */
export function LiveMini({ picture }: { picture: Picture }) {
  const lines = pictureNarrative(picture);
  if (!lines.length) return null;
  return (
    <div className="live-mini" aria-hidden="true">
      <span className="caption">Your picture so far</span>
      <b><Tween value={position(picture).value} /></b>
      <span className="small">{lines[lines.length - 1]}</span>
    </div>
  );
}
