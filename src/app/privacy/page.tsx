import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy" };

// Written from the code as it stands (checked 4 October 2026). Update it whenever data handling changes.
export default function PrivacyPage() {
  return (
    <div className="container section prose legal-page" style={{ paddingTop: 56 }}>
      <span className="caption">Privacy policy · last updated 4 October 2026</span>
      <h1 className="display">Privacy policy</h1>
      <p className="lead muted">Before You Sign is a hackathon prototype built for UKFinnovator Bristol 2026. This explains, in plain English, what happens to information you give it.</p>

      <h2 className="h2">1. What you provide</h2>
      <p>You may enter figures about your income, spending, borrowing, savings, pension, future plans and the decision you’re considering; a credit score you already know or answers to our credit questions; and financial terms you paste or upload. We don’t ask for your name, contact details, bank logins or account numbers, and you don’t need an account.</p>

      <h2 className="h2">2. Why it’s processed</h2>
      <p>Only to show you calculations, explanations and scenarios about a financial decision you’re exploring. We don’t use it for marketing, profiling, credit decisions or anything else.</p>

      <h2 className="h2">3. Where your figures are kept</h2>
      <p>Calculations run in your browser. Your answers (including answers to the credit questions), the figures in the cost checker (including any read from a document), comparisons, commitments, decisions you choose to remember, and the short quotes behind each term of a document you use in Plan are saved in your browser’s local storage on your device (under keys beginning <code>bys:</code>) so they survive a refresh. They are not sent to our server for calculation, and we have no database. They stay until you clear them.</p>
      <p>We don’t set cookies and we don’t use analytics or advertising trackers.</p>

      <h2 className="h2">4. AI processing</h2>
      <p>Two optional features use AI: reading pasted or uploaded terms (“Read the small print”, on its own or as a step in Plan, the cost checker and Contract diff), and asking a question about the figures in the cost checker. When you use them, the text or file is sent from your browser to our server and on to Google’s Gemini API, which returns the result. For a question, we send your question and the figures on that page, after the same automatic removal of common personal details as pasted text.</p>
      <p>We use the Gemini API’s free tier. Google’s terms for that tier allow it to keep and use submitted content to improve its products, and people at Google may review it. Please don’t include personal information in anything you send to an AI feature.</p>
      <p>Our server code passes the request through and returns the answer. It doesn’t write what you send to a database or to logs.</p>

      <h2 className="h2">5. Documents</h2>
      <p>Before pasted text leaves your browser, we automatically replace common personal details: email addresses, mobile and landline numbers, card, account and National Insurance numbers, sort codes, postcodes, names after a title (such as “Mr”), labelled addresses and dates of birth. This is pattern-based and may not catch everything.</p>
      <p>Uploaded PDFs and images (up to 3 MB) are sent as they are, without redaction. Please use documents that don’t contain personal details.</p>
      <p>We don’t save the full text or file. It’s held only in the open page and is gone when you leave or refresh. In the cost checker, an excerpt of it can be included with a question you ask about it.</p>

      <h2 className="h2">6. Other services</h2>
      <ul>
        <li><b>Vercel</b> hosts the site. Like any web host, it may keep standard technical request logs (for example time, page requested and IP address) under its own policies.</li>
        <li><b>Google (Gemini API)</b> processes content sent to the AI features, as described above.</li>
        <li>The interest-rates page fetches public data from the Bank of England and the Federal Reserve Bank of St. Louis (FRED). None of your information is sent to them.</li>
      </ul>
      <p>Vercel and Google may process this information outside the UK.</p>

      <h2 className="h2">7. Security</h2>
      <p>The site is served over HTTPS. The AI key is kept on the server and never sent to your browser. Inputs to the AI features are size-limited, and the AI is told to treat your text and documents as data, not instructions. This reduces, but can’t rule out, a document misleading it, so check its quotes against your document. As a prototype, it hasn’t had an independent security audit.</p>

      <h2 className="h2">8. Your choices</h2>
      <ul>
        <li>Everything except the AI features works without sending your figures anywhere.</li>
        <li>You can clear everything saved on your device from <Link href="/about#privacy" className="link">Privacy &amp; your data</Link>, or by clearing this site’s data in your browser. “Clear my answers and start again” in Plan clears only your Plan answers.</li>
        <li>Because we don’t hold your figures on a server, there’s nothing for us to access, correct or delete on your behalf.</li>
      </ul>

      <h2 className="h2">9. Prototype status</h2>
      <p>This is a hackathon prototype, not a live service. It isn’t authorised or regulated by the FCA. A production version would need a full data-protection assessment, a paid AI tier that doesn’t use content for training, and a named data controller.</p>

      <h2 className="h2">10. Contact</h2>
      <p>Before You Sign was built by a student team for UKFinnovator Bristol 2026. Questions about this prototype can be raised with the team through the event organisers.</p>

      <p className="small muted">See also: <Link href="/terms" className="link">Terms &amp; conditions</Link> · <Link href="/about" className="link">About Before You Sign</Link></p>
    </div>
  );
}
