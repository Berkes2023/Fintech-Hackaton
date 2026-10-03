"use client";

import { useRef, useState } from "react";
import { strugglingWith } from "@/lib/concepts";
import type { ProductType } from "@/lib/finance";
import { LearnNudge } from "./LearnNudge";

interface Turn { role: "user" | "assistant"; content: string }

const CHIPS: Record<ProductType, string[]> = {
  loan: ["Explain this loan simply", "What if I repay early?", "Why is APR different from the interest?"],
  card: ["Explain this simply", "Why do minimum payments take so long?", "What happens when the 0% ends?"],
  overdraft: ["Explain this simply", "Why is an overdraft so expensive?", "What if I go over my limit?"],
  bnpl: ["Explain this simply", "What happens if I miss a payment?", "Will this affect my credit score?"],
  subscription: ["Explain this simply", "How do I avoid the price jump?", "What are my cancellation rights?"],
  household: ["Explain this simply", "What if I need to leave early?", "What happens when the contract ends?"],
};

const ERRORS: Record<number, string> = {
  503: "The AI assistant isn’t switched on for this site yet. Everything else on the page works without it.",
  429: "The assistant is busy. Try again in a minute.",
};

export function AskPanel({ type, context, hasDocument = false }: { type: ProductType; context: () => string; hasDocument?: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  // Questions asked so far, kept even if the AI is unavailable, to spot a concept someone keeps returning to.
  const [asked, setAsked] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const nudge = strugglingWith(asked);
  const ctl = useRef<AbortController | null>(null);

  async function ask(question: string) {
    question = question.trim();
    if (!question || streaming !== null) return;
    setAsked((a) => [...a, question]);
    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setQ("");
    setError(null);
    setStreaming("");
    ctl.current = new AbortController();
    let text = "";
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: context(), messages: next.slice(-8) }),
        signal: ctl.current.signal,
      });
      if (!res.ok || !res.body) {
        setError(ERRORS[res.status] ?? "Something went wrong reaching the assistant. Try again.");
        setTurns(turns);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setStreaming(text);
      }
      setTurns([...next, { role: "assistant", content: text }]);
    } catch {
      if (text) setTurns([...next, { role: "assistant", content: text + " …" }]);
      else setTurns(turns);
    } finally {
      setStreaming(null);
      ctl.current = null;
    }
  }

  return (
    <section className="card stack" aria-labelledby="ask-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="ask-title" className="h3">Ask about this</h2>
        <span className="pill-label">AI assistant</span>
      </div>
      <p className="small muted">
        AI can explain these numbers and answer your questions. It sees only what’s on this page, and it won’t tell you whether to take the product.
      </p>
      <div className="chips">
        {(hasDocument ? ["Where does the document say the interest rate and fees?", ...CHIPS[type]] : CHIPS[type]).map((c) => <button key={c} type="button" className="chip" onClick={() => ask(c)} disabled={streaming !== null}>{c}</button>)}
      </div>
      {nudge && !dismissed.includes(nudge.id) && <LearnNudge key={nudge.id} concept={nudge} onDismiss={() => setDismissed((d) => [...d, nudge.id])} />}
      {(turns.length > 0 || streaming !== null) && (
        <div className="thread" aria-live="polite">
          {turns.map((t, i) => (
            <div key={i} className={`msg ${t.role === "user" ? "me" : "ai"}`}>
              {t.role === "assistant" && <div className="ai-tag">AI-written · check against the provider’s documents</div>}
              {t.content}
            </div>
          ))}
          {streaming !== null && <div className="msg ai">{streaming || "Thinking…"}</div>}
        </div>
      )}
      {error && <p className="small" role="alert">{error}</p>}
      <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <div className="input">
          <label htmlFor="ask-q" className="sr-only">Your question</label>
          <input id="ask-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What happens if I pay this off early?" maxLength={500} />
        </div>
        {streaming !== null
          ? <button type="button" className="btn btn-light" onClick={() => ctl.current?.abort()}>Stop</button>
          : <button type="submit" className="btn btn-dark">Ask</button>}
      </form>
    </section>
  );
}
