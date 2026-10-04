import Link from "next/link";
import { Icon } from "@/components/Icon";
import { StoryDemo, type DemoNumbers } from "@/components/StoryDemo";
import { blankPicture, illustrativeProviders, position, schedule, withAmount, type Picture, type Scenario } from "@/lib/sim";

/** The fictional story on the home page. Every number is worked out by sim.ts, never typed in by hand. */
function demoNumbers(): DemoNumbers {
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
  const waited: Scenario = { ...b, amount: b.amount - bonus };
  const waitMonthly = schedule(waited).regular;
  return {
    price: purchase.price, deposit: purchase.deposit, financed: b.amount,
    providers: providers.map((p) => ({ name: p.id.toUpperCase(), apr: p.apr, term: p.term, monthly: Math.round(schedule(p).regular) })),
    monthly: Math.round(monthly), salary: 2500, spending: 1450, loan: 180, savings: 5000,
    normal: Math.round(normal), withCar: Math.round(normal - monthly), bonus,
    wait: { deposit: purchase.deposit + bonus, financed: waited.amount, monthly: Math.round(waitMonthly), withCar: Math.round(normal - waitMonthly), costBefore: schedule(b).cost, costAfter: schedule(waited).cost },
  };
}

const PATH = [
  ["Your credit context", "Experian, Equifax, TransUnion, or explore your profile"],
  ["Your goal", "A car, a home, a big purchase…"],
  ["The thing you want", "£25,000 car"],
  ["How it could be funded", "£5,000 deposit + £20,000 finance"],
  ["Your situation", "Salary, spending, borrowing, savings, pension"],
  ["What’s changing", "A bonus, a pay rise, a loan ending, a rent rise"],
  ["The simulation", "What this commitment could change, month by month"],
  ["What if?", "Wait for the bonus, change the term, the rate…"],
  ["Decode It", "Upload the real agreement"],
  ["Before you sign", "The whole picture, in one place"],
];

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
            A monthly payment is only part of the story. Your income, existing commitments, credit profile, savings, future plans and the terms you’re offered can all change what a financial decision means for you.
          </p>
          <div className="row" style={{ gap: 12 }}>
            <Link href="/check" className="btn btn-on-dark">Understand my situation <Icon name="arrow" size={18} /></Link>
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
              {["Your salary?", "Your rent?", "Your existing loan?", "Your credit-card payments?", "Your savings?", "Your pension contributions?", "A bonus arriving next month?", "A loan finishing in three months?", "A rent increase you already know is coming?"].map((q) => <li key={q}>{q}</li>)}
            </ul>
            <p><b>Before You Sign brings those pieces together</b> so you can explore the potential impact before committing.</p>
          </div>
        </div>
      </section>

      <section className="container section stack" style={{ gap: 28 }}>
        <div className="truths">
          <p>The price isn’t the whole cost.</p>
          <p>Your credit score isn’t your whole financial situation.</p>
          <p>Your bank statement doesn’t know everything you know about your future.</p>
          <p>A monthly payment doesn’t show what happens next.</p>
        </div>
        <p className="h2">Before You Sign brings the pieces together.</p>
        <ol className="flow4" aria-label="Past, today, what's coming, Before You Sign">
          <li><span className="caption">Past</span><b>Your history</b><span>Credit history</span><span>Past transactions</span><span>Existing borrowing</span></li>
          <li><span className="caption">Today</span><b>Your situation</b><span>Income</span><span>Spending and savings</span><span>The decision</span></li>
          <li><span className="caption">What you know is coming</span><b>Your future</b><span>A bonus or pay rise</span><span>A loan ending</span><span>A rent change</span></li>
          <li className="on"><span className="caption">Before You Sign</span><b>Together</b><span>See the potential impact of the decision, with all of it in view.</span></li>
        </ol>
      </section>

      <section className="dark-band section">
        <div className="container grid-2" style={{ alignItems: "center" }}>
          <div className="stack">
            <span className="caption" style={{ color: "#a6a6aa" }}>Start with your credit context</span>
            <h2 className="h1">Credit score ≠ affordability</h2>
            <p className="lead" style={{ color: "#d6d6d8" }}>A credit profile can influence how lenders assess an application, and the products or rates they may offer. But a high score doesn’t mean a new commitment fits your life.</p>
            <p style={{ color: "#d6d6d8" }}>So we start with your Experian, Equifax or TransUnion score on its own scale. Don’t know it? Explore your profile with a few plain questions. We never invent a score.</p>
            <Link href="/check" className="btn btn-on-dark" style={{ justifySelf: "start" }}>Start with my credit context <Icon name="arrow" size={18} /></Link>
          </div>
          <div className="combine">
            {["Credit context", "Your current situation", "The decision you’re considering", "The finance terms", "What you know about your future"].map((x, i) => <span key={x}>{i ? "+ " : ""}{x}</span>)}
            <b>= a simulation of how your situation could change</b>
          </div>
        </div>
      </section>

      <section className="container section stack" style={{ gap: 24 }}>
        <div className="stack" style={{ maxWidth: 760, gap: 8 }}>
          <span className="caption">The journey</span>
          <h2 className="h1">Every screen answers one question.</h2>
          <p className="muted">No giant form, no dashboard. A story you build one step at a time.</p>
        </div>
        <ol className="path">
          {PATH.map(([t, d], i) => <li key={t}><span className="path-n">{i + 1}</span><b>{t}</b><span className="small muted">{d}</span></li>)}
        </ol>
        <div className="row" style={{ gap: 12 }}>
          <Link href="/check" className="btn btn-dark">Understand my situation <Icon name="arrow" size={18} /></Link>
          <Link href="/start" className="link">Not sure where to start?</Link>
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
            <div className="card stack"><span className="caption">Code calculates</span><p className="h3">AI explains</p><p className="muted">Every number comes from transparent, tested maths. AI only reads documents and explains, and every AI answer is labelled.</p></div>
            <div className="card stack"><span className="caption">You decide</span><p className="h3">We never recommend</p><p className="muted">No “buy this”, no “best deal”, no approval predictions, and no invented lender rates. We show what could change.</p></div>
            <div className="card stack"><span className="caption">Your data</span><p className="h3">Stays with you</p><p className="muted">No sign-up and no bank connection. Scores you enter are yours; we never calculate an official one.</p></div>
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
