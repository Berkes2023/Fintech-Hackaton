"use client";

import { useEffect, useRef, useState } from "react";
import { gbp } from "@/lib/consequence";
import { KIND_LABEL, pictureNarrative, type Insight, type SuggestionAction } from "@/lib/insight";
import { position, type Picture } from "@/lib/sim";
import { SourceBadge, WhyBreakdown } from "./CarParts";
import { Icon } from "./Icon";
import { useReducedMotion } from "./StoryKit";

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

/** The person's month forming as they tell us about it. */
export function LivePicture({ picture }: { picture: Picture }) {
  const lines = pictureNarrative(picture);
  const pos = position(picture);
  return (
    <aside className="card stack position-card live" aria-label="Your situation so far" aria-live="polite">
      <span className="row" style={{ justifyContent: "space-between" }}><span className="caption">Your picture so far</span><SourceBadge source="you_told_us" /></span>
      <b className="h1 live-num"><Tween value={pos.value} /></b>
      <p className="small muted">estimated left each month after the regular costs you’ve entered</p>
      {lines.length > 0
        ? <ol className="live-lines">{lines.map((l) => <li key={l}>{l}</li>)}</ol>
        : <p className="small">Tell us what comes in, and we’ll start building your picture.</p>}
      <WhyBreakdown title="Regular income minus regular costs, from what you’ve told us." result={pos} />
    </aside>
  );
}

function Card({ i, onAction, prominent }: { i: Insight; onAction?: (a: SuggestionAction) => void; prominent?: boolean }) {
  return (
    <div className={`insight-card${prominent ? " prominent" : ""}`}>
      <span className="row" style={{ gap: 8 }}><span className="insight-kind">{KIND_LABEL[i.kind]}</span><SourceBadge source="we_calculated" /></span>
      <b className="insight-title">{i.title}</b>
      <p className="insight-body">{i.body}</p>
      {i.chain && <p className="insight-chain">{i.chain.map((c, k) => <span key={c}>{k > 0 && <Icon name="arrow" size={14} />}{c}</span>)}</p>}
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
      <Card i={top} onAction={onAction} prominent />
      {more.length > 0 && (
        <details className="insight-more">
          <summary>{more.length === 1 ? "1 more thing worth knowing" : `${more.length} more things worth knowing`}</summary>
          <div className="stack" style={{ gap: 10, marginTop: 10 }}>{more.map((i) => <Card key={i.id} i={i} onAction={onAction} />)}</div>
        </details>
      )}
      <p className="small muted">Based on what you’ve entered, assuming everything else stays the same. We notice and explain; you decide.</p>
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
