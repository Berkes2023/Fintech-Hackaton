import type { Metadata } from "next";

export const metadata: Metadata = { title: "Responsible AI" };

export default function ResponsibleAIPage() {
  return (
    <div className="container section" style={{ paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">Our approach</span>
        <h1 className="display">We explain. You decide.</h1>
        <p className="lead muted">
          Before You Sign makes the cost and risks of a financial commitment clear before you agree to it. It never tells you what to choose.
        </p>
      </div>

      <div className="grid-3" style={{ marginTop: 48 }}>
        <div className="list stack">
          <span className="caption">Maths, not AI</span>
          <p className="h3">Every number is calculated</p>
          <p className="small muted">Costs, totals, charts and warnings come from transparent formulas that are tested. AI never makes up a figure.</p>
        </div>
        <div className="list stack">
          <span className="caption">AI where it helps</span>
          <p className="h3">Two jobs only</p>
          <p className="small muted">Answering your questions in plain English, and reading pasted small print to fill in the form for you to check.</p>
        </div>
        <div className="list stack">
          <span className="caption">Works without it</span>
          <p className="h3">AI is optional</p>
          <p className="small muted">If AI is off or unavailable, the checker, warnings and comparisons all still work.</p>
        </div>
      </div>

      <div className="prose">
        <h2 className="h2">The rules our AI follows</h2>
        <ul>
          <li>It explains and never recommends. It won’t say whether to take a product or rank one over another.</li>
          <li>It only uses the figures on the page. If something isn’t there, it says so and suggests asking the provider.</li>
          <li>It writes in short, plain sentences, for a reading age of about 11.</li>
          <li>Every AI answer is labelled, and reminds you to check against the provider’s documents.</li>
          <li>Values read from pasted text are outlined in the form, so you can check each one.</li>
          <li>If you mention money worries, it points you to free help from MoneyHelper and StepChange.</li>
          <li>Pasted text is treated as data, never as instructions to the AI.</li>
        </ul>

        <h2 id="maths" className="h2 anchor-target">How we calculate</h2>
        <ul>
          <li><b>Loans and interest-bearing BNPL:</b> fixed monthly payments using the standard repayment (annuity) formula. The monthly rate is derived from the APR.</li>
          <li><b>Credit cards:</b> month by month. The minimum payment is the greater of £25 or 1% of the balance plus interest and fees, a common UK approach. Any 0% period and annual fee are included. We stop after 30 years.</li>
          <li><b>Overdrafts:</b> interest at the EAR on the amount above any interest-free buffer, less your monthly repayment.</li>
          <li><b>Subscriptions and contracts:</b> intro prices, yearly percentage or pound-and-pence rises, and upfront costs, compared with the advertised price.</li>
        </ul>
        <p>These are estimates. Providers calculate interest in slightly different ways, so their exact figures will differ.</p>

        <h2 id="limits" className="h2 anchor-target">What we don’t do</h2>
        <ul>
          <li>We don’t give regulated financial advice, and we are not authorised by the FCA.</li>
          <li>We don’t connect to your bank, check your credit or process payments.</li>
          <li>We don’t keep your figures. They’re saved only in your browser. Questions you ask the AI are sent to the AI provider to be answered, and aren’t stored by us.</li>
        </ul>
      </div>
    </div>
  );
}
