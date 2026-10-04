import type { Metadata } from "next";
import Link from "next/link";
import { AgreementPanel } from "@/components/Acknowledge";
import { AGREEMENT_UPDATED, PRIVACY_STATEMENT, USER_TERMS } from "@/lib/agreement";

export const metadata: Metadata = { title: "User agreement" };

// The user terms and privacy statement in one place, with the acknowledgement. The full documents stay at /terms and /privacy.
export default function AgreementPage() {
  return (
    <div className="container section prose legal-page" style={{ paddingTop: 56 }}>
      <span className="caption">User agreement · last updated {AGREEMENT_UPDATED}</span>
      <h1 className="display">User terms &amp; privacy statement</h1>
      <p className="lead muted">The short version of our terms and privacy policy, in one place. Please read it, then acknowledge it below.</p>

      <section id="terms" className="anchor-target">
        <h2 className="h2">User terms</h2>
        <ul>{USER_TERMS.map((t) => <li key={t}>{t}</li>)}</ul>
        <p><Link href="/terms" className="link">Read the full terms &amp; conditions</Link></p>
      </section>

      <section id="privacy" className="anchor-target">
        <h2 className="h2">Privacy statement</h2>
        <ul>{PRIVACY_STATEMENT.map((t) => <li key={t}>{t}</li>)}</ul>
        <p><Link href="/privacy" className="link">Read the full privacy policy</Link> · <Link href="/about#privacy" className="link">Privacy &amp; your data</Link></p>
      </section>

      <section id="acknowledge" className="anchor-target">
        <h2 className="h2">Your acknowledgement</h2>
        <AgreementPanel />
        <p className="small muted">Acknowledging confirms you understand what this prototype is and how it handles your information. It isn’t an agreement for any financial product, and it doesn’t give Before You Sign any rights over what you enter.</p>
      </section>

      <p className="small muted">Worried about money? Free, impartial help is available from <a className="link" href="https://www.moneyhelper.org.uk/" target="_blank" rel="noreferrer">MoneyHelper</a> and <a className="link" href="https://www.stepchange.org/" target="_blank" rel="noreferrer">StepChange</a>.</p>
    </div>
  );
}
