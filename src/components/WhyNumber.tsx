import { money } from "@/lib/format";
import { levers, type Metrics, type ProductType, type Values } from "@/lib/finance";

/** Breaks the total into its parts, then shows which changes would move it, and by how much. */
export function WhyNumber({ type, v, m }: { type: ProductType; v: Values; m: Metrics }) {
  const ls = levers(type, v);
  if (!ls.length) return null;
  return (
    <section className="card stack" aria-labelledby="why-title">
      <h2 id="why-title" className="h3">Why is it {money(m.total)}?</h2>
      <div className="why-sum">
        <span><b>{money(m.principal)}</b> borrowed</span>
        <span aria-hidden="true">+</span>
        <span><b>{money(m.interest)}</b> interest</span>
        {m.fees > 0.5 && <><span aria-hidden="true">+</span><span><b>{money(m.fees)}</b> fees</span></>}
        <span aria-hidden="true">=</span>
        <span><b>{money(m.total)}</b></span>
      </div>
      <span className="caption">What would change it</span>
      <ul className="levers">
        {ls.map((l) => (
          <li key={l.label}>
            <span>{l.label}</span>
            <b>{l.never ? "Never cleared" : money(l.total)}</b>
            <span className={`delta ${l.delta < 0 ? "down" : "up"}`}>{Math.abs(l.delta) < 0.5 ? "no change" : `${l.delta < 0 ? "▼" : "▲"} ${money(Math.abs(l.delta))}`}</span>
          </li>
        ))}
      </ul>
      <p className="small muted">For understanding only: each line changes one thing and keeps everything else the same.</p>
    </section>
  );
}
