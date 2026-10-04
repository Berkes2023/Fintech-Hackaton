import { money } from "@/lib/format";
import type { MoneyLabel } from "@/lib/finance";

const SHADES = ["#1f1f1f", "#717173", "#c9c9cd"];

/** The “nutrition label” for money: the same facts, in the same order, for every product. */
export function MoneyLabelCard({ label, product, estimate }: { label: MoneyLabel; product: string; estimate?: string[] }) {
  const total = label.parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <section className="mlabel" aria-labelledby="mlabel-title">
      <div className="mlabel-head">
        <h2 id="mlabel-title" className="mlabel-title">Money Label</h2>
        <span className="small">{product}</span>
      </div>
      {estimate && estimate.length > 0 && (
        <p className="mlabel-estimate">Estimate: standard values used for {estimate.join(", ")}.</p>
      )}
      <dl className="mlabel-rows">
        {label.rows.map((r) => (
          <div key={r.label} className={r.strong ? "strong" : undefined}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
      {label.parts.length > 1 && (
        <div className="mlabel-split">
          <span className="caption">Where every pound goes</span>
          <div className="mlabel-bar" role="img" aria-label={label.parts.map((p) => `${p.label} ${money(p.value)}`).join(", ")}>
            {label.parts.map((p, i) => <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: SHADES[i] }} />)}
          </div>
          <div className="legend">
            {label.parts.map((p, i) => (
              <span key={p.label}><i style={{ borderTop: `10px solid ${SHADES[i]}` }} />{p.label} {money(p.value)} ({Math.round((p.value / total) * 100)}%)</span>
            ))}
          </div>
        </div>
      )}
      {label.notes.length > 0 && (
        <ul className="mlabel-notes">
          {label.notes.map((n) => (
            <li key={n.text}><span aria-hidden="true" className={`mark ${n.kind}`}>{n.kind === "warn" ? "!" : "✓"}</span><span className="sr-only">{n.kind === "warn" ? "Warning: " : "Note: "}</span>{n.text}</li>
          ))}
        </ul>
      )}
      <p className="mlabel-foot">Calculated from the figures entered. Not advice: the decision is yours.</p>
    </section>
  );
}
