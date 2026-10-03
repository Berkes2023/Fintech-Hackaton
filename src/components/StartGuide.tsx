"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FEEL, MIND, suggest, WHEN, type Answers, type Feel, type Mind, type When } from "@/lib/guide";
import { GOALS, type Goal } from "@/lib/journey";
import { journeyStore } from "@/lib/store";
import { Icon } from "./Icon";
import { startGoal } from "./Journey";

type Q = "mind" | "buy" | "feel" | "when" | "done";

/** For people who don't know where to start: a few gentle questions, then places in the app to begin. */
export function StartGuide() {
  const [a, setA] = useState<Answers>({});
  const [q, setQ] = useState<Q>("mind");
  const router = useRouter();
  const order: Q[] = a.mind === "buy" ? ["mind", "buy", "feel", "when", "done"] : ["mind", "feel", "done"];
  const idx = order.indexOf(q);
  const answer = (patch: Answers, next: Q) => { setA((x) => ({ ...x, ...patch })); setQ(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const back = () => setQ(order[Math.max(0, idx - 1)]);
  const openGoal = (g: Goal) => { journeyStore.set(startGoal(journeyStore.get(), g)); router.push("/plan?step=1"); };

  const Choice = ({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) => (
    <button type="button" className={`choice${on ? " on" : ""}`} onClick={onClick}><b style={{ fontSize: 20 }}>{label}</b></button>
  );

  return (
    <div className="journey">
      <p className="small muted">Question {Math.min(idx + 1, order.length - 1)} of {order.length - 1}</p>

      {q === "mind" && (
        <section className="stack journey-card">
          <h2 className="h1">What’s on your mind?</h2>
          <p className="muted">There’s no wrong answer. This just helps us show you a good place to start.</p>
          <div className="choice-grid">
            {(Object.keys(MIND) as Mind[]).map((m) => <Choice key={m} label={MIND[m]} on={a.mind === m} onClick={() => answer({ mind: m }, m === "buy" ? "buy" : "feel")} />)}
          </div>
        </section>
      )}

      {q === "buy" && (
        <section className="stack journey-card">
          <h2 className="h1">What are you thinking of?</h2>
          <div className="choice-grid">
            {(Object.keys(GOALS) as Goal[]).filter((g) => g !== "invest").map((g) => (
              <button key={g} type="button" className={`choice${a.buy === g ? " on" : ""}`} onClick={() => answer({ buy: g }, "feel")}>
                <span className="icon"><Icon name={GOALS[g].icon} size={24} /></span><b>{GOALS[g].label}</b>
              </button>
            ))}
          </div>
          <div className="wizard-nav"><button type="button" className="btn btn-light" onClick={back}>Back</button><span /></div>
        </section>
      )}

      {q === "feel" && (
        <section className="stack journey-card">
          <h2 className="h1">How does your money feel right now?</h2>
          <p className="muted">Honest answers help. Nothing is saved or shared.</p>
          <div className="choice-grid">
            {(Object.keys(FEEL) as Feel[]).map((f) => <Choice key={f} label={FEEL[f]} on={a.feel === f} onClick={() => answer({ feel: f }, a.mind === "buy" ? "when" : "done")} />)}
          </div>
          <div className="wizard-nav"><button type="button" className="btn btn-light" onClick={back}>Back</button><span /></div>
        </section>
      )}

      {q === "when" && (
        <section className="stack journey-card">
          <h2 className="h1">When might you need it?</h2>
          <div className="choice-grid">
            {(Object.keys(WHEN) as When[]).map((w) => <Choice key={w} label={WHEN[w]} on={a.when === w} onClick={() => answer({ when: w }, "done")} />)}
          </div>
          <div className="wizard-nav"><button type="button" className="btn btn-light" onClick={back}>Back</button><span /></div>
        </section>
      )}

      {q === "done" && (
        <section className="stack journey-card">
          <span className="caption">Here’s where we’d start</span>
          <h2 className="h1">A few good places to begin</h2>
          <p className="muted">These are places in Before You Sign that fit what you told us. They’re not financial products or advice, and you can go anywhere from here.</p>
          <div className="done-grid">
            {suggest(a).map((x) => {
              const inner = (<><b>{x.title}</b><span className="small muted">{x.why}</span></>);
              if (x.help) return <div key={x.id} className="done-card help-card">{inner}</div>;
              if (x.goal) return <button key={x.id} type="button" className="done-card" onClick={() => openGoal(x.goal!)}>{inner}</button>;
              return <Link key={x.id} href={x.href!} className="done-card">{inner}</Link>;
            })}
          </div>
          <div className="wizard-nav">
            <button type="button" className="btn btn-light" onClick={back}>Back</button>
            <button type="button" className="link small" onClick={() => { setA({}); setQ("mind"); }}>Start again</button>
          </div>
        </section>
      )}
    </div>
  );
}
