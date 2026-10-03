import type { Condition } from "./PasteFill";

const KIND: Record<string, string> = {
  variable_rate: "Rate can change",
  late_fee: "Fee",
  promo_ends: "Offer ends",
  auto_renewal: "Renews itself",
  early_repayment_charge: "Charge to leave",
  price_rise: "Price rise",
  exit_fee: "Charge to leave",
  credit_check: "Credit file",
  other: "Condition",
};

/** Every condition the AI found in the small print, each one linked back to its sentence. */
export function CostScanner({ conditions, onShow }: { conditions: Condition[]; onShow: (key: string) => void }) {
  if (!conditions.length) return null;
  return (
    <section className="card stack" aria-labelledby="scan-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="scan-title" className="h3">Hidden cost scanner</h2>
        <span className="pill-label">{conditions.length} condition{conditions.length === 1 ? "" : "s"} found</span>
      </div>
      <ul className="risks">
        {conditions.map((c, i) => (
          <li key={i} className="risk">
            <span className="sev watch">{KIND[c.kind] ?? "Condition"}</span>
            <b>{c.title}</b>
            <p>{c.plain}</p>
            <button type="button" className="link small" onClick={() => onShow(`cond-${i}`)}>Show me where</button>
          </li>
        ))}
      </ul>
      <p className="small muted">Found by AI in your document. Each one links to the exact sentence, so you can check it yourself.</p>
    </section>
  );
}
