"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { reverse } from "@/lib/dna";
import { money } from "@/lib/format";
import { draftStore, thisMonth } from "@/lib/store";

const OFFER = { monthly: 89, months: 36, deposit: 149, apr: 19.9, lateFee: 12 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function lastPayment(start: string, months: number) {
  const [y, m] = start.split("-").map(Number);
  const k = y * 12 + (m - 1) + months;
  return `${MONTHS[k % 12]} ${Math.floor(k / 12)}`;
}

/** A pretend checkout showing the Commitment Firewall: a pause between "confirm" and the commitment. It never blocks. */
export function FirewallDemo() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState<null | "continued">(null);
  const [last, setLast] = useState("");
  const total = OFFER.monthly * OFFER.months;
  const commitment = total + OFFER.deposit;
  const credit = reverse(OFFER.monthly, OFFER.apr, [OFFER.months])[0];
  const cashPrice = credit.principal + OFFER.deposit;

  const explainFirst = () => {
    draftStore.set({ type: "loan", values: { amount: Math.round(credit.principal), apr: OFFER.apr, term: OFFER.months, fee: 0, lateFee: OFFER.lateFee }, example: false });
    router.push("/check?type=loan");
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
            <button type="button" className="btn btn-dark" onClick={() => { setDone(null); setLast(lastPayment(thisMonth(), OFFER.months)); dialog.current?.showModal(); }}>Confirm purchase: £89/month</button>
            {done && <p className="small" role="status">Demo order placed after reading the terms. Nothing was bought.</p>}
          </div>
        </div>
      </div>

      <dialog ref={dialog} className="commit" aria-labelledby="fw-title">
        <div className="commit-head">
          <span className="caption">Before You Sign check</span>
          <button type="button" className="link small" onClick={() => dialog.current?.close()}>Close</button>
        </div>
        <div className="stack">
          <h2 id="fw-title" className="h2">You’re about to commit to</h2>
          <dl className="mlabel-rows">
            <div><dt>£89 × 36 months</dt><dd>{money(total)}</dd></div>
            <div><dt>Deposit</dt><dd>{money(OFFER.deposit)}</dd></div>
            <div className="strong"><dt>Actual commitment</dt><dd>{money(commitment)}</dd></div>
            <div><dt>Cash price, worked out from the APR</dt><dd>about {money(cashPrice)}</dd></div>
            <div><dt>Last payment</dt><dd>{last}</dd></div>
          </dl>
          <ul className="mlabel-notes">
            <li><span aria-hidden="true" className="mark warn">!</span>Variable APR: your payments could change</li>
            <li><span aria-hidden="true" className="mark warn">!</span>£12 charge for each late payment</li>
          </ul>
          <p className="small muted">Do you understand these terms? You can carry on either way. This check never decides for you.</p>
          <div className="row">
            <button type="button" className="btn btn-dark" onClick={explainFirst}>Explain it first</button>
            <button type="button" className="btn btn-light" onClick={() => { setDone("continued"); dialog.current?.close(); }}>Continue</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
