import type { Metadata } from "next";
import Link from "next/link";
import { PrivacySummary } from "@/components/PrivacySummary";

export const metadata: Metadata = { title: "About Before You Sign" };

// One About page, replacing the separate Responsible AI, How we calculate, What we don't do and Our promise pages.
export default function AboutPage() {
  return (
    <div className="container section stack about" style={{ paddingTop: 56, gap: 48 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">About Before You Sign</span>
        <h1 className="display">We explain. You decide.</h1>
        <p className="lead muted">Before You Sign shows what a financial decision could change for you, before you commit. It never tells you what to choose.</p>
      </div>

      <section id="how" className="anchor-target stack">
        <h2 className="h1">How it works</h2>
        <ol className="about-steps">
          <li><b>Tell us your situation</b><span>Income, spending, borrowing, savings. The picture builds as you type.</span></li>
          <li><b>Your credit context</b><span>Enter Experian, Equifax or TransUnion scores, or build our educational estimate.</span></li>
          <li><b>The decision</b><span>What you’re considering, how it could be funded and the finance terms.</span></li>
          <li><b>The consequences</b><span>What changes each month, to your savings, and over time, including what you know is coming.</span></li>
          <li><b>What if?</b><span>Wait for a bonus, change the deposit, the term or the rate, and see it recalculated.</span></li>
          <li><b>The small print</b><span>Paste or upload the real agreement; its terms run through the same maths.</span></li>
        </ol>
        <Link href="/plan" className="btn btn-dark" style={{ justifySelf: "start" }}>Plan a decision step by step</Link>
      </section>

      <section id="ai" className="anchor-target stack">
        <h2 className="h1">Calculations & responsible AI</h2>
        <p className="lead"><b>Code calculates. AI explains.</b></p>
        <div className="grid-3">
          <div className="list stack"><span className="caption">Code calculates</span><p className="small">Repayments, totals, cash flow, buffers, percentages, timelines, what-ifs and the educational credit estimate are deterministic, tested TypeScript. Same inputs, same answer.</p></div>
          <div className="list stack"><span className="caption">AI explains</span><p className="small">Google Gemini reads pasted or uploaded terms and quotes the exact words behind each value, and answers questions in plain English. It never produces the figures.</p></div>
          <div className="list stack"><span className="caption">You can see where it came from</span><p className="small">Labels show whether a number is something <b>you told us</b>, <b>we calculated</b>, the <b>document says</b>, <b>AI explained</b>, an <b>illustrative scenario</b> or an <b>official source</b>.</p></div>
        </div>
        <details className="why">
          <summary>Show the calculation methods</summary>
          <ul className="small" style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
            <li><b>Loans and car finance:</b> fixed monthly payments using the standard repayment (annuity) formula, with the monthly rate derived from the APR. Fees are added where stated.</li>
            <li><b>Credit cards:</b> month by month; the minimum is the greater of £25 or 1% of the balance plus interest and fees. 0% periods and annual fees are included.</li>
            <li><b>Overdrafts:</b> interest at the EAR on the amount above any interest-free buffer.</li>
            <li><b>Your month:</b> regular income minus regular costs, kept separate from one-off money such as a bonus, simulated month by month under the assumptions you enter.</li>
            <li><b>Credit estimate:</b> our transparent 0–100 model (payment history 35, utilisation 25, history 15, applications 10, borrowing 10, other indicators 5). Agency-scale figures are that percentage placed on each agency’s scale and always labelled as our estimate.</li>
            <li>Providers calculate interest in slightly different ways, so their exact figures can differ.</li>
          </ul>
        </details>
        <details className="why">
          <summary>The rules our AI follows</summary>
          <ul className="small" style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
            <li>It explains and never recommends, ranks or predicts approval.</li>
            <li>Every value read from a document shows the exact words it came from; if something isn’t in the document, it says so rather than guessing.</li>
            <li>If the document states its own monthly payment or total, we compare it with our calculation.</li>
            <li>Pasted text is treated as data, never as instructions.</li>
            <li>If you mention money worries, it points to free help from MoneyHelper and StepChange.</li>
            <li>If AI is off or unavailable, everything except reading documents and answering questions still works.</li>
          </ul>
        </details>
      </section>

      <section id="dont" className="anchor-target stack">
        <h2 className="h1">What we don’t do</h2>
        <ul className="dont-list">
          <li>We don’t lend money.</li>
          <li>We don’t approve or reject applications.</li>
          <li>We don’t predict lender approval or the rate a lender would offer you.</li>
          <li>We don’t provide regulated financial advice, and we aren’t authorised by the FCA.</li>
          <li>We don’t rank any product as “best”.</li>
          <li>We don’t claim our educational credit estimate is an official Experian, Equifax or TransUnion score.</li>
          <li>We don’t let AI invent financial calculations.</li>
          <li>We don’t sell or broker financial products.</li>
          <li>We don’t connect to your bank or check your credit file.</li>
        </ul>
      </section>

      <section id="privacy" className="anchor-target stack">
        <h2 className="h1">Privacy & your data</h2>
        <PrivacySummary />
      </section>

      <section id="roadmap" className="anchor-target stack">
        <h2 className="h1">Roadmap</h2>
        <p className="muted">Ideas we haven’t built yet. None of these are live features.</p>
        <div className="tool-grid">
          <div className="tool-card"><b>Open Banking</b><span className="small muted">Fill in your situation from your own accounts, with your permission.</span></div>
          <div className="tool-card"><b>Authorised credit data</b><span className="small muted">Bring in your credit report with consent, instead of typing a score.</span></div>
          <div className="tool-card"><b>Provider and broker integrations</b><span className="small muted">Real, verified quotes, never ranked and never invented.</span></div>
          <div className="tool-card"><b>Revisit a decision</b><span className="small muted">Come back after a month, update your situation and see what changed. Today this works only on your own device.</span></div>
          <Link href="/firewall" className="tool-card"><b>Commitment Firewall (concept)</b><span className="small muted">A future browser or checkout companion that could help you inspect a commitment before completing it. See the demo.</span></Link>
          <Link href="/developers" className="tool-card"><b>Developer API (prototype)</b><span className="small muted">A working, AI-free Money Label endpoint other websites could use. Not a supported service.</span></Link>
        </div>
      </section>
    </div>
  );
}
