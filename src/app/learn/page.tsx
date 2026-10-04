import type { Metadata } from "next";
import Link from "next/link";
import { CONCEPTS } from "@/lib/concepts";
import { CRA_LABEL, CRA_ORDER, CURRENT_SCALE, SCALES } from "@/lib/credit";
import { GLOSSARY, PRODUCT_TYPES, PRODUCTS } from "@/lib/finance";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <div className="container section" style={{ paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">Learn</span>
        <h1 className="display">The words lenders use, in plain English</h1>
        <p className="lead muted">Short guides to the terms that decide what you really pay.</p>
      </div>

      <div className="prose">
        <h2 id="apr" className="h2 anchor-target">What APR really means</h2>
        <p>
          APR, the Annual Percentage Rate, is the yearly cost of borrowing. It includes interest and most compulsory fees, so it is the fairest way to compare like with like.
        </p>
        <p>
          Adverts often show a <b>representative APR</b>. Only at least half of approved customers need to get that rate. Others can be offered more, depending on their credit history. The rate you are offered is the one that matters.
        </p>
        <p>APR doesn’t tell you the total you will pay. A lower APR over a longer term can still cost more overall. That’s why we show the total and the cost of borrowing next to every rate.</p>

        <h2 id="minimum" className="h2 anchor-target">Why minimum payments keep you in debt</h2>
        <p>
          A credit card minimum payment is often about 1% of the balance plus that month’s interest. As the balance falls, so does the minimum, so the debt shrinks more and more slowly.
        </p>
        <p>
          The FCA calls it <b>persistent debt</b> when, over 18 months, you pay more in interest and fees than you pay off the balance. Your card provider must contact you if this happens, and offer help to pay it off faster if it continues.
        </p>
        <p><Link href="/cost-checker?type=card">Try it in the cost checker</Link>: switch a card to “Only the minimum payment” and watch the time to clear it.</p>

        <h2 id="bnpl" className="h2 anchor-target">Buy Now Pay Later, explained</h2>
        <p>
          BNPL splits a purchase into instalments, often three payments over a few weeks or months. Pay-in-3 plans are usually interest-free if every payment is on time. Longer “pay monthly” plans often charge interest.
        </p>
        <ul>
          <li>Missed payments can mean late fees, and may be reported to credit reference agencies.</li>
          <li>Several small plans at once can add up to a big share of your month.</li>
          <li>Returning an item doesn’t always pause payments straight away. Check how refunds work.</li>
          <li>Check whether the provider is authorised by the FCA, and what protections apply.</li>
        </ul>

        <h2 id="overdraft" className="h2 anchor-target">Overdrafts</h2>
        <p>
          Since 2020, UK banks charge overdrafts as a single yearly interest rate, with no fixed daily fees. Many charge around 35–40%, which is more than most loans and many credit cards. Overdrafts suit short, unexpected gaps, not borrowing for months.
        </p>

        <h2 id="bills" className="h2 anchor-target">Subscriptions and household contracts</h2>
        <p>
          Introductory prices rise automatically unless you cancel. Phone and broadband contracts often include yearly price rises. Since January 2025, Ofcom rules mean these must be shown in pounds and pence. Leaving a contract early can cost close to the remaining payments.
        </p>

        <h2 id="credit" className="h2 anchor-target">Credit scores in the UK</h2>
        <p>Three credit reference agencies each publish their own score, on their own scale:</p>
        <ul>
          {CRA_ORDER.map((c) => {
            const s = SCALES[CURRENT_SCALE[c]];
            const older = Object.values(SCALES).filter((o) => o.cra === c && o.id !== s.id);
            return <li key={c}><b>{CRA_LABEL[c]}</b>: {s.min}–{s.max}{older.map((o) => ` (older scale ${o.min}–${o.max})`).join("")}{s.note ? `. ${s.note}` : ""}</li>;
          })}
        </ul>
        <p>
          <b>There isn’t one universal UK credit score.</b> Each agency uses its own information and method, so the same person can see different numbers. Lenders also use their own criteria, so no score tells you what a lender will decide.
        </p>
        <details className="why" style={{ marginTop: 12 }}>
          <summary>What shapes a credit profile?</summary>
          <ul>
            <li><b>Payment history</b>: whether bills and repayments are paid on time.</li>
            <li><b>Credit utilisation</b>: how much of your available credit you’re using.</li>
            <li><b>Recent applications</b>: how often you’ve applied for credit lately.</li>
            <li><b>Length of credit history</b>: how long you’ve had credit accounts.</li>
            <li><b>Existing borrowing</b>: the loans, cards and other credit you already have.</li>
            <li><b>Report indicators</b>: things like defaults, County Court Judgments or being on the electoral roll.</li>
          </ul>
        </details>
        <p>
          Before You Sign never calculates or predicts an official score, and never predicts lender approval. In <Link href="/plan">Plan</Link>, you can enter the scores you know or build our clearly labelled educational estimate, and see it next to your whole financial situation.
        </p>

        <h2 id="misconceptions" className="h2 anchor-target">Common misconceptions</h2>
        <p>Ideas that are easy to get wrong. These are common misunderstandings, written by us. They aren’t statistics about real customers.</p>
      </div>

      <div className="grid-3" style={{ marginTop: 24 }}>
        {CONCEPTS.map((c) => (
          <div key={c.id} className="list stack">
            <span className="caption">{c.title}</span>
            <p style={{ fontWeight: 600 }}>{c.misconception}</p>
            <p className="small muted">{c.explain}</p>
          </div>
        ))}
      </div>

      <div className="prose">
        <h2 id="jargon" className="h2 anchor-target">Jargon buster</h2>
      </div>

      <div className="grid-3" style={{ marginTop: 24 }}>
        {PRODUCT_TYPES.map((t) => (
          <div key={t} className="list">
            <p className="h3" style={{ marginBottom: 12 }}>{PRODUCTS[t].label}</p>
            <dl className="gloss" style={{ margin: 0, padding: 0, border: 0 }}>
              {GLOSSARY[t].map(([term, def]) => <div key={term}><dt>{term}</dt><dd>{def}</dd></div>)}
            </dl>
          </div>
        ))}
      </div>

      <div className="prose">
        <h2 id="help" className="h2 anchor-target">Free, impartial help</h2>
        <p>You don’t need to be in debt to ask for help. These services are free and independent:</p>
        <ul>
          <li><b>MoneyHelper</b>, backed by the UK government: moneyhelper.org.uk, 0800 138 7777.</li>
          <li><b>StepChange</b> debt charity: stepchange.org, 0800 138 1111.</li>
          <li><b>Citizens Advice</b>: citizensadvice.org.uk.</li>
        </ul>
      </div>
    </div>
  );
}
