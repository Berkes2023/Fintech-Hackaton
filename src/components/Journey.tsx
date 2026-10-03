"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { dur, money, pct } from "@/lib/format";
import {
  applyLevers, CHANGE_KINDS, creditImpact, DEFAULT_SITUATION, effectiveTier, future, GOALS, growth, LEVERS, offers, RISK,
  summarise, TIERS, type Change, type ChangeKind, type Goal, type Lever, type Offer, type Risk, type Situation, type Tier,
} from "@/lib/journey";
import { commitmentsStore, draftStore, journeyStore, MAX_SAVED, newOptionId, savedStore, thisMonth } from "@/lib/store";
import { Chart } from "./Chart";
import { Icon } from "./Icon";

const BORROW_STEPS = ["Goal", "Credit score", "The cost", "Your money", "Changes ahead", "Options", "Your future", "What if", "Before you sign", "Done"] as const;
const INVEST_STEPS = ["Goal", "Your money", "Changes ahead", "Your plan", "Your future", "Done"] as const;
type StepName = (typeof BORROW_STEPS)[number] | (typeof INVEST_STEPS)[number];

const GOAL_DEFAULTS: Record<Goal, { price: number; deposit: number }> = {
  car: { price: 20000, deposit: 5000 }, home: { price: 250000, deposit: 25000 }, improve: { price: 15000, deposit: 3000 },
  borrow: { price: 5000, deposit: 0 }, purchase: { price: 1500, deposit: 0 }, education: { price: 6000, deposit: 1000 }, invest: { price: 0, deposit: 0 },
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (start: string, m: number) => { const [y, mo] = start.split("-").map(Number); const k = y * 12 + (mo - 1) + m; return `${MONTHS[k % 12]} ${Math.floor(k / 12)}`; };

/** Picks a goal and opens its wizard. Used by the dashboard and the first step. */
export function startGoal(s: Situation, g: Goal): Situation {
  return { ...s, goal: g, ...GOAL_DEFAULTS[g] };
}

function Money({ id, label, value, onChange, help, step = 50, allowNegative = false }: { id: string; label: string; value: number; onChange: (n: number) => void; help?: string; step?: number; allowNegative?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input"><span>£</span><input id={id} type="number" min={allowNegative ? undefined : 0} step={step} inputMode="decimal" value={value || ""} placeholder="0" onChange={(e) => onChange(Number(e.target.value) || 0)} /></div>
      {help && <p className="help">{help}</p>}
    </div>
  );
}

function Nav({ back, next, label = "Next", disabled }: { back?: () => void; next?: () => void; label?: string; disabled?: boolean }) {
  return (
    <div className="wizard-nav">
      {back ? <button type="button" className="btn btn-light" onClick={back}>Back</button> : <span />}
      {next && <button type="button" className="btn btn-dark" onClick={next} disabled={disabled}>{label} <Icon name="arrow" size={18} /></button>}
    </div>
  );
}

/** The step-by-step wizard: one question at a time, then options, the person's future months, what-ifs and a final check. */
export function Journey() {
  const params = useSearchParams();
  const s = journeyStore.use();
  const set = (patch: Partial<Situation>) => journeyStore.set({ ...s, ...patch });
  const [step, setStep] = useState(() => Math.max(0, Number(params.get("step")) || 0));
  const [picked, setPicked] = useState<string | null>(null);
  const [levers, setLevers] = useState<Lever[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const saved = savedStore.use();
  const commitments = commitmentsStore.use();
  const start = thisMonth();

  const invest = s.goal === "invest";
  const steps: readonly StepName[] = invest ? INVEST_STEPS : BORROW_STEPS;
  const name = steps[Math.min(step, steps.length - 1)];
  const go = (n: number) => { setStep(Math.max(0, Math.min(n, steps.length - 1))); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const next = () => go(step + 1);
  const back = () => go(step - 1);

  const goal = GOALS[s.goal];
  const financed = Math.max(0, s.price - s.deposit);
  const os = offers(s);
  const chosen: Offer | undefined = os.find((o) => o.id === picked) ?? os[0];
  const finalPay = chosen?.balloon ? { month: chosen.months, amount: chosen.balloon } : undefined;
  const rows = chosen ? future(s, chosen.schedule, 24, finalPay) : future(s, [], 24);
  const sum = summarise(rows);
  const normalNow = s.income - s.housing - s.bills - s.commitments;

  const updateChange = (id: string, patch: Partial<Change>) => set({ changes: s.changes.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const addChange = (kind: ChangeKind) => set({ changes: [...s.changes, { id: newOptionId(), kind, label: CHANGE_KINDS[kind].label.replace(" from…", ""), amount: 0, month: 1 }] });

  const toChecker = (o: Offer) => { if (!o.checker) return; draftStore.set({ type: o.checker.type, values: o.checker.values, example: false }); router.push(`/cost-checker?type=${o.checker.type}`); };
  const toCompare = (o: Offer) => {
    if (!o.checker) return;
    if (saved.length >= MAX_SAVED) { setMsg(`Compare holds up to ${MAX_SAVED}. Remove one there first.`); return; }
    savedStore.set([...saved, { id: newOptionId(), name: `${o.provider}: ${o.product}, ${dur(o.months)}`, type: o.checker.type, values: o.checker.values }]);
    setMsg("Added to Compare.");
  };
  const toCommitments = (o: Offer) => {
    if (!o.checker) return;
    commitmentsStore.set([...commitments, { id: newOptionId(), name: `${goal.label} (${o.provider})`, type: o.checker.type, values: o.checker.values }]);
    setMsg("Added to your commitment map.");
  };

  const quiz = chosen && chosen.total > 0 && chosen.financed > 0
    ? [Math.round(chosen.financed), Math.round((chosen.financed + chosen.total) / 2), Math.round(chosen.total)].sort((a, b) => a - b)
    : null;

  return (
    <div className="journey">
      <ol className="journey-steps" aria-label="Progress">
        {steps.map((t, i) => (
          <li key={t} className={i === step ? "now" : i < step ? "done" : undefined}>
            <button type="button" onClick={() => i < step && go(i)} disabled={i > step} aria-current={i === step ? "step" : undefined}>
              <span className="journey-n">{i < step ? "✓" : i + 1}</span><span className="journey-t">{t}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="small muted">Step {step + 1} of {steps.length}</p>

      {name === "Goal" && (
        <section className="stack journey-card" aria-labelledby="q-goal">
          <h2 id="q-goal" className="h1">What are you planning?</h2>
          <p className="muted">Start with what you want to do. We’ll walk you through it step by step.</p>
          <div className="choice-grid">
            {(Object.keys(GOALS) as Goal[]).map((g) => (
              <button key={g} type="button" className={`choice${s.goal === g ? " on" : ""}`} onClick={() => { if (g === "car") { router.push("/check?step=3"); return; } journeyStore.set(startGoal(s, g)); setPicked(null); setLevers([]); go(1); }}>
                <span className="icon"><Icon name={GOALS[g].icon} size={24} /></span>
                <b>{GOALS[g].label}</b>
                <span className="small muted">{GOALS[g].blurb}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {name === "Credit score" && (
        <section className="stack journey-card" aria-labelledby="q-credit">
          <h2 id="q-credit" className="h1">How would you describe your credit score?</h2>
          <p className="muted">Lenders use it to set the rate they offer, so it changes what the same {goal.label.toLowerCase()} costs.</p>
          <div className="choice-grid">
            {(Object.keys(TIERS) as Tier[]).map((t) => (
              <button key={t} type="button" className={`choice${s.tier === t ? " on" : ""}`} onClick={() => { set({ tier: t }); next(); }}>
                <b>{TIERS[t].label}</b>
                <span className="small muted">{TIERS[t].blurb}</span>
              </button>
            ))}
          </div>
          <p className="small muted">You can check your credit report for free with the UK credit reference agencies. MoneyHelper explains how.</p>
          <Nav back={back} />
        </section>
      )}

      {name === "The cost" && (
        <section className="stack journey-card" aria-labelledby="q-cost">
          <h2 id="q-cost" className="h1">{goal.label}: the numbers</h2>
          <div className="journey-fields">
            <Money id="j-price" label={goal.price} value={s.price} onChange={(price) => set({ price })} step={s.goal === "home" ? 5000 : 100} />
            <Money id="j-deposit" label={goal.deposit} value={s.deposit} onChange={(deposit) => set({ deposit })} step={s.goal === "home" ? 1000 : 100} />
          </div>
          <div className="big-fact"><span className="caption">You may need to borrow</span><b>{money(financed)}</b></div>
          {s.goal === "education" && <p className="small muted">UK undergraduate tuition is usually covered by a government student loan, which works very differently: repayments depend on what you earn. This covers other courses and training.</p>}
          <Nav back={back} next={next} />
        </section>
      )}

      {name === "Your money" && (
        <section className="stack journey-card" aria-labelledby="q-money">
          <h2 id="q-money" className="h1">Your money in a normal month</h2>
          <p className="muted">Rough figures are fine. They stay in your browser and are never sent anywhere.</p>
          <div className="journey-fields">
            <Money id="j-income" label="Take-home pay" value={s.income} onChange={(income) => set({ income })} />
            <Money id="j-housing" label="Rent or mortgage" value={s.housing} onChange={(housing) => set({ housing })} />
            <Money id="j-bills" label="Bills and essentials" value={s.bills} onChange={(bills) => set({ bills })} help="Energy, food, travel, phone." />
            <Money id="j-comm" label="Existing loans and cards" value={s.commitments} onChange={(commitments) => set({ commitments })} />
            <Money id="j-sav" label="Savings" value={s.savings} onChange={(savings) => set({ savings })} step={100} />
            <div className="field">
              <label htmlFor="j-rate">Interest your savings earn</label>
              <div className="input"><input id="j-rate" type="number" min={0} step={0.1} inputMode="decimal" value={s.savingsRate} onChange={(e) => set({ savingsRate: Number(e.target.value) || 0 })} /><span>% a year</span></div>
            </div>
          </div>
          <div className="big-fact"><span className="caption">A normal month leaves you</span><b>{money(normalNow)}</b></div>
          <Nav back={back} next={next} />
        </section>
      )}

      {name === "Changes ahead" && (
        <section className="stack journey-card" aria-labelledby="q-changes">
          <h2 id="q-changes" className="h1">What’s coming up that your bank can’t see?</h2>
          <p className="muted">A lender looks back at your account. It doesn’t know about a bonus next month, a rent rise in January, or a loan that’s about to finish. Add anything you know is coming.</p>
          <ul className="changes">
            {s.changes.map((c) => (
              <li key={c.id}>
                <div className="field"><label htmlFor={`k-${c.id}`}>Type</label><div className="input"><select id={`k-${c.id}`} value={c.kind} onChange={(e) => updateChange(c.id, { kind: e.target.value as ChangeKind })}>{(Object.keys(CHANGE_KINDS) as ChangeKind[]).map((k) => <option key={k} value={k}>{CHANGE_KINDS[k].label}</option>)}</select></div></div>
                <div className="field"><label htmlFor={`l-${c.id}`}>What</label><div className="input"><input id={`l-${c.id}`} value={c.label} onChange={(e) => updateChange(c.id, { label: e.target.value })} style={{ fontFamily: "inherit" }} /></div></div>
                <Money id={`a-${c.id}`} label={CHANGE_KINDS[c.kind].recurring ? "Amount each month" : "Amount"} value={c.amount} onChange={(amount) => updateChange(c.id, { amount })} allowNegative={c.kind === "income_change" || c.kind === "cost_change"} />
                <div className="field"><label htmlFor={`m-${c.id}`}>When</label><div className="input"><select id={`m-${c.id}`} value={c.month} onChange={(e) => updateChange(c.id, { month: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthName(start, m)}</option>)}</select></div></div>
                <button type="button" className="link small" onClick={() => set({ changes: s.changes.filter((x) => x.id !== c.id) })}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="chips">
            {(Object.keys(CHANGE_KINDS) as ChangeKind[]).map((k) => <button key={k} type="button" className="chip" onClick={() => addChange(k)} title={CHANGE_KINDS[k].hint}>+ {CHANGE_KINDS[k].label.replace(" from…", "")}</button>)}
          </div>
          <Nav back={back} next={next} label={invest ? "Next" : "See my options"} />
        </section>
      )}

      {name === "Options" && (
        <section className="stack" style={{ gap: 20 }} aria-labelledby="q-options">
          <h2 id="q-options" className="h1">Ways to pay for it</h2>
          <p className="muted">Borrowing {money(financed)} with a {TIERS[s.tier].label.toLowerCase()} credit score{s.tier === "unsure" ? " (shown as fair)" : ""}. Choose one to see it in your life. Which suits you is your call.</p>
          <p className="estimate-note small"><b>Example offers from fictional providers, at illustrative rates.</b> Real offers depend on the lender and your full application. Nothing here is a quote or advice.</p>
          {os.length === 0 ? <p className="list">Nothing to borrow: your deposit covers the price.</p> : (
            <div className="option-grid">
              {os.map((o) => (
                <button key={o.id} type="button" className={`option${chosen?.id === o.id ? " on" : ""}`} aria-pressed={chosen?.id === o.id} onClick={() => { setPicked(o.id); setLevers([]); setAnswer(null); setUnderstood(false); }}>
                  <span className="caption">{o.provider}{o.apr !== null ? ` · ${pct(o.apr)} APR` : ""}</span>
                  <b className="h3">{o.product}</b>
                  <dl className="option-facts">
                    <div><dt>Each month</dt><dd>{o.regular ? money(o.regular, true) : "—"}</dd></div>
                    <div><dt>For</dt><dd>{o.months ? dur(o.months) : "Paid now"}</dd></div>
                    <div><dt>Total</dt><dd>{money(o.total)}</dd></div>
                    <div><dt>{o.extraLabel}</dt><dd>{money(o.extraCost)}</dd></div>
                  </dl>
                </button>
              ))}
            </div>
          )}
          {os.length > 1 && (() => {
            const borrowing = os.filter((o) => o.apr !== null);
            const lowTotal = borrowing.reduce((a, b) => (b.total < a.total ? b : a), borrowing[0]);
            const lowMonthly = borrowing.reduce((a, b) => (b.regular < a.regular ? b : a), borrowing[0]);
            return lowTotal && lowMonthly && lowTotal.id !== lowMonthly.id ? (
              <p className="list small">{lowTotal.provider} has the lowest total cost but a higher monthly payment. {lowMonthly.provider} has the lowest monthly payment, but you pay {money(lowMonthly.total - lowTotal.total)} more overall.</p>
            ) : null;
          })()}
          {financed > 0 && (
            <details className="list">
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>What your credit score changes</summary>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="cmp">
                  <thead><tr><th scope="col">Credit score</th><th scope="col">Example APR</th><th scope="col">Each month</th><th scope="col">Total</th></tr></thead>
                  <tbody>{creditImpact(s).map((r) => (
                    <tr key={r.tier} className={r.tier === effectiveTier(s.tier) ? "priority" : undefined}><th scope="row">{TIERS[r.tier].label}{r.tier === effectiveTier(s.tier) ? " · you" : ""}</th><td>{pct(r.apr)}</td><td>{money(r.monthly, true)}</td><td>{money(r.total)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
          )}
          <Nav back={back} next={next} label="See it in my life" disabled={!chosen} />
        </section>
      )}

      {name === "Your future" && !invest && chosen && (
        <section className="stack" style={{ gap: 20 }} aria-labelledby="q-future">
          <h2 id="q-future" className="h1">This decision in your life</h2>
          <p className="muted">{chosen.provider}: {chosen.product}, {chosen.regular ? `${money(chosen.regular, true)} a month` : "paid now"}. Your next {showAll ? 24 : 12} months, with everything you told us.</p>
          {sum.boosted.map((r) => (
            <p key={r.m} className="insight"><b>{monthName(start, r.m)} looks unusually strong</b> because of one-off money ({r.notes.filter((n) => n.includes("+")).join(", ")}). A normal month leaves about {money(sum.typicalNormal)}, so we keep recurring and one-off money apart.</p>
          ))}
          <div className="tiles" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <div className="tile"><span className="caption">A normal month leaves</span><span className="v">{money(sum.typicalNormal)}</span></div>
            <div className="tile emph"><span className="caption">Tightest month</span><span className="v">{money(sum.tightest.left)}</span><span className="small muted">{monthName(start, sum.tightest.m)}</span></div>
            <div className="tile"><span className="caption">Months you’d be short</span><span className="v">{sum.short || "None"}</span></div>
          </div>
          <div className="table-wrap">
            <table className="cmp future">
              <thead><tr><th scope="col">Month</th><th scope="col">Regular income</th><th scope="col">Regular costs</th><th scope="col">New payment</th><th scope="col">Normal month</th><th scope="col">One-off</th><th scope="col">Left</th></tr></thead>
              <tbody>
                {rows.slice(0, showAll ? 24 : 12).map((r) => (
                  <tr key={r.m} className={r.left < 0 ? "short" : r.oneOffIn || r.oneOffOut ? "priority" : undefined}>
                    <th scope="row">{monthName(start, r.m)}{r.notes.length > 0 && <span className="small muted" style={{ display: "block", fontWeight: 400 }}>{r.notes.join(" · ")}</span>}</th>
                    <td>{money(r.recurringIn)}</td><td>−{money(r.recurringOut)}</td><td>{r.payment ? `−${money(r.payment, true)}` : "—"}</td>
                    <td><b>{money(r.normalLeft)}</b></td>
                    <td>{r.oneOffIn - r.oneOffOut ? `${r.oneOffIn - r.oneOffOut > 0 ? "+" : "−"}${money(Math.abs(r.oneOffIn - r.oneOffOut))}` : "—"}</td>
                    <td>{r.left < 0 ? `Short ${money(-r.left)}` : money(r.left)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="link small" onClick={() => setShowAll(!showAll)}>{showAll ? "Show 12 months" : "Show 24 months"}</button>
          {chosen.notes.map((n) => <p key={n} className="small muted">{n}</p>)}
          <Nav back={back} next={next} label="Try some what-ifs" />
        </section>
      )}

      {name === "What if" && chosen && (() => {
        const scen = applyLevers(s, levers);
        const alt = offers(scen.s, scen.tw).find((o) => o.id === chosen.id);
        const altRows = alt ? future(scen.s, alt.schedule, 24, alt.balloon ? { month: alt.months + (scen.tw.startDelay ?? 0), amount: alt.balloon } : undefined) : rows;
        const altSum = summarise(altRows);
        const line = (label: string, a: string, b: string, changed: boolean) => <tr key={label} className={changed ? "priority" : undefined}><th scope="row">{label}</th><td>{a}</td><td>{b}</td></tr>;
        return (
          <section className="stack" style={{ gap: 20 }} aria-labelledby="q-whatif">
            <h2 id="q-whatif" className="h1">What changes if…?</h2>
            <p className="muted">Turn on any of these. The maths is done by our code; nothing here is a prediction or advice.</p>
            <div className="chips" role="group" aria-label="What ifs">
              {(Object.keys(LEVERS) as Lever[]).filter((l) => !(l === "waitBonus" && !s.changes.some((c) => c.kind === "in_once"))).map((l) => (
                <button key={l} type="button" className="chip" aria-pressed={levers.includes(l)} onClick={() => setLevers((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))}>{LEVERS[l]}</button>
              ))}
            </div>
            {alt && (
              <div className="table-wrap">
                <table className="cmp">
                  <thead><tr><th scope="col"></th><th scope="col">As planned</th><th scope="col">With your what-ifs</th></tr></thead>
                  <tbody>
                    {line("Borrowing", money(chosen.financed), money(alt.financed), chosen.financed !== alt.financed)}
                    {line("Each month", money(chosen.regular, true), money(alt.regular, true), Math.abs(chosen.regular - alt.regular) > 0.5)}
                    {line("Length", dur(chosen.months), dur(alt.months) + (scen.tw.startDelay ? `, starting in ${monthName(start, scen.tw.startDelay + 1)}` : ""), chosen.months !== alt.months || !!scen.tw.startDelay)}
                    {line("Total paid", money(chosen.total), money(alt.total), Math.abs(chosen.total - alt.total) > 0.5)}
                    {line("A normal month leaves", money(sum.typicalNormal), money(altSum.typicalNormal), Math.abs(sum.typicalNormal - altSum.typicalNormal) > 0.5)}
                    {line("Tightest month", money(sum.tightest.left), money(altSum.tightest.left), Math.abs(sum.tightest.left - altSum.tightest.left) > 0.5)}
                    {line("Months short", String(sum.short), String(altSum.short), sum.short !== altSum.short)}
                  </tbody>
                </table>
              </div>
            )}
            <Nav back={back} next={next} label="Before you sign" />
          </section>
        );
      })()}

      {name === "Before you sign" && chosen && (
        <section className="stack journey-card" aria-labelledby="q-sign">
          <h2 id="q-sign" className="h1">Before you sign</h2>
          <div className="commit-big"><span><b>{chosen.regular ? money(chosen.regular, true) : money(chosen.total)}</b> {chosen.regular ? "a month" : "today"}</span>{chosen.months > 0 && <span>for <b>{dur(chosen.months)}</b></span>}</div>
          <dl className="mlabel-rows">
            <div className="strong"><dt>Total you pay</dt><dd>{money(chosen.total)}</dd></div>
            <div className="strong"><dt>{chosen.extraLabel}</dt><dd>{money(chosen.extraCost)}</dd></div>
            <div><dt>A normal month would leave</dt><dd>{money(sum.typicalNormal)}</dd></div>
            <div><dt>Tightest month</dt><dd>{monthName(start, sum.tightest.m)}: {money(sum.tightest.left)}</dd></div>
          </dl>
          {quiz && (
            <fieldset className="quiz">
              <legend className="lead">Quick check: how much do you pay in total?</legend>
              {quiz.map((v, i) => (
                <label key={v} className={`quiz-option${answer === i ? " picked" : ""}`}><input type="radio" name="jq" checked={answer === i} onChange={() => setAnswer(i)} />{money(v)}</label>
              ))}
              {answer !== null && <p className="small" role="status"><b>{quiz[answer] === Math.round(chosen.total) ? "✓ That’s right. " : "Not quite. "}</b>You pay {money(chosen.total)} in total, including {money(chosen.upfront)} up front and {money(chosen.extraCost)} in {chosen.extraLabel.toLowerCase()}.</p>}
            </fieldset>
          )}
          <label className="quiz-option"><input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />I understand what this commitment means</label>
          <Nav back={back} next={next} label="Done" disabled={!understood || (!!quiz && (answer === null || quiz[answer] !== Math.round(chosen.total)))} />
        </section>
      )}

      {name === "Your plan" && invest && (
        <section className="stack journey-card" aria-labelledby="q-plan">
          <h2 id="q-plan" className="h1">Your saving or investing plan</h2>
          <div className="journey-fields">
            <Money id="i-start" label="Starting amount" value={s.invest.start} onChange={(v) => set({ invest: { ...s.invest, start: v } })} step={100} />
            <Money id="i-monthly" label="Each month" value={s.invest.monthly} onChange={(v) => set({ invest: { ...s.invest, monthly: v } })} step={10} />
          </div>
          <div className="slider">
            <label htmlFor="i-years">For <b>{s.invest.years} years</b></label>
            <input id="i-years" type="range" min={1} max={30} value={s.invest.years} onChange={(e) => set({ invest: { ...s.invest, years: Number(e.target.value) } })} />
          </div>
          <div className="choice-grid">
            {(Object.keys(RISK) as Risk[]).map((r) => (
              <button key={r} type="button" className={`choice${s.invest.risk === r ? " on" : ""}`} onClick={() => set({ invest: { ...s.invest, risk: r } })}>
                <b>{RISK[r].label}</b><span className="small muted">{RISK[r].blurb}</span>
              </button>
            ))}
          </div>
          <div className="list stack small">
            <b>Things people usually check first</b>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
              <li>An emergency fund in cash, often a few months of essential costs.</li>
              <li>Expensive debt: a credit card at around 25% APR costs more than investments are likely to grow.</li>
              <li>Investing is usually for five years or more, because values go up and down.</li>
            </ul>
          </div>
          <Nav back={back} next={next} label="See it grow" />
        </section>
      )}

      {name === "Your future" && invest && (() => {
        const g = growth(s.invest.start, s.invest.monthly, s.invest.years, s.invest.risk);
        const end = g[g.length - 1];
        const fr = future(s, Array(24).fill(s.invest.monthly), 24);
        const fs = summarise(fr);
        return (
          <section className="stack" style={{ gap: 20 }} aria-labelledby="q-grow">
            <h2 id="q-grow" className="h1">How it could grow</h2>
            <p className="estimate-note small"><b>Illustration only, not a prediction or advice.</b> The value of investments can fall as well as rise, and you could get back less than you put in. Growth rates are examples after fees.</p>
            <div className="tiles">
              <div className="tile"><span className="caption">You put in</span><span className="v">{money(end.paidIn)}</span></div>
              <div className="tile"><span className="caption">If growth is low</span><span className="v">{money(end.low)}</span></div>
              <div className="tile emph"><span className="caption">Middle example</span><span className="v">{money(end.mid)}</span></div>
              <div className="tile"><span className="caption">If growth is high</span><span className="v">{money(end.high)}</span></div>
            </div>
            <section className="card stack">
              <h3 className="h3">{RISK[s.invest.risk].label} over {s.invest.years} years</h3>
              <Chart label="Projected value over time for low, middle and high growth, and money paid in" endLabels={false}
                xTick={(t) => `${Math.round(t)}y`} xStep={Math.max(1, Math.round(s.invest.years / 6))} tipLabel={(t) => `After ${Math.round(t)} years`}
                series={[
                  { name: "Paid in", kind: "line", color: "#a1a1a6", dash: "2 4", pts: g.map((p) => ({ t: p.year, y: p.paidIn })) },
                  { name: "Low", kind: "line", color: "#717173", dash: "7 5", pts: g.map((p) => ({ t: p.year, y: p.low })) },
                  { name: "Middle", kind: "line", color: "#1f1f1f", pts: g.map((p) => ({ t: p.year, y: p.mid })) },
                  { name: "High", kind: "line", color: "#4c4c4c", dash: "12 4 2 4", pts: g.map((p) => ({ t: p.year, y: p.high })) },
                ]} />
            </section>
            <p className="list small"><b>In your month:</b> putting {money(s.invest.monthly)} aside leaves a normal month with about {money(fs.typicalNormal)}. {fs.short ? `${fs.short} month${fs.short > 1 ? "s" : ""} would come out short.` : "No month comes out short."}</p>
            <Nav back={back} next={next} label="Done" />
          </section>
        );
      })()}

      {name === "Done" && (
        <section className="stack journey-card" aria-labelledby="q-done">
          <span className="caption">All done</span>
          <h2 id="q-done" className="h1">{invest ? "Your plan, explained" : "You know what you’re signing up to"}</h2>
          {!invest && chosen && <p className="lead muted">{chosen.provider}: {chosen.product}. {chosen.regular ? `${money(chosen.regular, true)} a month for ${dur(chosen.months)}, ` : ""}{money(chosen.total)} in total. A normal month would leave about {money(sum.typicalNormal)}.</p>}
          {invest && <p className="lead muted">{money(s.invest.monthly)} a month into {RISK[s.invest.risk].label.toLowerCase()} for {s.invest.years} years. The choice, and any provider, is yours.</p>}
          <div className="done-grid">
            {!invest && <Link href="/cost-checker#paste" className="done-card"><Icon name="doc" /><b>Got a real offer?</b><span className="small muted">Decode it and see the small print</span></Link>}
            {!invest && chosen?.checker && <button type="button" className="done-card" onClick={() => toChecker(chosen)}><Icon name="calc" /><b>Full breakdown</b><span className="small muted">Money Label, risks and digital twin</span></button>}
            {!invest && chosen?.checker && <button type="button" className="done-card" onClick={() => toCompare(chosen)}><Icon name="compare" /><b>Add to Compare</b><span className="small muted">Line it up with other options</span></button>}
            {!invest && chosen?.checker && <button type="button" className="done-card" onClick={() => toCommitments(chosen)}><Icon name="chart" /><b>Add to my commitments</b><span className="small muted">See it next to what you already pay</span></button>}
            <Link href="/" className="done-card"><Icon name="spark" /><b>Plan something else</b><span className="small muted">Back to the start</span></Link>
          </div>
          {msg && <p className="small" role="status">{msg}</p>}
          <button type="button" className="link small" onClick={() => { journeyStore.set(DEFAULT_SITUATION); setPicked(null); setLevers([]); go(0); }}>Clear my answers</button>
        </section>
      )}
    </div>
  );
}
