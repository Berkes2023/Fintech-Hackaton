"use client";

import Link from "next/link";
import { useState } from "react";

// Every statement here was checked against the code on 4 October 2026:
// - figures are kept in the browser's localStorage under "bys:*" keys (src/lib/store.ts), with no cookies or analytics;
// - only the AI features call our server (/api/extract, /api/explain), which passes the request to Google Gemini and doesn't log or store it;
// - pasted text is redacted in the browser first (src/lib/privacy.ts); uploaded files are sent as they are.

const ITEMS = [
  { q: "What you enter", a: "Figures about your income, spending, borrowing, savings and plans, a credit score if you know one, and any offer you paste or upload. Rough numbers are fine. We never ask for your name, bank login or account numbers." },
  { q: "What happens to it", a: "The calculations run in your browser. Your figures are saved in your browser’s local storage on this device so a refresh doesn’t lose them. They aren’t sent to our server for the maths." },
  { q: "AI processing", a: "Only when you use an AI feature (reading small print, or asking a question in the cost checker) is the relevant text sent through our server to Google Gemini. We use Gemini’s free tier, whose terms allow Google to use that content to improve its products, so please don’t include anything personal." },
  { q: "What we store", a: "We don’t have a database and our code doesn’t log what you enter or send to AI. Your figures live only in this browser until you clear them. Our hosting provider, Vercel, may keep standard technical request logs under its own terms." },
  { q: "Your documents", a: "Pasted text is checked in your browser first and common personal details (emails, phone numbers, card, account and NI numbers, sort codes, postcodes, titled names, labelled addresses, dates of birth) are replaced before sending. Uploaded PDFs and photos are sent as they are, so please use documents without personal details." },
  { q: "Your control", a: "You can clear everything this site has saved on this device with the button below, or by clearing your browser’s site data." },
];

/** Short and collapsible: the facts, without a wall of text. */
export function PrivacySummary() {
  const [cleared, setCleared] = useState<string | null>(null);
  const clear = () => {
    if (!window.confirm("Clear everything Before You Sign has saved on this device? Your answers, comparisons and commitments will be removed.")) return;
    try {
      const keys = Object.keys(window.localStorage).filter((k) => k.startsWith("bys:"));
      keys.forEach((k) => window.localStorage.removeItem(k));
      setCleared(`Cleared ${keys.length} saved item${keys.length === 1 ? "" : "s"} from this device. Refresh any open pages to start fresh.`);
    } catch {
      setCleared("Your browser didn’t allow us to clear storage. You can clear this site’s data in your browser settings.");
    }
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
        <button type="button" className="link small" onClick={clear}>Clear everything saved on this device</button>
        <Link href="/privacy" className="link small">Read the full privacy policy</Link>
      </div>
      {cleared && <p className="small" role="status">{cleared}</p>}
    </div>
  );
}
