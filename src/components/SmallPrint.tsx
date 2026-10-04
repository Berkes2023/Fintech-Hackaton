"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { paymentConsequence, paymentFigures, snapshot } from "@/lib/consequence";
import { creditEstablished } from "@/lib/credit";
import { questionsToAsk } from "@/lib/dna";
import { fieldLabel, monthlyEquivalent, PRODUCTS, simulate } from "@/lib/finance";
import { dur, money, pct } from "@/lib/format";
import { documentValues, isCalculable, mergeQuestions, offerFromExtraction, termValue } from "@/lib/offer";
import { schedule } from "@/lib/sim";
import { carStore, draftStore } from "@/lib/store";
import { SourceBadge } from "./CarParts";
import { ClaimReality } from "./ClaimReality";
import { Consequence } from "./Consequence";
import { CostScanner } from "./CostScanner";
import { DocumentPanel } from "./DocumentPanel";
import { Icon } from "./Icon";
import { CONFIDENCE, documentMarks, PasteFill, type FillResult } from "./PasteFill";
import { PresentationCheck } from "./PresentationCheck";
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
 * Read the small print: 1 contract → 2 AI extracts the terms with the exact words → 3 our code calculates → 4 what it
 * changes for the person's own situation, using the same consequence engine as Plan. Not an isolated AI summary.
 */
export function SmallPrint() {
  const router = useRouter();
  const st = carStore.use();
  const [r, setR] = useState<FillResult | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const show = (k: string) => { setActive(null); requestAnimationFrame(() => setActive(k)); };
  const snap = snapshot(st.picture);
  const hasSituation = snap.income > 0;

  // 3. Our calculation. Unstated fees and deals count as nothing; nothing is invented for what the document doesn't say.
  const doc = r ? documentValues(r.type, r.values, r.filled) : null;
  const m = r && doc ? simulate(r.type, doc.values) : null;
  const offer = r && isCalculable(r) ? offerFromExtraction(r, { amount: 0, apr: 0, term: 12 }) : null;
  const sch = offer ? schedule(offer.scenario) : null;
  const calculable = !!sch || (!!r && r.missing.length === 0);
  const monthly = sch ? sch.regular : r && doc && m && calculable ? monthlyEquivalent(r.type, doc.values, m) : 0;
  // 4. What it changes: the same consequence engine as Plan, with the situation the person already told us about.
  const pay = calculable && hasSituation && monthly > 0 ? paymentConsequence(snap, monthly, st.preferredBuffer) : null;

  const useInPlan = () => {
    if (!offer) return;
    carStore.set({ ...st, offer, use: "offer" });
    // Straight to the consequences if the situation and credit context are already there; otherwise Plan starts at the beginning.
    router.push(hasSituation && creditEstablished(st.credit) ? "/plan?step=14" : "/plan");
  };
  const openInChecker = () => {
    if (!r || !doc) return;
    draftStore.set({ type: r.type, values: doc.values, example: false });
    router.push(`/cost-checker?type=${r.type}`);
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <PasteFill idPrefix="sp" title="1 · The contract: paste or upload the terms" samples={[{ label: "Example: fictional car finance offer", text: CAR_OFFER }]}
        onFill={(x) => { setActive(null); setR(x); }} manualHref="/cost-checker" />

      {r && doc && m && (() => {
        const product = PRODUCTS[r.type];
        const missingLabels = r.missing.map((id) => fieldLabel(r.type, id));
        const canShow = r.source.trim().length > 0;
        const kinds = r.conditions.map((c) => c.kind);
        const fromDoc = questionsToAsk(r.type, doc.values, { missing: r.missing, conditionKinds: kinds, fromDocument: true, statedTotal: !!r.stated.total });
        // Credit agreements keep every standard lender question; bills and subscriptions keep their own.
        const questions = product.credit ? mergeQuestions(fromDoc) : fromDoc;
        const perLabel = r.type === "bnpl" && r.values.interval === "fortnight" ? "every two weeks" : "a month";
        const assumptions = [
          ...(doc.assumed.length ? [`Standard values for choices a document can’t state: ${doc.assumed.map((id) => `${fieldLabel(r.type, id)}: ${termValue(r.type, id, doc.values)}`).join("; ")}.`] : []),
          ...(doc.notIncluded.length ? [`Not in the document, so not included: ${doc.notIncluded.map((id) => fieldLabel(r.type, id)).join(", ")}.`] : []),
          "Every payment is made on time, and nothing changes during the agreement.",
        ];

        return (
          <section className="stack" style={{ gap: 18 }} aria-labelledby="sp-result">
            <h2 id="sp-result" className="h1">What the document says, and what it means</h2>

            <div className={canShow ? "grid-2 doc-row" : "stack"}>
              <div className="stack">
                <div className="card stack">
                  <div className="row" style={{ justifyContent: "space-between" }}><span className="caption">2 · Extract terms</span><SourceBadge source="document_says" /></div>
                  <p className="small">This looks like {/^[aeiou]/i.test(product.label) ? "an" : "a"} <b>{product.label.toLowerCase()}</b>. Each value is quoted from the document, with how sure the AI was that it’s stated.</p>
                  {r.filled.length > 0 ? (
                    <div className="stack" style={{ gap: 12 }}>
                      {r.filled.map((k) => {
                        const ev = r.evidence[k];
                        return (
                          <div key={k} className="stack" style={{ gap: 6 }}>
                            <dl className="mlabel-rows"><div><dt>{fieldLabel(r.type, k)}</dt><dd>{termValue(r.type, k, r.values)}</dd></div></dl>
                            {ev?.quote && (
                              <div className="quote">
                                <div className="row" style={{ justifyContent: "space-between" }}>
                                  <span className={`conf ${ev.confidence}`}>{CONFIDENCE[ev.confidence] ?? CONFIDENCE.medium}</span>
                                  {canShow && <button type="button" className="link small" onClick={() => show(`f-${k}`)}>Show me where</button>}
                                </div>
                                “{ev.quote}”
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="small muted">We didn’t find any figures we could use.</p>}
                  {r.missing.length > 0 && <p className="missing-banner small"><b>Not in the document:</b> {missingLabels.join(", ")}. Ask the provider; we won’t guess.</p>}
                </div>
                <CostScanner conditions={r.conditions} onShow={show} />
              </div>
              <DocumentPanel source={r.source} marks={documentMarks(r)} active={active} redactions={r.redactions} fromFile={r.fromFile} />
            </div>
            <PresentationCheck contradictions={r.contradictions} prominence={r.prominence} onShow={show} />

            <div className="card stack">
              <div className="row" style={{ justifyContent: "space-between" }}><span className="caption">3 · We calculate</span><SourceBadge source="we_calculated" /></div>
              {offer && sch ? (
                <dl className="mlabel-rows">
                  <div><dt>Amount · APR · term</dt><dd>{money(offer.scenario.amount)} · {pct(offer.scenario.apr)} · {offer.scenario.term} months</dd></div>
                  <div><dt>Each month</dt><dd>{money(sch.regular, true)}</dd></div>
                  {offer.scenario.upfrontFee > 0 && <div><dt>Arrangement fee</dt><dd>{money(offer.scenario.upfrontFee)}</dd></div>}
                  <div><dt>Total repayment</dt><dd>{money(sch.total)}</dd></div>
                  <div className="strong"><dt>Borrowing cost</dt><dd>{money(sch.cost)}</dd></div>
                </dl>
              ) : calculable ? (
                <dl className="mlabel-rows">
                  <div><dt>{r.type === "bnpl" ? "Each payment" : "Each month"}</dt><dd>{money(m.regular, true)}{perLabel === "a month" ? "" : ` ${perLabel}`}</dd></div>
                  <div><dt>How long</dt><dd>{m.never ? "Not cleared in the time shown" : dur(m.end)}</dd></div>
                  <div><dt>Total you pay</dt><dd>{m.never ? "—" : money(m.total)}</dd></div>
                  <div className="strong"><dt>{product.credit ? "Borrowing cost" : "Above the advertised price"}</dt><dd>{m.never ? "—" : money(Math.max(0, m.onTop))}</dd></div>
                </dl>
              ) : (
                <p className="small">We can’t work out the full cost from this document alone. It’s missing: {missingLabels.join(", ")}.</p>
              )}
              {calculable && (
                <details className="why">
                  <summary>What assumptions are we using?</summary>
                  <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>{assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
                </details>
              )}
              {!offer && (
                <button type="button" className="btn btn-light btn-sm" style={{ justifySelf: "start" }} onClick={openInChecker}>Explore it in the cost checker <Icon name="arrow" size={16} /></button>
              )}
            </div>
            {/* The document's own figures are only checked against ours when we could calculate from what it states. */}
            <ClaimReality claim={r.claim} m={m} credit={product.credit} missing={missingLabels} stated={calculable ? r.stated : {}} onShow={show} />

            {pay && (
              <Consequence label="4 · What it changes for you" result={`${money(pay.before)} → ${money(pay.after)}`} sub="estimated monthly remaining, using the situation you told us about"
                means={pay.sentences}
                explore={offer ? [{ label: "See it in my full Plan", onClick: useInPlan }] : []}>
                <details className="why">
                  <summary>Show calculation</summary>
                  <dl className="mlabel-rows">{paymentFigures(pay).map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
                </details>
              </Consequence>
            )}
            {calculable && monthly > 0 && !hasSituation && (
              <div className="notice stack">
                <span className="caption">4 · What it changes for you</span>
                <p><b>{money(monthly, true)} a month means something different for everyone.</b> Tell us a little about your situation and we’ll show what this {offer ? "agreement" : product.label.toLowerCase()} changes for you.</p>
                {offer
                  ? <button type="button" className="btn btn-dark btn-sm" style={{ justifySelf: "start" }} onClick={useInPlan}>Use these terms in Plan <Icon name="arrow" size={16} /></button>
                  : <Link href="/plan" className="btn btn-light btn-sm" style={{ justifySelf: "start" }}>Start with your situation <Icon name="arrow" size={16} /></Link>}
              </div>
            )}

            <Questions questions={questions} />
          </section>
        );
      })()}
    </div>
  );
}
