import { SourceBadge } from "./CarParts";
import type { Contradiction, Prominence, ProminenceMap } from "./PasteFill";

const LEVEL: Record<Prominence, { label: string; width: number }> = {
  headline: { label: "Headline", width: 100 },
  body: { label: "In the main text", width: 66 },
  small_print: { label: "Small print", width: 33 },
  absent: { label: "Not shown", width: 0 },
};
const FACTS: [keyof ProminenceMap, string][] = [
  ["monthly_payment", "Monthly payment"],
  ["total_payable", "Total you pay"],
  ["length", "How long"],
  ["interest_rate", "Interest rate"],
  ["fees", "Fees"],
];

/** Headline vs full terms, and how prominently each key fact is shown. Neutral: what's easy to see vs what's in the detail. */
export function PresentationCheck({ contradictions, prominence, onShow }: { contradictions: Contradiction[]; prominence: ProminenceMap | null; onShow: (key: string) => void }) {
  if (!contradictions.length && !prominence) return null;
  return (
    <section className="card stack" aria-labelledby="pres-title">
      <h2 id="pres-title" className="h3">Headline vs the full terms</h2>
      {contradictions.map((c, i) => (
        <div key={i} className="contra">
          <div><span className="caption">The headline suggests <SourceBadge source="document_says" /></span><p className="claim-quote">“{c.headline_quote}”</p><p className="small">{c.headline} <SourceBadge source="ai_explained" /></p><button type="button" className="link small" onClick={() => onShow(`hl-${i}`)}>Show me where</button></div>
          <div><span className="caption">The full terms say <SourceBadge source="document_says" /></span><p className="claim-quote">“{c.terms_quote}”</p><p className="small">{c.full_terms} <SourceBadge source="ai_explained" /></p><button type="button" className="link small" onClick={() => onShow(`tm-${i}`)}>Show me where</button></div>
        </div>
      ))}
      {prominence && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="caption">How easy each fact is to spot <SourceBadge source="ai_explained" /></span>
          <ul className="prominence">
            {FACTS.map(([k, label]) => {
              const lv = LEVEL[prominence[k]] ?? LEVEL.absent;
              return (
                <li key={k}>
                  <span>{label}</span>
                  <span className="stress-bar" aria-hidden="true"><span className="pos" style={{ width: `${lv.width}%` }} /></span>
                  <b>{lv.label}</b>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="small muted">This isn’t an accusation. It shows what’s easy to see and what’s only in the detail, so nothing important passes you by.</p>
    </section>
  );
}
