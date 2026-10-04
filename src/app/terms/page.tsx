import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return (
    <div className="container section prose legal-page" style={{ paddingTop: 56 }}>
      <span className="caption">Terms &amp; conditions · last updated 4 October 2026</span>
      <h1 className="display">Terms &amp; conditions</h1>
      <p className="lead muted">Short and plain. By using Before You Sign you accept these terms.</p>

      <h2 className="h2">1. A prototype, for information and education</h2>
      <p>Before You Sign is a hackathon prototype built for UKFinnovator Bristol 2026. It helps you understand and explore financial decisions. It is provided as it is, may change or stop at any time, and isn’t a live financial service.</p>

      <h2 className="h2">2. What it is not</h2>
      <ul>
        <li><b>Not financial advice.</b> Nothing here is a personal recommendation. We aren’t authorised or regulated by the FCA.</li>
        <li><b>Not credit broking or lending.</b> We don’t lend, arrange credit, introduce you to lenders or sell financial products.</li>
        <li><b>Not a lender decision.</b> We don’t approve or reject applications or predict whether a lender would accept you, or at what rate.</li>
        <li><b>Not an official affordability assessment.</b> Lenders carry out their own checks.</li>
        <li><b>Not an official credit score.</b> Our 0–100 profile and any figures shown on an agency’s scale are our own educational estimates. Only Experian, Equifax and TransUnion issue their scores.</li>
      </ul>

      <h2 className="h2">3. Projections and scenarios</h2>
      <p>Timelines, what-ifs, example rates and fictional providers are illustrations based on the information and assumptions you enter. They aren’t predictions or offers. Real outcomes depend on many things we can’t know.</p>

      <h2 className="h2">4. Accuracy</h2>
      <p>Results are only as accurate as what you enter. Providers may calculate interest and charges differently, so their figures can differ from ours. Always check the actual terms, the total amount repayable and any charges with the provider before you sign.</p>

      <h2 className="h2">5. AI features</h2>
      <p>AI reads documents and explains in plain English. It can make mistakes or miss things. Every value it extracts shows the words it came from so you can check them against the original document.</p>

      <h2 className="h2">6. Your decision</h2>
      <p>You remain responsible for any financial decision you make. If you’re worried about money, free and impartial help is available from MoneyHelper (0800 138 7777) and StepChange (0800 138 1111).</p>

      <h2 className="h2">7. Using the prototype</h2>
      <p>Please don’t upload documents containing personal information, try to misuse the AI features, or overload the service. See our <Link href="/privacy" className="link">privacy policy</Link> for how information is handled.</p>

      <h2 className="h2">8. Liability</h2>
      <p>As a free educational prototype, it’s provided without warranties. To the extent the law allows, the team isn’t liable for decisions made using it. Nothing in these terms limits rights you have that can’t legally be limited.</p>
    </div>
  );
}
