import { futurePayments } from "@/lib/dna";
import { money } from "@/lib/format";
import type { Metrics } from "@/lib/finance";

/** "That payment follows you": dates the commitment through moments people remember. */
export function FuturePayments({ m, start, perLabel }: { m: Metrics; start: string; perLabel: string }) {
  const f = futurePayments(m, start);
  if (f.count < 3) return null;
  return (
    <section className="card stack" aria-labelledby="ghost-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="ghost-title" className="h3">That {money(m.regular, true)} follows you…</h2>
        <span className="small muted">If you started this month</span>
      </div>
      <ol className="ghost">
        <li><span className="ghost-date">{f.first}</span><span>First payment</span><b>{money(m.s.find((p) => p.pay > 0.005)?.pay ?? m.regular, true)}</b></li>
        {f.milestones.map((x) => (
          <li key={x.date}><span className="ghost-date">{x.date}</span><span>{x.label}: still paying {money(m.regular, true)} {perLabel}</span><b>{x.remaining} to go</b></li>
        ))}
        <li className="ghost-end"><span className="ghost-date">{m.never ? "—" : f.last}</span><span>{m.never ? "Still paying after 30 years" : "Last payment"}</span><b>{f.count} payments in all</b></li>
      </ol>
    </section>
  );
}
