"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { SourceBadge } from "./CarParts";

export interface Change { label: string; before: string; after: string }
export interface Explore { label: string; onClick: () => void }

/**
 * The product's core pattern. Every important number answers: what is it, what does it mean, what does it change
 * for this person, and what could they change? The sentences come from the consequence engine (lib/consequence.ts).
 */
export function Consequence({ label, result, sub, means = [], changes = [], explore = [], children }: {
  label: string; result: ReactNode; sub?: string; means?: string[]; changes?: Change[]; explore?: Explore[]; children?: ReactNode;
}) {
  return (
    <section className="conseq" aria-label={`${label}: what this means for you`}>
      <div className="conseq-result">
        <span className="caption">{label} <SourceBadge source="we_calculated" /></span>
        <b>{result}</b>
        {sub && <span className="small">{sub}</span>}
      </div>
      <div className="conseq-body">
        {means.length > 0 && (
          <div className="conseq-part">
            <span className="caption">What this means</span>
            <ul>{means.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
        {changes.length > 0 && (
          <div className="conseq-part">
            <span className="caption">What this changes for you</span>
            <dl className="conseq-changes">
              {changes.map((c) => <div key={c.label}><dt>{c.label}</dt><dd><span className="was">{c.before}</span><Icon name="arrow" size={16} /><b>{c.after}</b></dd></div>)}
            </dl>
          </div>
        )}
        {children}
        {explore.length > 0 && (
          <div className="conseq-part">
            <span className="caption">What could you change?</span>
            <div className="chips">{explore.map((e) => <button key={e.label} type="button" className="chip" onClick={e.onClick}>{e.label}</button>)}</div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Before → after cards, with the big deltas underneath. */
export function BeforeAfter({ before, after, deltas }: { before: [string, string][]; after: [string, string][]; deltas: string[] }) {
  return (
    <div className="ba-wrap">
      <div className="ba-cards">
        <div className="ba-card"><span className="caption">Before</span><dl>{before.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>
        <div className="ba-arrow" aria-hidden="true"><Icon name="arrow" size={28} /></div>
        <div className="ba-card dark"><span className="caption">After</span><dl>{after.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>
      </div>
      <div className="ba-deltas">{deltas.map((d) => <p key={d}>{d}</p>)}</div>
    </div>
  );
}
