"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { paymentConsequence, snapshot } from "@/lib/consequence";
import { creditEstablished } from "@/lib/credit";
import { questionsToAsk } from "@/lib/dna";
import { PRODUCTS, type Values } from "@/lib/finance";
import { money, pct } from "@/lib/format";
import type { Mark } from "@/lib/highlight";
import { isCalculable, LENDER_QUESTIONS, offerFromExtraction } from "@/lib/offer";
import { schedule } from "@/lib/sim";
import { carStore, draftStore } from "@/lib/store";
import { SourceBadge } from "./CarParts";
import { Consequence } from "./Consequence";
import { CostScanner } from "./CostScanner";
import { DocumentPanel } from "./DocumentPanel";
import { Icon } from "./Icon";
import { PasteFill, type FillResult } from "./PasteFill";
import { Questions } from "./Questions";

const CAR_OFFER = `DEMO / FICTIONAL - NOT A REAL FINANCIAL PRODUCT
HIRE PURCHASE AGREEMENT - Provider X Motor Finance (fictional)
DRIVE AWAY TODAY FROM £493 A MONTH!
Cash price: £25,000.00. Deposit: £5,000.00. Amount of credit: £20,000.00.
Duration: 48 months. Representative APR 8.9% (fixed).
48 monthly payments of £493.50. An arrangement fee of £199 is payable with your first payment.
Total amount payable: £23,887.00 plus your deposit. Total charge for credit: £3,887.00.
Late payment fee: £20 for each missed payment.
The vehicle remains the property of Provider X until all payments have been made.
Important: Guaranteed Asset Protection (GAP) insurance at £12.50 per month is added to your agreement unless you decline it before signing.
You may settle early. A settlement charge of up to 58 days' interest may apply.`;

/**
 * Read the small print: contract → AI extracts the terms with the exact words → our code calculates → consequences
 * for the person's own situation, using the same engine as Plan. Not an isolated AI summary.
 */
export function SmallPrint() {
  const router = useRouter();
  const st = carStore.use();
  const [r, setR] = useState<FillResult | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const show = (k: string) => { setActive(null); requestAnimationFrame(() => setActive(k)); };
  const snap = snapshot(st.picture);
  const hasSituation = snap.income > 0;

  const offer = r && isCalculable(r) ? offerFromExtraction(r, { amount: 0, apr: 0, term: 12 }) : null;
  const sch = offer ? schedule(offer.scenario) : null;
  const pay = sch && hasSituation ? paymentConsequence(snap, sch.regular, st.preferredBuffer) : null;
  const marks: Mark[] = r ? [
    ...Object.entries(r.evidence).map(([id, e]) => ({ key: `f-${id}`, quote: e.quote })),
    ...r.conditions.map((c, i) => ({ key: `cond-${i}`, quote: c.quote })),
  ].filter((x) => x.quote) : [];
  const questions = r ? questionsToAsk(r.type, r.values, { missing: r.missing, conditionKinds: r.conditions.map((c) => c.kind), fromDocument: true, statedTotal: !!r.stated.total }) : [];

  const useInPlan = () => {
    if (!offer) return;
    carStore.set({ ...st, offer, use: "offer" });
    // Straight to the consequences if the situation and credit context are already there; otherwise Plan starts at the beginning.
    router.push(hasSituation && creditEstablished(st.credit) ? "/plan?step=14" : "/plan");
  };
  const openInChecker = () => {
    if (!r) return;
    draftStore.set({ type: r.type, values: r.values as Values, example: false });
    router.push(`/cost-checker?type=${r.type}`);
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <PasteFill idPrefix="sp" title="Paste or upload the terms" samples={[{ label: "Example: fictional car finance offer", text: CAR_OFFER }]} onFill={setR} />

      {r && (
        <section className="stack" style={{ gap: 18 }} aria-labelledby="sp-result">
          <h2 id="sp-result" className="h1">What the document says, and what it means</h2>

          <div className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}><span className="caption">The terms</span><SourceBadge source="document_says" /></div>
            <p className="small">This looks like a <b>{PRODUCTS[r.type].label.toLowerCase()}</b>. Each value below came from the document; “Show me where” in the document view highlights the exact words.</p>
            <dl className="mlabel-rows">
              {r.filled.map((k) => <div key={k}><dt>{PRODUCTS[r.type].fields.find((f) => f.id === k)?.label ?? k}</dt><dd>{String(r.values[k])}</dd></div>)}
            </dl>
            {r.missing.length > 0 && <p className="missing-banner small"><b>Not in the document:</b> {r.missing.join(", ")}. Ask the provider; we won’t guess.</p>}
          </div>

          {offer && sch && (
            <div className="card stack">
              <div className="row" style={{ justifyContent: "space-between" }}><span className="caption">Our calculation</span><SourceBadge source="we_calculated" /></div>
              <dl className="mlabel-rows">
                <div><dt>Amount · APR · term</dt><dd>{money(offer.scenario.amount)} · {pct(offer.scenario.apr)} · {offer.scenario.term} months</dd></div>
                <div><dt>Each month</dt><dd>{money(sch.regular, true)}</dd></div>
                <div><dt>Total repayment</dt><dd>{money(sch.total)}</dd></div>
                <div className="strong"><dt>Borrowing cost</dt><dd>{money(sch.cost)}</dd></div>
              </dl>
              {r.stated.monthly !== undefined && <p className="small">The document states {money(r.stated.monthly, true)} a month; we calculate {money(sch.regular, true)}{Math.abs(r.stated.monthly - sch.regular) < 1 ? ", which matches" : ". Ask the provider why they differ (fees or optional extras are common reasons)"}.</p>}
            </div>
          )}

          {pay && sch && (
            <Consequence label="What this agreement changes for you" result={`${money(pay.before)} → ${money(pay.after)}`} sub="estimated monthly remaining, using the situation you told us about"
              means={pay.sentences}
              explore={[{ label: "See it in my full Plan", onClick: useInPlan }]} />
          )}
          {offer && !hasSituation && (
            <div className="notice stack">
              <p><b>{money(sch!.regular, true)} a month means something different for everyone.</b> Tell us a little about your situation and we’ll show what this agreement changes for you.</p>
              <button type="button" className="btn btn-dark btn-sm" style={{ justifySelf: "start" }} onClick={useInPlan}>Use these terms in Plan <Icon name="arrow" size={16} /></button>
            </div>
          )}
          {!offer && (
            <div className="notice stack">
              <p>This document doesn’t give an amount, APR and term we can calculate a loan repayment from. The cost checker can work it out for a {PRODUCTS[r.type].label.toLowerCase()}.</p>
              <button type="button" className="btn btn-dark btn-sm" style={{ justifySelf: "start" }} onClick={openInChecker}>Open it in the cost checker <Icon name="arrow" size={16} /></button>
            </div>
          )}

          {(r.conditions.length > 0 || r.source) && (
            <div className="grid-2 doc-row">
              <CostScanner conditions={r.conditions} onShow={show} />
              <DocumentPanel source={r.source} marks={marks} active={active} redactions={r.redactions} />
            </div>
          )}
          <Questions questions={questions.length ? questions : LENDER_QUESTIONS} />
        </section>
      )}

      {!r && (
        <details className="why">
          <summary>What happens to my document?</summary>
          <p className="small">Pasted text has common personal details removed in your browser first. The text or file is then sent to Google Gemini to read, and our code does all the calculations. <Link href="/about#privacy" className="link">Privacy &amp; your data</Link></p>
        </details>
      )}
    </div>
  );
}
