import { Dashboard } from "@/components/Dashboard";
import { HeroCard } from "@/components/HeroCard";
import { EXAMPLES, simulate, type Metrics } from "@/lib/finance";

const toLine = (m: Metrics) => ({
  total: m.total,
  interest: m.interest,
  months: m.end,
  pts: [{ t: 0, y: 0 }, ...m.s.map((p) => ({ t: p.t, y: p.cum }))],
});

export default function Home() {
  const card = simulate("card", EXAMPLES[1].values);
  const minOnly = simulate("card", { ...EXAMPLES[1].values, payType: "min" });

  return (
    <>
      <section className="sky">
        <div className="container hero dash-hero">
          <span className="pill-label" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>Know the real cost before you sign</span>
          <h1 className="display">What would you like to do?</h1>
          <p className="lead">Pick one. We’ll take you through it a step at a time and show what it means for your money, before you commit.</p>
          <Dashboard />
        </div>
      </section>

      <section className="container section stack" style={{ gap: 24, justifyItems: "center", textAlign: "center" }}>
        <span className="caption">See it in action</span>
        <h2 className="h1" style={{ maxWidth: 720 }}>A £1,200 credit card, made clear</h2>
        <div className="hero-stage" style={{ marginBottom: 0 }} aria-label="Example result">
          <HeroCard fixed={toLine(card)} minOnly={toLine(minOnly)} />
        </div>
      </section>

      <section className="dark-band section">
        <div className="container stack" style={{ gap: 40 }}>
          <div className="stack" style={{ maxWidth: 760 }}>
            <h2 className="h1 section-title">Our three promises</h2>
            <p className="lead" style={{ color: "#d6d6d8" }}>Built to help you understand, not to sell you anything.</p>
          </div>
          <div className="grid-3">
            <div className="card stack">
              <span className="caption">We explain</span>
              <p className="h3">You decide</p>
              <p className="muted">We never tell you which product to choose or rank one above another. We make the trade-offs clear.</p>
            </div>
            <div className="card stack">
              <span className="caption">Your data</span>
              <p className="h3">Stays with you</p>
              <p className="muted">No sign-up and no bank connection. Your figures are worked out in your browser and saved only on your device.</p>
            </div>
            <div className="card stack">
              <span className="caption">AI, responsibly</span>
              <p className="h3">Optional and labelled</p>
              <p className="muted">Every number comes from transparent maths. AI only explains and reads small print, and every AI answer is marked.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
