import Link from "next/link";
import { Dashboard } from "@/components/Dashboard";
import { Icon } from "@/components/Icon";
import { StoryDemo, type DemoNumbers } from "@/components/StoryDemo";
import { creditEstimate, type EstimateInputs } from "@/lib/credit";
import { blankPicture, illustrativeProviders, position, schedule, withAmount, type Picture, type Scenario } from "@/lib/sim";

/** The fictional story on the home page. Every number, including the credit estimate, is worked out by our code. */
function demoNumbers(): DemoNumbers {
  const answers: EstimateInputs = {
    onTime: "mostly", missed: "1", defaults: "none", ccj: "no", cardLimits: 5000, cardBalances: 1000, history: "3to6", applications: "2",
    borrowing: ["card", "loan", "overdraft"], keeping: "comfortably", overdraftRegular: "yes", electoralRoll: "unsure", insolvency: "no",
  };
  const est = creditEstimate(answers);
  if (!est.ok) throw new Error("demo credit answers are incomplete");
  const purchase = { price: 25000, deposit: 5000, saved: 5000 };
  const providers = illustrativeProviders(purchase);
  const b: Scenario = providers[1];
  const bp = blankPicture();
  const picture: Picture = {
    ...bp,
    income: withAmount(bp.income, "salary", 2500),
    essentials: withAmount(withAmount(withAmount(withAmount(bp.essentials, "rent", 850), "bills", 230), "food", 250), "transport", 120),
    debts: withAmount(bp.debts, "loan", 180),
    reserves: { savings: 5000, emergency: 0 },
  };
  const normal = position(picture).value;
  const monthly = schedule(b).regular;
  const bonus = 3000;
  const waitMonthly = schedule({ ...b, amount: b.amount - bonus }).regular;
  return {
    credit: { total: est.estimate.total, band: est.estimate.bandLabel, parts: est.estimate.components.map((c) => ({ label: c.label, points: c.points, max: c.max })) },
    price: purchase.price, deposit: purchase.deposit, financed: b.amount,
    providers: providers.map((p) => ({ name: p.id.toUpperCase(), apr: p.apr, term: p.term, monthly: Math.round(schedule(p).regular) })),
    monthly: Math.round(monthly), salary: 2500, spending: 1450, loan: 180, savings: 5000,
    normal: Math.round(normal), withCar: Math.round(normal - monthly), bonus,
    wait: { deposit: purchase.deposit + bonus, financed: b.amount - bonus, monthly: Math.round(waitMonthly), withCar: Math.round(normal - waitMonthly) },
  };
}

const TOOLS = [
  { href: "/cost-checker#paste", icon: "doc", title: "Decode It", desc: "AI reads the small print and quotes the exact words. Our code does the maths." },
  { href: "/cost-checker?type=loan", icon: "calc", title: "Hidden cost", desc: "Interest, fees and what a deal really costs over time." },
  { href: "/compare", icon: "compare", title: "Compare", desc: "Up to four options side by side, never ranked." },
  { href: "/cost-checker#afford", icon: "wallet", title: "Stress test", desc: "What’s left if bills rise or income falls." },
  { href: "/commitments", icon: "chart", title: "Commitment map", desc: "Everything you already pay, on one timeline." },
  { href: "/reverse", icon: "calc", title: "Reverse calculator", desc: "What £150 a month really means." },
];

export default function Home() {
  const n = demoNumbers();
  return (
    <>
      <section className="dark-band home-hero">
        <div className="container stack" style={{ gap: 24, justifyItems: "start" }}>
          <span className="caption" style={{ color: "#a6a6aa" }}>Before You Sign</span>
          <h1 className="display-xl">Know before you commit.</h1>
          <p className="lead" style={{ color: "#d6d6d8" }}>
            A monthly payment is only part of the story. Your credit profile, income, existing commitments, savings, future plans and the terms you’re offered can all change what a financial decision means for you.
          </p>
          <div className="row" style={{ gap: 12 }}>
            <Link href="/check" className="btn btn-on-dark">Start with my credit <Icon name="arrow" size={18} /></Link>
            <a href="#how" className="btn btn-ghost-photo">See how it works</a>
          </div>
          <p className="small" style={{ color: "#a6a6aa" }}>Free. No sign-up. Your figures stay in your browser. We explain; we never recommend.</p>
        </div>
      </section>

      <section id="how" className="container section anchor-target stack" style={{ gap: 28 }}>
        <div className="stack" style={{ maxWidth: 760, gap: 8 }}>
          <span className="caption">See how it works</span>
          <h2 className="h1">One decision. The whole story.</h2>
          <p className="lead muted">Follow someone thinking about a £25,000 car, using fictional numbers.</p>
        </div>
        <StoryDemo n={n} />
      </section>

      <section className="mist-band section">
        <div className="container grid-2 problem">
          <div className="stack">
            <span className="caption">Why Before You Sign exists</span>
            <h2 className="h1">A monthly payment doesn’t tell the whole story.</h2>
            <p className="lead">A £{n.monthly} monthly payment might sound simple. But what about:</p>
          </div>
          <div className="stack">
            <ul className="question-cloud">
              {["Your credit profile?", "Your salary?", "Your rent?", "Your existing loan?", "Your credit-card payments?", "Your savings?", "Your pension contributions?", "A bonus arriving next month?", "A loan finishing in three months?", "A rent increase you already know is coming?"].map((q) => <li key={q}>{q}</li>)}
            </ul>
            <p><b>Before You Sign brings those pieces together</b> so you can explore the potential impact before committing.</p>
          </div>
        </div>
      </section>

      <section className="container section stack" style={{ gap: 28 }}>
        <ol className="flow4" aria-label="Past, today, tomorrow, Before You Sign">
          <li><span className="caption">The past</span><b>Your credit history tells us about the past.</b></li>
          <li><span className="caption">Today</span><b>Your finances tell us about today.</b></li>
          <li><span className="caption">Tomorrow</span><b>You tell us what you know about tomorrow.</b></li>
          <li className="on"><span className="caption">Before You Sign</span><b>We bring them together around the decision you’re considering.</b></li>
        </ol>
        <div className="truths">
          <p>The price isn’t the whole cost.</p>
          <p>Your credit score isn’t your whole financial situation.</p>
          <p>Your bank statement doesn’t know everything you know about your future.</p>
          <p>A monthly payment doesn’t show what happens next.</p>
        </div>
      </section>

      <section className="dark-band section">
        <div className="container grid-2" style={{ alignItems: "center" }}>
          <div className="stack">
            <span className="caption" style={{ color: "#a6a6aa" }}>01 · Understand your credit</span>
            <h2 className="h1">Credit score ≠ affordability</h2>
            <p className="lead" style={{ color: "#d6d6d8" }}>A credit profile can influence how lenders assess an application, and the products or rates they may offer. But a high score doesn’t mean a new commitment fits your life.</p>
            <p style={{ color: "#d6d6d8" }}>Know your Experian, Equifax or TransUnion score? We’ll show it on that agency’s own scale. Don’t know it? Build a transparent 0–100 educational estimate with us, with every point explained. It’s never presented as an official score.</p>
            <Link href="/check" className="btn btn-on-dark" style={{ justifySelf: "start" }}>Start with my credit <Icon name="arrow" size={18} /></Link>
          </div>
          <div className="combine">
            {["Credit context", "Your current situation", "The decision you’re considering", "The finance terms", "What you know about your future"].map((x, i) => <span key={x}>{i ? "+ " : ""}{x}</span>)}
            <b>= a simulation of how your situation could change</b>
          </div>
        </div>
      </section>

      <section className="sky">
        <div className="container section dash-hero stack" style={{ gap: 20 }}>
          <div className="stack" style={{ gap: 8 }}>
            <span className="caption" style={{ color: "#fff" }}>Where would you like to start?</span>
            <h2 className="h1">What would you like to do?</h2>
            <p className="lead" style={{ color: "rgba(255,255,255,.92)" }}>Pick one. We’ll start with your credit, then take you through it a step at a time.</p>
          </div>
          <Dashboard />
        </div>
      </section>

      <section className="mist-band section">
        <div className="container stack" style={{ gap: 24 }}>
          <div className="stack" style={{ maxWidth: 760, gap: 8 }}>
            <span className="caption">Tools that support the story</span>
            <h2 className="h1">Look closer at any part of it.</h2>
          </div>
          <div className="tool-grid">
            {TOOLS.map((t) => <Link key={t.title} href={t.href} className="tool-card"><Icon name={t.icon} /><b>{t.title}</b><span className="small muted">{t.desc}</span></Link>)}
          </div>
        </div>
      </section>

      <section className="dark-band section">
        <div className="container stack" style={{ gap: 40 }}>
          <div className="stack" style={{ maxWidth: 760 }}>
            <h2 className="h1 section-title">Our promises</h2>
            <p className="lead" style={{ color: "#d6d6d8" }}>Built to help you understand, not to sell you anything.</p>
          </div>
          <div className="grid-3">
            <div className="card stack"><span className="caption">Code calculates</span><p className="h3">AI explains</p><p className="muted">Every number, including the credit estimate, comes from transparent, tested maths. AI only reads documents and explains, and every AI answer is labelled.</p></div>
            <div className="card stack"><span className="caption">You decide</span><p className="h3">We never recommend</p><p className="muted">No “buy this”, no “best deal”, no approval predictions, and no invented lender rates. We show what could change.</p></div>
            <div className="card stack"><span className="caption">Your data</span><p className="h3">Stays with you</p><p className="muted">No sign-up and no bank connection. A score you enter is yours; our estimate is never presented as an official one.</p></div>
          </div>
        </div>
      </section>

      <section className="container section stack" style={{ gap: 20 }}>
        <span className="caption">Where this could go</span>
        <h2 className="h1">Roadmap</h2>
        <div className="tool-grid">
          <div className="tool-card"><b>Open Banking</b><span className="small muted">Fill in your situation from your own accounts, with your permission.</span></div>
          <div className="tool-card"><b>Authorised credit data</b><span className="small muted">Bring in your credit report with consent, instead of typing a score.</span></div>
          <div className="tool-card"><b>Real provider terms</b><span className="small muted">Verified quotes from lenders, never invented.</span></div>
          <Link href="/firewall" className="tool-card"><b>Optional browser companion</b><span className="small muted">A dismissible card beside a checkout. It never blocks you.</span></Link>
          <div className="tool-card"><b>Mortgage and other journeys</b><span className="small muted">The same story engine for homes, improvements and big purchases.</span></div>
        </div>
      </section>
    </>
  );
}
