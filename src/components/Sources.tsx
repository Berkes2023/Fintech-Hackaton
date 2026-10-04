import { OTHER_SOURCES, STATS } from "@/lib/stats";

// Sources & methodology (shown on /about#sources): how our examples are worked out, then every statistic we cite,
// in its source's own words, behind one collapsible. Server component: nothing here changes in the browser.

const METHOD = [
  "Statistics are quoted with their source’s own definitions, population, geography and year. We haven’t recalculated them.",
  "Examples are fictional and calculated by our tested code. Car finance figures use equal monthly payments, with the APR turned into a monthly rate and no fees. They are not offers.",
  "Credit scores on the home page are samples placed on each agency’s published scale. We never calculate or predict an official score.",
  "We don’t predict lender approval, give regulated advice or rank products.",
];

export function Sources() {
  return (
    <div className="stack" style={{ gap: 20 }}>
      <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, maxWidth: 760 }}>
        {METHOD.map((m) => <li key={m}>{m}</li>)}
      </ul>
      <details className="how-calc">
        <summary>See every statistic and its source</summary>
        <div className="stack" style={{ gap: 20, marginTop: 16 }}>
          <ul className="source-list">
            {Object.values(STATS).map((s) => (
              <li key={s.id}>
                <b>{s.headline}{s.share ? ` (${s.share})` : ""}</b>
                <span>“{s.sourceWording}”</span>
                <span className="small muted">{s.population} · {s.geography} · {s.year}</span>
                <a className="link small" href={s.url} target="_blank" rel="noreferrer">{s.source}</a>
              </li>
            ))}
          </ul>
          <div className="stack" style={{ gap: 8 }}>
            <h3 className="h3">Other official sources</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              {OTHER_SOURCES.map((o) => <li key={o.url}><a className="link" href={o.url} target="_blank" rel="noreferrer">{o.name}</a></li>)}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
