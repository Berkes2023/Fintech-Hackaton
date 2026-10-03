"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reverse } from "@/lib/dna";
import { dur, money } from "@/lib/format";
import { draftStore } from "@/lib/store";

const OFFER = { monthly: 89, months: 36, deposit: 149, apr: 19.9, lateFee: 12 };

/**
 * Future-vision demo of the "Commitment Firewall": an optional companion card beside a checkout.
 * It never blocks or intercepts. The person can dismiss it and carry on at any time.
 */
export function FirewallDemo() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [more, setMore] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const payments = OFFER.monthly * OFFER.months;
  const commitment = payments + OFFER.deposit;
  const credit = reverse(OFFER.monthly, OFFER.apr, [OFFER.months])[0];
  const borrowingCost = payments - credit.principal;

  const understand = () => {
    draftStore.set({ type: "loan", values: { amount: Math.round(credit.principal), apr: OFFER.apr, term: OFFER.months, fee: 0, lateFee: OFFER.lateFee }, example: false });
    router.push("/cost-checker?type=loan");
  };

  return (
    <div className="firewall">
      <div className="shop">
        <p className="caption">Demo shop · not a real store · nothing can be bought here</p>
        <div className="shop-item">
          <div className="shop-img" aria-hidden="true">Laptop</div>
          <div className="stack" style={{ gap: 10 }}>
            <p className="h3">Laptop Pro 14”</p>
            <p className="display" style={{ fontSize: 44 }}>£89<span className="lead" style={{ display: "inline" }}>/month</span></p>
            <p className="small muted">36 monthly payments. £149 deposit. Representative 19.9% APR (variable). Late payment fee £12.</p>
            <button type="button" className="btn btn-dark" onClick={() => setOrdered(true)}>Confirm purchase: £89/month</button>
            {ordered && <p className="small" role="status">Demo order placed. The companion never stopped you: it only offered the facts.</p>}
            {!open && <button type="button" className="link small" onClick={() => setOpen(true)}>Show the Before You Sign card again</button>}
          </div>
        </div>

        {open && (
          <aside className="companion" aria-label="Before You Sign companion (optional)">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="caption">Before you sign…</span>
              <button type="button" className="link small" onClick={() => setOpen(false)} aria-label="Dismiss the Before You Sign card">Dismiss</button>
            </div>
            <p className="h3">£89 a month is the headline.</p>
            <dl className="mlabel-rows">
              <div><dt>Commitment</dt><dd>{dur(OFFER.months)}</dd></div>
              <div><dt>Total payments, with deposit</dt><dd>{money(commitment)}</dd></div>
              <div><dt>Borrowing cost, worked out from the APR</dt><dd>about {money(borrowingCost)}</dd></div>
            </dl>
            {more && (
              <ul className="mlabel-notes">
                <li><span aria-hidden="true" className="mark warn">!</span>Variable APR: your payments could change</li>
                <li><span aria-hidden="true" className="mark warn">!</span>£12 charge for each late payment</li>
              </ul>
            )}
            <div className="row">
              <button type="button" className="btn btn-dark btn-sm" onClick={understand}>Understand this commitment</button>
              <button type="button" className="link small" onClick={() => setMore(!more)}>{more ? "Fewer details" : "Important conditions"}</button>
            </div>
            <p className="small muted">Optional. You can dismiss this and carry on whenever you like.</p>
          </aside>
        )}
      </div>
    </div>
  );
}
