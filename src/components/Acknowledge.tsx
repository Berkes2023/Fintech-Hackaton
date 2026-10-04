"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ACK_KEY, AGREEMENT_VERSION, isAcknowledgement, isCurrent, type Acknowledgement } from "@/lib/agreement";

// The acknowledgement lives in this browser's localStorage only ("bys:ack"). It is re-read on every snapshot and cached
// by its raw string, so clearing everything on this device, or acting in another tab, is picked up without a reload.

let lastRaw: string | null | undefined;
let lastValue: Acknowledgement | null = null;
// If the browser blocks storage, the acknowledgement lasts for this visit only.
let inMemory: Acknowledgement | null = null;
const listeners = new Set<() => void>();

function read(): Acknowledgement | null {
  let raw: string | null;
  try { raw = localStorage.getItem(ACK_KEY); } catch { return inMemory; }
  if (raw === null && inMemory) return inMemory;
  if (raw === lastRaw) return lastValue;
  lastRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    lastValue = isAcknowledgement(parsed) ? parsed : null;
  } catch {
    lastValue = null;
  }
  return lastValue;
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === ACK_KEY) l(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

const UNKNOWN = "unknown" as const;
/** "unknown" on the server and before hydration, so nothing flashes for people who already acknowledged. */
function useAcknowledgement(): Acknowledgement | null | typeof UNKNOWN {
  return useSyncExternalStore<Acknowledgement | null | typeof UNKNOWN>(subscribe, read, () => UNKNOWN);
}

function acknowledge() {
  const ack: Acknowledgement = { version: AGREEMENT_VERSION, at: new Date().toISOString() };
  try { localStorage.setItem(ACK_KEY, JSON.stringify(ack)); inMemory = null; } catch { inMemory = ack; }
  listeners.forEach((l) => l());
}

function withdraw() {
  inMemory = null;
  try { localStorage.removeItem(ACK_KEY); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** A small, non-blocking notice shown once on this device until the person acknowledges the user agreement. */
export function AgreementBanner() {
  const ack = useAcknowledgement();
  const path = usePathname();
  if (ack === UNKNOWN || isCurrent(ack) || path === "/agreement") return null;
  return (
    <section className="ack-banner" role="region" aria-label="User agreement">
      <p><b>Before you start.</b> Before You Sign is an educational prototype, not financial advice. What you enter stays in this browser unless you use an AI feature.</p>
      <p className="small">By continuing, you agree to our <Link href="/agreement" className="link">user terms and privacy statement</Link>.</p>
      <div className="row" style={{ gap: 14 }}>
        <button type="button" className="btn btn-on-dark btn-sm" onClick={acknowledge}>I understand</button>
        <Link href="/agreement" className="link small">Read the agreement</Link>
      </div>
    </section>
  );
}

/** On the agreement page: acknowledge with an explicit tick, or see (and withdraw) an earlier acknowledgement. */
export function AgreementPanel() {
  const ack = useAcknowledgement();
  const [ticked, setTicked] = useState(false);
  if (ack === UNKNOWN) return <div className="card" aria-hidden="true" style={{ minHeight: 120 }} />;
  if (isCurrent(ack)) {
    return (
      <div className="card stack" role="status">
        <p className="lead" style={{ margin: 0 }}><b>You acknowledged this agreement on {longDate(ack!.at)}.</b></p>
        <p className="small muted">This is remembered on this device only, under “{ACK_KEY}”. It’s removed if you clear everything saved on this device.</p>
        <button type="button" className="link small quiet" style={{ justifySelf: "start" }} onClick={withdraw}>Withdraw my acknowledgement</button>
      </div>
    );
  }
  return (
    <div className="card stack">
      <label className="quiz-option" style={{ alignItems: "flex-start" }}>
        <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} />
        <span>I’ve read the user terms and privacy statement above, and I understand that Before You Sign explains but doesn’t advise, and that the decision is mine.</span>
      </label>
      <button type="button" className="btn btn-dark" style={{ justifySelf: "start" }} disabled={!ticked} onClick={acknowledge}>I acknowledge</button>
      <p className="small muted">Your acknowledgement is remembered on this device only. Nothing is sent to us.</p>
    </div>
  );
}
