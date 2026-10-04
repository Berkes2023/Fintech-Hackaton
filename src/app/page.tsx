import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { SourceBadge } from "@/components/CarParts";
import { Gauge } from "@/components/CreditContext";
import { Icon } from "@/components/Icon";
import { Counter, DotGrid, Reveal, Sequence } from "@/components/StoryKit";
import { gbp, paymentConsequence, snapshot } from "@/lib/consequence";
import { bandPosition, CRA_LABEL, CURRENT_SCALE, makeScore, SCALES, type Cra } from "@/lib/credit";
import { money } from "@/lib/format";
import { exampleCar, schedule, type Scenario } from "@/lib/sim";
import { STATS, type Stat } from "@/lib/stats";

// The home page sells one idea, one moment each: the hook, three sourced facts, one APR example, what a payment
// could leave you with, the credit story, our equation, then the journey. Every £ figure is worked out by our tested
// engines (sim.ts, consequence.ts) from the fictional example Plan also uses; every statistic comes from stats.ts.
// The full research lives at /about#sources.

const APR = 9.9;
const TERM = 48;
const LONGER = 60;
const car = (amount: number, term: number): Scenario => ({ id: "home", label: "Illustrative", source: "illustrative", amount, apr: APR, term, upfrontFee: 0, monthlyFee: 0, balloon: 0, startIn: 0, fieldSources: {} });

function example() {
  const ex = exampleCar();
  const { price, deposit } = ex.purchase;
  const financed = price - deposit;
  const snap = snapshot(ex.picture);
  // The consequence example's payment is the same amount over the longer term, so the two examples agree.
  const longer = schedule(car(financed, LONGER));
  // "What if I wait one month?": a one-off arriving next month goes into the deposit; same car, same terms.
  const bonus = ex.events.find((e) => e.direction === "in" && e.recurrence === "one_off" && e.month === 1);
  const later = bonus && bonus.amount < financed ? schedule(car(financed - bonus.amount, LONGER)) : null;
  return {
    price, deposit, financed, snap, longer,
    offer: schedule(car(financed, TERM)),
    conseq: paymentConsequence(snap, longer.regular),
    wait: bonus && later ? { bonus, financed: financed - bonus.amount, monthly: later.regular, cost: later.cost, after: paymentConsequence(snap, later.regular).after } : null,
  };
}

/** Lists passed between server and client components need keys. */
const keyed = (xs: ReactNode[]) => xs.map((x, i) => <Fragment key={i}>{x}</Fragment>);

/** The three strongest facts; the rest are on /about#sources. */
const PROBLEM: Stat[] = [STATS.holdCredit, STATS.poorNumeracy, STATS.limitedUnderstanding];
/** The share as a number, from the statistic's own record ("84%" → 84). */
const shareOf = (s: Stat) => Number.parseFloat(s.share ?? "0");

function Source({ s }: { s: Stat }) {
  return <p className="stat-source"><SourceBadge source="official_source" /> <a href={s.url} target="_blank" rel="noreferrer">{s.source}</a> · {s.geography}, {s.year.split(" ")[0]}</p>;
}

const SAMPLE_SCORES: [Cra, number][] = [["experian", 920], ["equifax", 710], ["transunion", 680]];
const EQUATION = [
  ["Your situation", "Income · Bills · Debt · Savings"],
  ["Credit context", "Experian · Equifax · TransUnion, or our estimate"],
  ["What’s coming", "Bonus · Loan ending · Rent change"],
  ["The offer", "APR · Fees · Term · Conditions"],
];
const STEPS = ["Financial situation", "Credit context", "Decision", "Consequences", "What if"];
const PROMISES = [
  { caption: "Code calculates", title: "AI explains", body: "Every figure comes from tested maths, never from AI. AI only reads documents and answers questions in plain English." },
  { caption: "No rankings", title: "No approval predictions", body: "We show what each option costs and changes. We never rank them, invent lender rates or predict what a lender would decide." },
  { caption: "Your data", title: "Stays in your browser unless you use AI", body: "No sign-up and no bank connection. AI features only see what you choose to send." },
];

export default function Home() {
  const x = example();
  const c = x.conseq;
  return (
    <>
      {/* HOOK */}
      <section className="dark-band home-hero story-hero">
        <div className="container stack" style={{ gap: 28, justifyItems: "start" }}>
          <span className="caption" style={{ color: "#a6a6aa" }}>Before You Sign</span>
          <h1 className="hero-title">
            <span className="hero-question">A monthly payment tells you what leaves your account.</span>
            <span className="display-xl">We show what it could leave you with.</span>
          </h1>
          <div className="row" style={{ gap: 12 }}>
            <Link href="/plan" className="btn btn-on-dark">Start my journey <Icon name="arrow" size={18} /></Link>
            <a href="#how" className="btn btn-ghost-photo">See how it works ↓</a>
          </div>
        </div>
      </section>

      {/* PROBLEM: three sourced facts */}
      <section id="problem" className="container section story-block anchor-target">
        <Reveal className="stack"><span className="caption">The problem</span><h2 className="h1">Most of us borrow. Fewer of us find the numbers easy.</h2></Reveal>
        <div className="grid-3">
          {PROBLEM.map((s, i) => (
            <Reveal key={s.id} delay={i * 150} className="list stat-tile">
              <p className="big-num"><Counter to={shareOf(s)} suffix="%" /></p>
              <p className="big-desc"><b>{s.headline}</b> {s.description}</p>
              <DotGrid filled={shareOf(s)} label={`${shareOf(s)} out of 100 dots filled: ${shareOf(s)} in 100 UK adults`} />
              <Source s={s} />
            </Reveal>
          ))}
        </div>
        <Link href="/about#sources" className="link small" style={{ justifySelf: "start" }}>See the research →</Link>
      </section>

      {/* ONE APR EXAMPLE */}
      <section className="dark-band section">
        <div className="container story-block">
          <Reveal className="stack"><p className="huge">{APR}% APR</p><h2 className="h1">What does that mean in pounds?</h2></Reveal>
          <div className="pounds-grid">
            <Sequence className="pounds-inputs" interval={500} items={keyed([
              <><span>Car</span><b>{money(x.price)}</b></>,
              <><span>Deposit</span><b>− {money(x.deposit)}</b></>,
              <><span>Financed</span><b>{money(x.financed)}</b></>,
              <><span>APR</span><b>{APR}%</b></>,
              <><span>Term</span><b>{TERM} months</b></>,
            ])} />
            <Reveal delay={300} className="pounds-out">
              <span className="pill-label dark-pill">Illustrative example</span>
              <div><span>Monthly payment</span><b><Counter to={x.offer.regular} decimals={2} prefix="£" /></b></div>
              <div><span>Total repayment</span><b><Counter to={x.offer.total} prefix="£" /></b></div>
              <div><span>Cost of borrowing</span><b><Counter to={x.offer.cost} prefix="£" /></b></div>
            </Reveal>
          </div>
          <Reveal><p className="story-line on-dark">A percentage becomes useful when you can see the pounds behind it.</p></Reveal>
          <details className="why" style={{ maxWidth: 760 }}>
            <summary>How is this calculated?</summary>
            <p className="small">
              Our finance engine turns the {APR}% APR into a monthly rate and spreads {money(x.financed)} over {TERM} equal monthly payments, with no fees.
              The total repayment is every payment added together; the cost of borrowing is that total minus the {money(x.financed)} borrowed.
              Illustrative, not an offer. <Link href="/about#ai" className="link">Our calculations</Link>
            </p>
          </details>
        </div>
      </section>

      {/* WHAT IT COULD LEAVE YOU WITH */}
      <section className="container section story-block">
        <Reveal className="stack"><span className="caption">What it changes</span><h2 className="h1">What would be left each month?</h2></Reveal>
        <Sequence className="conseq-flow" interval={600} items={keyed([
          <><span>Take-home income</span><b>{money(x.snap.income)}</b><span>a month</span></>,
          <><span>Estimated monthly remaining</span><b>{money(c.before)}</b><span>after regular costs</span></>,
          <><span>Proposed car payment</span><b>−{money(c.payment)}</b>{c.pctOfIncome !== null && <span>{c.pctOfIncome}% of income</span>}</>,
          <><span>Remaining after</span><b>{money(c.after)}</b>{c.pctOfFlexibility !== null && <span>{c.pctOfFlexibility}% of today’s flexibility committed</span>}</>,
        ])} />
        <p className="small muted">The {money(c.payment)} is the same {money(x.financed)} at {APR}% APR over {LONGER} months instead of {TERM}. Fictional figures, worked out by our consequence engine.</p>
        <div className="stack" style={{ gap: 0, maxWidth: 760 }}>
          <details className="why">
            <summary>Where does {money(c.before)} come from?</summary>
            <table className="why-table">
              <tbody>
                {x.snap.lines.map((l, i) => <tr key={`${l.label}-${i}`}><td>{l.label}{l.note && <span className="muted"> · {l.note}</span>}</td><td className="num">{gbp(l.amount)}</td></tr>)}
                <tr className="why-total"><td>Estimated monthly remaining</td><td className="num">{gbp(x.snap.remaining)}</td></tr>
              </tbody>
            </table>
            <p className="small muted">Regular income minus regular costs in a fictional month. One-off money, such as a bonus, isn’t counted.</p>
          </details>
          {x.wait && (
            <details className="why">
              <summary>What if I wait one month?</summary>
              <p className="small">Say the {money(x.wait.bonus.amount)} {x.wait.bonus.label.toLowerCase()} expected next month went into the deposit. Same car, same {APR}% APR over {LONGER} months:</p>
              <dl className="conseq-changes">
                <div><dt>Financed</dt><dd><span className="was">{money(x.financed)}</span><Icon name="arrow" size={16} /><b>{money(x.wait.financed)}</b></dd></div>
                <div><dt>Monthly payment</dt><dd><span className="was">{money(c.payment)}</span><Icon name="arrow" size={16} /><b>{money(x.wait.monthly)}</b></dd></div>
                <div><dt>Left each month</dt><dd><span className="was">{money(c.after)}</span><Icon name="arrow" size={16} /><b>{money(x.wait.after)}</b></dd></div>
                <div><dt>Cost of borrowing</dt><dd><span className="was">{money(x.longer.cost)}</span><Icon name="arrow" size={16} /><b>{money(x.wait.cost)}</b></dd></div>
              </dl>
              <p className="small muted">Based on this fictional example, assuming everything else stays the same. One-off money is counted once.</p>
            </details>
          )}
        </div>
      </section>

      {/* CREDIT CONTEXT */}
      <section className="mist-band section">
        <div className="container story-block">
          <Reveal className="stack"><span className="caption">Credit context</span><h2 className="h1">“What’s your credit score?”</h2></Reveal>
          <div className="gauge-row">
            {SAMPLE_SCORES.map(([cra, v], i) => {
              const s = SCALES[CURRENT_SCALE[cra]];
              return (
                <Reveal key={cra} delay={i * 200} className="gauge-tile">
                  <b className="cra-title">{CRA_LABEL[cra]}</b>
                  <span className="small muted">{s.min}–{s.max}</span>
                  <Gauge bands={s.bands.map((b) => b.label)} at={bandPosition(s, v)} value={String(v)} sub={`sample · ${makeScore(s.id, v)?.creditBand ?? ""}`} label={`${CRA_LABEL[cra]} sample score ${v} on a scale of ${s.min} to ${s.max}`} legend={false} />
                </Reveal>
              );
            })}
          </div>
          <Reveal className="stack">
            <p className="story-line">There isn’t one universal UK credit score.</p>
            <p className="lead muted">And a credit score still doesn’t show your whole financial situation.</p>
          </Reveal>
          <Link href="/learn#credit" className="link small" style={{ justifySelf: "start" }}>Learn more about UK credit scores →</Link>
        </div>
      </section>

      {/* OUR INSIGHT */}
      <section className="container section story-block">
        <h2 className="caption">Our insight</h2>
        <Sequence className="equation" interval={500} items={EQUATION.flatMap(([part, what], i) => [
          <div key={part} className="eq-card"><span className="caption">{part}</span><b>{what}</b></div>,
          <span key={`op${i}`} className="eq-op">{i < EQUATION.length - 1 ? "+" : "="}</span>,
        ]).concat(<div key="result" className="eq-card result"><b>Before You Sign</b></div>)} />
        <Reveal><p className="story-line">See what the decision could change before you commit.</p></Reveal>
      </section>

      {/* HOW IT WORKS + START */}
      <section id="how" className="dark-band section anchor-target">
        <div className="container story-block" style={{ justifyItems: "start" }}>
          <Reveal className="stack"><span className="caption" style={{ color: "#a6a6aa" }}>How it works</span><h2 className="display">Tell us about your situation.</h2></Reveal>
          <Sequence className="journey-path" interval={300} items={STEPS.map((t, i) => <Fragment key={t}><span className="path-n">{String(i + 1).padStart(2, "0")}</span><b>{t}</b></Fragment>)} />
          <div className="row" style={{ gap: 20 }}>
            <Link href="/plan" className="btn btn-on-dark">Start my journey <Icon name="arrow" size={18} /></Link>
            <Link href="/start" className="link">Not sure where to start?</Link>
          </div>
        </div>
      </section>

      {/* PROMISES */}
      <section className="mist-band section">
        <div className="container stack" style={{ gap: 24 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 className="h1 section-title">Our promises</h2>
            <Link href="/about" className="btn btn-light btn-sm">About Before You Sign</Link>
          </div>
          <div className="grid-3">
            {PROMISES.map((p) => <div key={p.caption} className="card stack"><span className="caption">{p.caption}</span><p className="h3">{p.title}</p><p className="muted">{p.body}</p></div>)}
          </div>
        </div>
      </section>
    </>
  );
}
