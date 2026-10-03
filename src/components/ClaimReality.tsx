import { dur, money } from "@/lib/format";
import { crossCheck, type Metrics } from "@/lib/finance";

interface Props {
  claim: string;
  m: Metrics;
  credit: boolean;
  missing: string[];
  stated: { monthly?: number; total?: number; monthlyQuote?: string; totalQuote?: string };
  onShow: (key: string) => void;
}

/** The advert's headline next to what it actually adds up to, plus a check of the provider's own figures. */
export function ClaimReality({ claim, m, credit, missing, stated, onShow }: Props) {
  const checks = crossCheck(m, stated);
  if (!claim && checks.length === 0) return null;
  const perDay = m.regular / 30.44;

  return (
    <section className="card stack" aria-labelledby="claim-title">
      <h2 id="claim-title" className="h3">What you see vs what you sign up to</h2>
      {claim && (
        <div className="claim-grid">
          <div className="claim-see">
            <span className="caption">What the advert says</span>
            <p className="claim-quote">“{claim}”</p>
            <button type="button" className="link small" onClick={() => onShow("claim")}>Show me where</button>
          </div>
          <div className="claim-real">
            <span className="caption">What it adds up to</span>
            {missing.length ? (
              <>
                <p className="claim-big">Can’t tell yet</p>
                <p className="small">The advert doesn’t say the {missing.join(", ").toLowerCase()}, so the total can’t be worked out. Ask before you commit.</p>
              </>
            ) : (
              <>
                <p className="claim-big">{m.never ? "Never cleared" : money(m.total)}</p>
                <p className="small">
                  over {m.never ? "more than 30 years" : dur(m.end)} · about {money(perDay, true)} a day
                  {credit && !m.never && m.onTop > 0.5 ? ` · ${money(m.onTop)} more than the price` : ""}
                </p>
              </>
            )}
          </div>
        </div>
      )}
      {checks.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="caption">Does the document’s maths add up?</span>
          <ul className="checks">
            {checks.map((c) => (
              <li key={c.label}>
                <span className={`mark ${c.matches ? "ok" : "warn"}`} aria-hidden="true">{c.matches ? "✓" : "!"}</span>
                <span>
                  <b>{c.label}:</b> the document says {money(c.stated, true)}, our calculation gives {money(c.ours, true)}.{" "}
                  {c.matches ? "These match." : "These don’t match. Ask the provider how it’s worked out: there may be fees or terms not shown."}
                </span>
                <button type="button" className="link small" onClick={() => onShow(c.label === "Monthly payment" ? "stated-monthly" : "stated-total")}>Show me where</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
