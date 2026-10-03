import type { Metadata } from "next";
import { buildLabel, parseLabelRequest } from "@/lib/api";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Developer API" };

const REQUEST = { type: "loan", values: { amount: 5000, apr: 12.9, term: 36, fee: 0 } };

export default function DevelopersPage() {
  const parsed = parseLabelRequest(REQUEST);
  const sample = parsed.ok ? buildLabel(parsed.req, parsed.defaulted) : null;
  const shown = sample && { product: sample.product, summary: sample.summary, label: { rows: sample.label.rows.slice(0, 4), "…": "" }, risks: sample.risks.slice(0, 1), disclaimer: sample.disclaimer };

  return (
    <div className="container section" style={{ paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">Developer API · Vision</span>
        <h1 className="display">A transparency layer for financial products</h1>
        <p className="lead muted">
          Different products, one language. Any comparison site, bank, university or charity can send a product’s terms and get the same Money Label back.
        </p>
      </div>

      <div className="prose">
        <h2 className="h2">Try it</h2>
        <p>It’s live now. No key, no personal data, and no AI: the same tested maths as this site.</p>
      </div>
      <pre className="code"><code>{`curl -X POST https://before-you-sign-cyan.vercel.app/api/v1/label \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(REQUEST)}'`}</code></pre>

      <div className="prose"><h2 className="h2">Response (shortened)</h2></div>
      <pre className="code"><code>{JSON.stringify(shown, null, 2)}</code></pre>

      <div className="prose">
        <h2 className="h2">Reference</h2>
        <ul>
          <li><b>POST /api/v1/label</b> with <code>{"{ type, values }"}</code>. <code>type</code> is one of loan, card, overdraft, bnpl, subscription or household.</li>
          <li><b>values</b> uses the same field names as the cost checker, for example <code>amount</code>, <code>apr</code>, <code>term</code>, <code>fee</code>. Anything left out takes a standard value and is listed in <code>defaulted</code>.</li>
          <li>The response has a <code>summary</code>, the Money Label <code>rows</code>, ranked <code>risks</code> and <code>plain_english</code> sentences.</li>
          <li>Open to any website (CORS enabled). Figures are estimates, not advice.</li>
        </ul>

        <h2 className="h2">Next: right where people decide</h2>
        <p>A browser extension could add a “Before you sign” button beside any finance offer while you shop, at exactly the moment of decision.</p>
      </div>

      <div className="ext-mock" aria-label="Mock-up of a browser extension">
        <div className="ext-page">
          <p className="caption">shop.example · checkout</p>
          <p className="h3">Laptop Pro 14”</p>
          <p className="lead">Only <b>£83/month</b> with Easy Pay</p>
        </div>
        <div className="ext-pop">
          <span className="caption">Before You Sign</span>
          <p className="h3">£83 a month sounds like {money(83 / 30.44, true)} a day</p>
          <p className="small">If it runs for 36 months: <b>{money(83 * 36)}</b>, before interest and fees.</p>
          <p className="small muted">The advert doesn’t say the APR or fees. Ask before you commit.</p>
        </div>
      </div>
    </div>
  );
}
