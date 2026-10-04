"use client";

import Link from "next/link";
import { useState } from "react";
import { clearSaved } from "@/lib/store";

// Every statement here was checked against the code on 4 October 2026:
// - figures (including the cost checker's, in "bys:draft"), answers, comparisons, commitments, remembered decisions and the short document quotes behind each term
//   used in Plan are kept in this browser's localStorage under "bys:*" keys (src/lib/store.ts); no cookies or analytics;
// - only the AI features call our server (/api/extract, /api/explain), which passes the request to Google Gemini and
//   doesn't log or store it;
// - pasted text, questions and the page figures sent with them are redacted in the browser first (src/lib/privacy.ts);
//   uploaded files are sent as they are.

const ITEMS = [
  { q: "What you enter", a: "Figures about your income, spending, borrowing, savings and plans; a credit score if you know one, or your answers to our credit questions; and any offer you paste or upload. Rough numbers are fine. We never ask for your name, bank login or account numbers." },
  { q: "What happens to it", a: "The calculations run in your browser. Your answers are saved in this browser so a refresh doesn’t lose them. They aren’t sent to our server for the maths." },
  { q: "AI processing", a: "Something leaves this browser only when you use an AI feature. Reading small print sends the text or file; asking a question in the cost checker sends your question and the figures on that page. It goes through our server to Google Gemini. We use Gemini’s free tier, whose terms allow Google to keep and use that content to improve its products, and people at Google may review it. Please don’t include anything personal." },
  { q: "What we store", a: "Nothing on a server: we have no database, and our code doesn’t log what you enter or send to AI. This browser’s local storage keeps your Plan answers (including credit answers), the figures in the cost checker (including any read from a document), comparisons, commitments, decisions you choose to remember and the short document quotes behind each term you use in Plan, until you clear them. Our host, Vercel, may keep standard request logs." },
  { q: "Your documents", a: "We don’t save the full text or file: it stays in the open page until you leave or refresh. Pasted text has common personal details (emails, phone numbers, card, account and NI numbers, sort codes, postcodes, titled names, labelled addresses, dates of birth) replaced in your browser before it’s sent. Uploaded PDFs and photos are sent as they are, so please use copies without personal details." },
  { q: "Your control", a: "The button below clears everything this site has saved on this device. “Clear my answers and start again” in Plan clears only your Plan answers. You can also clear this site’s data in your browser settings." },
];

/** Short and collapsible: the facts, without a wall of text. */
export function PrivacySummary() {
  const [cleared, setCleared] = useState<string | null>(null);
  const clear = () => {
    if (!window.confirm("Clear everything Before You Sign has saved on this device? Your answers, comparisons, commitments and remembered decisions will be removed.")) return;
    const n = clearSaved();
    setCleared(n > 0 ? `Cleared ${n} saved item${n === 1 ? "" : "s"} from this device.` : "There was nothing saved on this device to clear.");
  };
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="accordion">
        {ITEMS.map((i) => (
          <details key={i.q}>
            <summary>{i.q}</summary>
            <p className="small">{i.a}</p>
          </details>
        ))}
      </div>
      <div className="row" style={{ gap: 14 }}>
        <Link href="/privacy" className="link small">Read the full privacy policy</Link>
        <button type="button" className="link small quiet" onClick={clear}>Clear everything saved on this device</button>
      </div>
      {cleared && <p className="small" role="status">{cleared}</p>}
    </div>
  );
}
