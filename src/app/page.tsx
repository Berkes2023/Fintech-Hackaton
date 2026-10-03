import Link from "next/link";
import { Icon } from "@/components/Icon";
import { money } from "@/lib/format";
import { EXAMPLES, PRODUCT_TYPES, PRODUCTS, simulate } from "@/lib/finance";

export default function Home() {
  const card = simulate("card", EXAMPLES[1].values);
  const minOnly = simulate("card", { ...EXAMPLES[1].values, payType: "min" });

  return (
    <>
      <section className="sky">
        <div className="container hero">
          <span className="pill-label" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>Money, explained</span>
          <h1 className="display-xl">Know the real cost<br />before you sign</h1>
          <p className="lead">
            Put in a loan, credit card, overdraft, Buy Now Pay Later plan or bill. See what it costs now, what it costs in the end, and what could go wrong.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/check" className="btn btn-dark">Check a cost</Link>
            <Link href="/compare" className="btn btn-ghost-photo">Compare options</Link>
          </div>

          <div className="hero-phone" aria-label="Example result">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="pill-label">Credit card</span>
              <span className="small muted">£1,200 at 24.9% APR</span>
            </div>
            <p className="h3" style={{ marginTop: 16 }}>Paying £50 a month, you pay back {money(card.total)}.</p>
            <p className="small muted" style={{ marginTop: 6 }}>Paying only the minimum, it takes {Math.round(minOnly.end / 12)} years and costs {money(minOnly.interest)} in interest.</p>
            <div className="tiles" style={{ marginTop: 16, borderRadius: "16px 16px 0 0", borderBottom: 0 }}>
              <div className="tile"><span className="caption">Monthly</span><span className="v">£50</span></div>
              <div className="tile"><span className="caption">Interest</span><span className="v">{money(card.interest)}</span></div>
              <div className="tile emph"><span className="caption">Total</span><span className="v">{money(card.total)}</span></div>
              <div className="tile"><span className="caption">Months</span><span className="v">{card.end}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="container section stack" style={{ gap: 32 }}>
        <div className="stack" style={{ maxWidth: 760 }}>
          <h2 className="h1 section-title">Six kinds of commitment. One clear view of each.</h2>
        </div>
        <div className="product-tiles">
          {PRODUCT_TYPES.map((t) => (
            <Link key={t} href={`/check?type=${t}`} className="product-tile">
              <span className="icon"><Icon name={t} size={22} /></span>
              <b>{PRODUCTS[t].label}</b>
              <span className="small muted">{PRODUCTS[t].blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <div className="list stack" style={{ gap: 32, padding: "40px clamp(24px, 4vw, 56px)" }}>
          <h2 className="h1">From small print to understanding in three steps</h2>
          <ol className="steps">
            <li><p className="h3">Enter the details</p><p className="muted" style={{ marginTop: 8 }}>Type in the figures from the advert, or paste the terms and let AI fill in the form for you to check.</p></li>
            <li><p className="h3">See the real cost</p><p className="muted" style={{ marginTop: 8 }}>Short-term and long-term cost, a plain-English summary, a chart of every payment, and the risks to check.</p></li>
            <li><p className="h3">Compare and decide</p><p className="muted" style={{ marginTop: 8 }}>Line up to four options side by side. We show the facts. The choice stays with you.</p></li>
          </ol>
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
              <p className="muted">No sign-up and no bank connection. Your figures are calculated in your browser and saved only on your device.</p>
            </div>
            <div className="card stack">
              <span className="caption">AI, responsibly</span>
              <p className="h3">Optional and labelled</p>
              <p className="muted">Every number comes from transparent maths. AI only explains and reads small print, and every AI answer is marked.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="row" style={{ justifyContent: "space-between", gap: 24 }}>
          <div className="stack" style={{ maxWidth: 640 }}>
            <h2 className="display">Paying for a £1,200 laptop?</h2>
            <p className="lead muted">Pay in 3, a credit card or store finance. See every cost side by side before you choose.</p>
          </div>
          <Link href="/compare" className="btn btn-dark">See the comparison <Icon name="arrow" size={18} /></Link>
        </div>
      </section>
    </>
  );
}
