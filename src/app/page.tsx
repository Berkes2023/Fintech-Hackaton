import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { SourceBadge } from "@/components/CarParts";
import { Gauge } from "@/components/CreditContext";
import { Dashboard } from "@/components/Dashboard";
import { Icon } from "@/components/Icon";
import { Counter, DotGrid, HeroTyper, Reveal, Sequence, Stage, TypeOnce } from "@/components/StoryKit";
import { paymentConsequence, snapshot } from "@/lib/consequence";
import { bandPosition, CRA_LABEL, CURRENT_SCALE, makeScore, SCALES, type Cra } from "@/lib/credit";
import { money } from "@/lib/format";
import { blankPicture, position, schedule, withAmount, type Picture, type Scenario } from "@/lib/sim";
import { INSOLVENCY_BREAKDOWN, OTHER_SOURCES, STATS, type Stat } from "@/lib/stats";

// The home page is a short story: the problem, why the numbers are hard, one relatable decision, what's missing,
// and how Before You Sign connects it. Every £ figure is calculated by sim.ts; every statistic comes from stats.ts.

const car = (amount: number): Scenario => ({ id: "x", label: "Illustrative", source: "illustrative", amount, apr: 9.9, term: 48, upfrontFee: 0, monthlyFee: 0, balloon: 0, startIn: 0, fieldSources: {} });

function numbers() {
  const price = 25000, deposit = 5000, bonus = 3000;
  const now = schedule(car(price - deposit));
  const wait = schedule(car(price - deposit - bonus));
  const bp = blankPicture();
  const alex: Picture = {
    ...bp,
    income: withAmount(bp.income, "salary", 2500),
    essentials: withAmount(withAmount(withAmount(withAmount(bp.essentials, "rent", 850), "bills", 230), "food", 250), "transport", 120),
    debts: withAmount(bp.debts, "loan", 180),
    reserves: { savings: 5000, emergency: 0 },
  };
  // The home-page consequence example: £670 left today, a £420 proposed payment.
  const ex: Picture = {
    ...alex,
    otherSaving: withAmount(bp.otherSaving, "regular", 75),
    pension: { amount: 125, alreadyDeducted: false, employer: 0 },
  };
  const exSnap = snapshot(ex);
  const conseq = { ...paymentConsequence(exSnap, 420), income: exSnap.income };
  return {
    conseq,
    price, deposit, bonus, financed: price - deposit, apr: 9.9, term: 48,
    monthly: now.regular, total: now.total, cost: now.cost,
    living: 230 + 250 + 120, normal: position(alex).value,
    wait: { monthly: wait.regular, total: wait.total, cost: wait.cost },
  };
}

/** Lists passed between server and client components need keys. */
const keyed = (xs: ReactNode[]) => xs.map((x, i) => <Fragment key={i}>{x}</Fragment>);

function Source({ s }: { s: Stat }) {
  return <p className="stat-source"><SourceBadge source="official_source" /> <a href={s.url} target="_blank" rel="noreferrer">{s.source}</a> · {s.geography}, {s.year.split(" ")[0]}</p>;
}

function BigStat({ s, children }: { s: Stat; children?: ReactNode }) {
  return (
    <div className="big-stat">
      <p className="big-num"><Counter to={s.count.to} decimals={s.count.decimals} suffix={s.count.suffix} /></p>
      <p className="big-desc">{s.description}</p>
      {s.share && <p className="big-share">{s.share}</p>}
      {children}
      <Source s={s} />
    </div>
  );
}

const SAMPLE_SCORES: [Cra, number][] = [["experian", 920], ["equifax", 710], ["transunion", 680]];

export default function Home() {
  const n = numbers();
  const c = n.conseq;
  const m = (x: number) => money(x, true);
  const insolvencyTotal = INSOLVENCY_BREAKDOWN.reduce((a, b) => a + b.n, 0);
  return (
    <>
      {/* HOOK */}
      <section className="dark-band home-hero story-hero">
        <div className="hero-floats" aria-hidden="true">
          {[money(n.price), `${n.apr}%`, `${m(n.monthly)}/month`, `${n.term} months`, `${money(n.deposit)} deposit`].map((x, i) => <span key={x} className={`float f${i}`}>{x}</span>)}
        </div>
        <div className="container stack" style={{ gap: 22, justifyItems: "start", position: "relative" }}>
          <span className="caption" style={{ color: "#a6a6aa" }}>Before You Sign</span>
          <HeroTyper />
          <div className="row" style={{ gap: 12 }}>
            <Link href="/plan" className="btn btn-on-dark">Start my journey <Icon name="arrow" size={18} /></Link>
            <a href="#story" className="btn btn-ghost-photo">See the story ↓</a>
          </div>
        </div>
      </section>

      {/* THE CONSEQUENCE, IN FOUR NUMBERS */}
      <section className="container section story-block">
        <Reveal><span className="caption">Every financial decision has consequences</span><p className="h1">A monthly payment tells you what leaves your account. It doesn’t tell you what that leaves you with.</p></Reveal>
        <Sequence className="conseq-flow" interval={600} items={keyed([
          <><span>Take-home income</span><b>{money(c.income)}</b><span>a month</span></>,
          <><span>Remaining today</span><b>{money(c.before)}</b><span>after regular costs</span></>,
          <><span>Proposed car payment</span><b>−{money(c.payment)}</b><span>{c.pctOfIncome}% of income</span></>,
          <><span>Remaining after</span><b>{money(c.after)}</b><span>{c.pctOfFlexibility}% of today’s flexibility committed</span></>,
        ])} />
        <p className="small muted">Fictional example: £1,450 regular outgoings, £180 existing loan, £200 saving and pension. Worked out by our consequence engine.</p>
        <Reveal><p className="story-line">Before You Sign shows what changes, before you commit.</p></Reveal>
      </section>

      {/* THE UK PROBLEM: credit is everyday */}
      <section id="story" className="container section anchor-target story-block">
        <div className="story-grid">
          <Reveal><span className="caption">Credit is part of everyday life</span><BigStat s={STATS.holdCredit} /></Reveal>
          <Reveal delay={150} className="stack"><DotGrid filled={84} label="84 out of 100 dots filled: 84 in 100 UK adults" /><p className="dot-caption"><b>84 in 100</b> UK adults</p></Reveal>
        </div>
        <Reveal><p className="story-line">Borrowing isn’t unusual. Understanding what it means matters.</p></Reveal>
      </section>

      {/* INTEREST / NUMERACY */}
      <section className="mist-band section">
        <div className="container story-block">
          <div className="story-grid">
            <Reveal><span className="caption">Financial numeracy</span><BigStat s={STATS.poorNumeracy}><p className="small muted">The FCA asked three multiple-choice questions designed by National Numeracy. These adults answered none of the three correctly.</p></BigStat></Reveal>
            <Reveal delay={150} className="stack">
              <Stage className="concepts" label="Three concepts: interest, cumulative interest, inflation">
                {["Interest", "Cumulative interest", "Inflation"].map((c, i) => <div key={c} className="concept" style={{ ["--d" as string]: `${i * 250}ms` }}><b>{c}</b><span className="q">?</span></div>)}
              </Stage>
              <DotGrid filled={18} label="18 out of 100 dots filled: 18 in 100 UK adults" />
              <p className="dot-caption"><b>18 in 100</b> UK adults</p>
            </Reveal>
          </div>
          <Reveal><p className="story-line">Financial decisions shouldn’t require you to think like a financial analyst.</p></Reveal>
        </div>
      </section>

      {/* CONFIDENCE WITH NUMBERS */}
      <section className="container section story-block">
        <div className="story-grid">
          <Reveal><span className="caption">Confidence with numbers</span><BigStat s={STATS.lowConfidence} /></Reveal>
          <Reveal delay={150}>
            <Stage className="num-cloud" label={`A cloud of figures that simplifies to: ${m(n.monthly)} a month for ${n.term} months, ${money(n.total)} in total.`}>
              {[`${n.apr}%`, money(n.financed), `${n.term} months`, m(n.monthly), money(n.total), money(n.cost)].map((x, i) => <span key={x} className={`cloud c${i}`}>{x}</span>)}
              <p className="cloud-clear"><b>{m(n.monthly)} a month</b> for {n.term} months.<br />{money(n.total)} in total, of which <b>{money(n.cost)}</b> is the cost of borrowing.</p>
            </Stage>
            <p className="small muted">Illustrative: {money(n.financed)} at {n.apr}% APR over {n.term} months, calculated by our code.</p>
          </Reveal>
        </div>
        <Reveal><p className="story-line">A financial product can be full of numbers without making the decision clear.</p></Reveal>
      </section>

      {/* UNDERSTANDING THE PRODUCT */}
      <section className="mist-band section">
        <div className="container story-block">
          <div className="story-grid">
            <Reveal><span className="caption">Understanding the product</span><BigStat s={STATS.limitedUnderstanding} /></Reveal>
            <Reveal delay={150}>
              <Stage className="doc-anim" label="An agreement full of terms becomes four clear answers">
                <div className="doc-sheet" aria-hidden="true">
                  <span className="doc-title">Finance agreement (fictional)</span>
                  {["APR", "Fees", "Early repayment", "Total repayment", "Penalties", "Term"].map((w, i) => <span key={w} className="doc-word" style={{ ["--d" as string]: `${i * 180}ms` }}>{w}</span>)}
                  <span className="doc-blur">???</span>
                </div>
                <ul className="doc-clear">
                  {["Monthly cost", "Total cost", "Important conditions", "What changes for you"].map((w, i) => <li key={w} style={{ ["--d" as string]: `${2000 + i * 220}ms` }}><Icon name="shield" size={16} /> {w}</li>)}
                </ul>
              </Stage>
            </Reveal>
          </div>
          <Reveal><p className="story-line">The information exists. Understanding it is the hard part.</p></Reveal>
        </div>
      </section>

      {/* PERCENTAGE → POUNDS */}
      <section className="dark-band section">
        <div className="container story-block pounds">
          <Reveal><p className="huge">{n.apr}% APR</p></Reveal>
          <Reveal><p className="h2" style={{ color: "#d6d6d8" }}>You know the percentage.</p></Reveal>
          <Reveal><p className="h1">But what does {n.apr}% actually mean in pounds?</p></Reveal>
          <div className="pounds-grid">
            <Sequence className="pounds-inputs" interval={500} items={keyed([
              <><span>Car</span><b>{money(n.price)}</b></>,
              <><span>Deposit</span><b>− {money(n.deposit)}</b></>,
              <><span>Finance</span><b>{money(n.financed)}</b></>,
              <><span>APR</span><b>{n.apr}%</b></>,
              <><span>Term</span><b>{n.term} months</b></>,
            ])} />
            <Reveal delay={300} className="pounds-out">
              <span className="pill-label dark-pill">Illustrative example</span>
              <div><span>Monthly payment</span><b><Counter to={n.monthly} decimals={2} prefix="£" /></b></div>
              <div><span>Total repayment</span><b><Counter to={n.total} prefix="£" /></b></div>
              <div><span>Cost of borrowing</span><b><Counter to={n.cost} prefix="£" /></b></div>
              <p className="small" style={{ color: "#a6a6aa" }}>Calculated by our finance engine (APR converted to a monthly rate; equal monthly payments; no fees). Not an offer.</p>
            </Reveal>
          </div>
          <Reveal><p className="story-line on-dark">A percentage becomes useful when you can see the pounds behind it.</p></Reveal>
          <Reveal><p className="tagline on-dark">You know the percentage. <b>See the pounds.</b></p></Reveal>
        </div>
      </section>

      {/* CREDIT SCORES ARE CONFUSING */}
      <section className="container section story-block">
        <Reveal><p className="h1">“What’s your credit score?”</p></Reveal>
        <div className="gauge-row">
          {SAMPLE_SCORES.map(([c, v], i) => {
            const id = CURRENT_SCALE[c];
            const s = SCALES[id];
            const sc = makeScore(id, v);
            return (
              <Reveal key={c} delay={i * 250} className="gauge-tile">
                <b className="cra-title">{CRA_LABEL[c]}</b>
                <span className="small muted">{s.min}–{s.max}</span>
                <Gauge bands={s.bands.map((b) => b.label)} at={bandPosition(s, v)} animate value={String(v)} sub={`sample · ${sc?.creditBand ?? ""}`} label={`${CRA_LABEL[c]} sample score ${v} out of ${s.max}`} legend={false} />
              </Reveal>
            );
          })}
        </div>
        <Reveal><p className="story-line">You don’t have just one universal UK credit score.</p></Reveal>
        <Reveal><p className="h2">Different agencies. Different scales. Potentially different information.</p></Reveal>
        <Reveal><p className="story-line">But even a credit score is only part of the story.</p></Reveal>
        <Reveal><p className="lead muted">It doesn’t tell you whether a new commitment fits your life.</p></Reveal>
        <Reveal><p className="tagline">You know your credit score. <b>See the wider situation.</b></p></Reveal>
      </section>

      {/* CREDIT-CARD DEBT */}
      <section className="mist-band section">
        <div className="container story-block">
          <div className="story-grid">
            <Reveal><span className="caption">When a payment feels manageable</span><BigStat s={STATS.persistentCard} /></Reveal>
            <Reveal delay={150}>
              <Stage className="loop" label="A loop: a £3,000 balance, a payment, interest and charges, and the balance moves slowly">
                {["Balance £3,000", "Payment", "Interest + charges", "Balance moves slowly"].map((x, i) => <div key={x} className="loop-node" style={{ ["--i" as string]: i }}>{x}</div>)}
              </Stage>
              <p className="small muted">Illustrative loop, not a calculation.</p>
            </Reveal>
          </div>
          <Reveal><p className="story-line">A payment can feel manageable while the long-term cost tells another story.</p></Reveal>
          <Reveal><p className="tagline">You know the monthly payment. <b>See the total commitment.</b></p></Reveal>
        </div>
      </section>

      {/* CREDIT FOR EVERYDAY LIFE */}
      <section className="container section story-block">
        <div className="story-grid">
          <Reveal><span className="caption">Credit and everyday costs</span><BigStat s={STATS.loansEveryday} /></Reveal>
          <Reveal delay={150}>
            <Stage className="flow-split" label="A personal loan flowing into food, travel and rent">
              <div className="flow-from">Personal loan</div>
              <div className="flow-to">{["Food", "Travel", "Rent"].map((x, i) => <span key={x} style={{ ["--d" as string]: `${300 + i * 200}ms` }}>{x}</span>)}</div>
            </Stage>
          </Reveal>
        </div>
        <Reveal><p className="story-line">Financial decisions don’t happen in isolation.</p></Reveal>
      </section>

      {/* WHEN FINANCES BECOME UNSUSTAINABLE */}
      <section className="mist-band section">
        <div className="container story-block">
          <div className="story-grid">
            <Reveal>
              <span className="caption">When finances become unsustainable</span>
              <div className="big-stat">
                <p className="big-num"><Counter to={STATS.insolvencies.count.to} /></p>
                <p className="big-desc">individual insolvencies in England and Wales in 2025.</p>
                <p className="big-share">1 in 395 adults</p>
                <p className="small">entered an insolvency procedure during the year, 7% higher than in 2024.</p>
                <Source s={STATS.insolvencies} />
              </div>
            </Reveal>
            <Reveal delay={150}>
              <Stage className="split-bar" label="The total split into IVAs, Debt Relief Orders and bankruptcies">
                <div className="split-track">{INSOLVENCY_BREAKDOWN.map((b) => <i key={b.short} style={{ flexGrow: b.n }} />)}</div>
                <ul>{INSOLVENCY_BREAKDOWN.map((b) => <li key={b.short}><b>{b.n.toLocaleString("en-GB")}</b> {b.label}</li>)}</ul>
                <p className="small muted">Total {insolvencyTotal.toLocaleString("en-GB")}: these three procedures together, not bankruptcies alone.</p>
              </Stage>
            </Reveal>
          </div>
          <Reveal><p className="story-line">Understanding a commitment before making it matters.</p></Reveal>
        </div>
      </section>

      {/* CHANGE THE MOOD */}
      <section className="dark-band section calm">
        <div className="container story-block" style={{ justifyItems: "center", textAlign: "center" }}>
          <Reveal><p className="h1" style={{ color: "#d6d6d8" }}>So we asked a different question.</p></Reveal>
          <TypeOnce className="display" text="What if you could understand the decision before you signed?" />
          <Reveal delay={400}><p className="display-xl brand">BEFORE YOU SIGN</p></Reveal>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="container section story-block">
        <Reveal><span className="caption">What Before You Sign does</span></Reveal>
        <Reveal><p className="h1">Four pieces, brought together.</p></Reveal>
        <Sequence className="equation" interval={500} items={keyed([
          <div key="e0" className="eq-card"><span className="caption">Credit history</span><b>What has happened</b></div>,
          <span key="e1" className="eq-op">+</span>,
          <div key="e2" className="eq-card"><span className="caption">Current situation</span><b>Income · Bills · Debt · Savings · Pension</b></div>,
          <span key="e3" className="eq-op">+</span>,
          <div key="e4" className="eq-card"><span className="caption">What you know about tomorrow</span><b>Bonus · Pay rise · Loan ending · Rent increase · Future expense</b></div>,
          <span key="e5" className="eq-op">+</span>,
          <div key="e6" className="eq-card"><span className="caption">The agreement</span><b>APR · Fees · Term · Repayment · Conditions</b></div>,
          <span key="e7" className="eq-op">=</span>,
          <div key="e8" className="eq-card result"><span className="caption">Before You Sign</span><b>See the decision in the context of your life.</b></div>,
        ])} />
        <div className="past-today stack">
          <Reveal><p>Your credit history tells us about the past.</p></Reveal>
          <Reveal delay={150}><p>Your finances tell us about today.</p></Reveal>
          <Reveal delay={300}><p>You tell us what you know about tomorrow.</p></Reveal>
          <Reveal delay={450}><p><b>Before You Sign brings them together.</b></p></Reveal>
        </div>
      </section>

      {/* HUMAN STORY: ALEX */}
      <section className="mist-band section">
        <div className="container story-block alex">
          <Reveal><span className="caption">A fictional, illustrative example</span><p className="display">Alex found a car.</p><p className="small muted">Alex isn’t a real person. Every figure is illustrative and calculated by our code.</p></Reveal>
          <Sequence className="alex-steps" interval={700} items={keyed([
            <div key="1" className="alex-card"><Icon name="car" size={28} /><b>{money(n.price)}</b><span>the car</span></div>,
            <div key="2" className="alex-card"><span>Alex has</span><b>{money(n.deposit)}</b><span>for a deposit</span></div>,
            <div key="3" className="alex-card"><span>Potential finance</span><b>{money(n.financed)}</b></div>,
            <div key="4" className="alex-card"><span>The offer</span><b>{n.apr}% APR</b><span>{n.term} months</span></div>,
            <div key="5" className="alex-card dark"><span>Monthly payment</span><b>{m(n.monthly)}</b></div>,
          ])} />
          <Reveal><p className="h2">“That monthly payment doesn’t look too bad.”</p></Reveal>
          <Reveal><p className="story-line">But that’s only one number.</p></Reveal>
          <Sequence className="alex-situation" interval={450} items={keyed([
            <><span>Take-home pay</span><b>{money(2500)}</b></>,
            <><span>Rent</span><b>−{money(850)}</b></>,
            <><span>Bills and living costs</span><b>−{money(n.living)}</b></>,
            <><span>Existing loan</span><b>−{money(180)}</b></>,
            <><span>Savings</span><b>{money(5000)}</b></>,
            <><span>A normal month leaves</span><b>{money(n.normal)}</b></>,
          ])} />
          <Sequence className="alex-timeline" interval={500} items={keyed([
            <><span className="caption">This month</span><b>Normal</b></>,
            <><span className="caption">Next month</span><b>+{money(n.bonus)} bonus</b><span className="event-tag">ONE-OFF</span></>,
            <><span className="caption">February</span><b>Existing loan ends</b></>,
            <><span className="caption">March</span><b>Rent changes</b></>,
          ])} />
          <Reveal><p className="h2">Alex knew something the historical numbers didn’t.</p><p className="lead muted">A {money(n.bonus)} bonus was arriving next month.</p></Reveal>
          <Reveal><p className="display" style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>What if Alex waits?</p></Reveal>
          <Reveal className="wait-grid">
            <div className="wait-row"><span>Deposit</span><b>{money(n.deposit)}</b><Icon name="arrow" size={18} /><b>{money(n.deposit + n.bonus)}</b></div>
            <div className="wait-row"><span>Finance</span><b>{money(n.financed)}</b><Icon name="arrow" size={18} /><b>{money(n.financed - n.bonus)}</b></div>
            <div className="wait-row"><span>Monthly payment</span><b>{m(n.monthly)}</b><Icon name="arrow" size={18} /><b>{m(n.wait.monthly)}</b></div>
            <div className="wait-row"><span>Total repayment</span><b>{money(n.total)}</b><Icon name="arrow" size={18} /><b>{money(n.wait.total)}</b></div>
            <div className="wait-row"><span>Total borrowing cost</span><b>{money(n.cost)}</b><Icon name="arrow" size={18} /><b>{money(n.wait.cost)}</b></div>
            <div className="wait-row"><span>Left in a normal month</span><b>{money(n.normal - n.monthly)}</b><Icon name="arrow" size={18} /><b>{money(n.normal - n.wait.monthly)}</b></div>
            <p className="small muted">Illustrative, {n.apr}% APR over {n.term} months in both cases. Calculated by our code, not AI.</p>
          </Reveal>
          <Reveal><p className="h2">Same car. Different timing. Different financial picture.</p></Reveal>
          <Reveal><p className="story-line">That’s why Before You Sign exists.</p></Reveal>
        </div>
      </section>

      {/* THE USER BECOMES THE STORY */}
      <section className="dark-band section">
        <div className="container story-block" style={{ justifyItems: "start" }}>
          <Reveal><p className="h2" style={{ color: "#d6d6d8" }}>Alex’s situation isn’t yours.</p><p className="display">Let’s understand yours.</p></Reveal>
          <Sequence className="journey-path" interval={350} items={([
            "Your situation", "Credit", "Goal", "Future changes", "Actual offer", "Consequences",
          ]).map((t, i) => <Fragment key={t}><span className="path-n">{String(i + 1).padStart(2, "0")}</span><b>{t}</b></Fragment>)} />
          <Link href="/plan" className="btn btn-on-dark">Start with my situation <Icon name="arrow" size={18} /></Link>
          <p className="tagline on-dark">Know before you commit.</p>
        </div>
      </section>

      <section className="sky">
        <div className="container section dash-hero stack" style={{ gap: 20 }}>
          <div className="stack" style={{ gap: 8 }}>
            <span className="caption" style={{ color: "#fff" }}>Or pick where to start</span>
            <h2 className="h1">What would you like to do?</h2>
            <p className="lead" style={{ color: "rgba(255,255,255,.92)" }}>We’ll start with your situation and credit, then show what each choice changes.</p>
          </div>
          <Dashboard />
        </div>
      </section>

      <section className="dark-band section">
        <div className="container stack" style={{ gap: 32 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><h2 className="h1 section-title">Our promises</h2><Link href="/about" className="btn btn-on-dark btn-sm">About Before You Sign</Link></div>
          <div className="grid-3">
            <div className="card stack"><span className="caption">Code calculates</span><p className="h3">AI explains</p><p className="muted">Every number comes from transparent, tested maths. AI only reads documents and explains, and every AI answer is labelled.</p></div>
            <div className="card stack"><span className="caption">You decide</span><p className="h3">We never recommend</p><p className="muted">No “buy this”, no “best deal”, no approval predictions and no invented lender rates.</p></div>
            <div className="card stack"><span className="caption">Your data</span><p className="h3">Stays with you</p><p className="muted">No sign-up and no bank connection. Your figures stay in your browser.</p></div>
          </div>
        </div>
      </section>

      <section id="sources" className="container section stack anchor-target sources">
        <span className="caption">Sources &amp; methodology</span>
        <h2 className="h1">Where these numbers come from</h2>
        <ul className="source-list">
          {Object.values(STATS).map((s) => (
            <li key={s.id}>
              <b>{s.headline}{s.share ? ` (${s.share})` : ""}</b>
              <span>“{s.sourceWording}”</span>
              <span className="small muted">{s.population} · {s.geography} · {s.year}</span>
              <a className="link small" href={s.url} target="_blank" rel="noreferrer">{s.source}</a>
            </li>
          ))}
        </ul>
        <div className="grid-2">
          <div className="stack">
            <h3 className="h3">Methodology</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              <li>Statistics are quoted with their source’s own definitions, population, geography and year. We haven’t recalculated them.</li>
              <li>Car finance figures are illustrative ({money(n.financed)} at {n.apr}% APR over {n.term} months, no fees), calculated by our tested finance engine: the APR is converted to a monthly rate and repaid in equal monthly payments. They are not offers.</li>
              <li>Alex is fictional. Credit scores in the story are samples placed on each agency’s published scale.</li>
              <li>Before You Sign doesn’t predict approval, give advice or recommend products.</li>
            </ul>
          </div>
          <div className="stack">
            <h3 className="h3">Official sources</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              {OTHER_SOURCES.map((o) => <li key={o.url}><a className="link" href={o.url} target="_blank" rel="noreferrer">{o.name}</a></li>)}
              <li><a className="link" href={STATS.insolvencies.url} target="_blank" rel="noreferrer">The Insolvency Service: individual insolvency statistics</a></li>
            </ul>
            <p className="small">Worried about money? <a className="link" href="https://www.moneyhelper.org.uk/" target="_blank" rel="noreferrer">MoneyHelper</a> offers free, impartial guidance.</p>
          </div>
        </div>
      </section>
    </>
  );
}
