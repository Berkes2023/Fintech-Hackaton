import type { Metadata } from "next";
import Link from "next/link";
import { RatesCharts } from "@/components/RatesCharts";
import { getRates } from "@/lib/rates";

export const metadata: Metadata = { title: "Interest rates" };
// Rebuild at most once a day; the data sources update daily or monthly.
export const revalidate = 86400;

const pct = (v: number) => `${+v.toFixed(2)}%`;
const pts = (v: number) => (Math.abs(v) < 0.005 ? "Level" : `${v > 0 ? "+" : ""}${v.toFixed(2)} pts`);
const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function RatesPage() {
  const data = await getRates();

  return (
    <div className="container section stack" style={{ gap: 32, paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">Learn · Live data</span>
        <h1 className="display">Interest rates, explained</h1>
        <p className="lead muted">
          Central bank rates set the starting point for what borrowing costs. Here’s where they are now and how they’ve moved.
        </p>
      </div>

      {!data ? (
        <div className="list"><p>We couldn’t load the latest rates just now. Try again later, or see the Bank of England’s website for today’s Bank Rate.</p></div>
      ) : (
        <>
          <div className="tiles">
            <div className="tile emph"><span className="caption">Bank of England</span><span className="v">{pct(data.latest.boe)}</span><span className="small muted">Bank Rate on {longDate(data.latest.boeDate)}</span></div>
            <div className="tile"><span className="caption">US Federal Reserve</span><span className="v">{pct(data.latest.fed)}</span><span className="small muted">Fed funds, monthly average</span></div>
            <div className="tile"><span className="caption">European Central Bank</span><span className="v">{pct(data.latest.ecb)}</span><span className="small muted">Deposit facility rate</span></div>
            <div className="tile"><span className="caption">UK vs US</span><span className="v">{pts(data.latest.boe - data.latest.fed)}</span><span className="small muted">percentage points</span></div>
          </div>

          <RatesCharts points={data.points} />

          <section className="grid-2">
            <div className="list stack">
              <p className="h3">What Bank Rate means for borrowing</p>
              <ul className="small" style={{ margin: 0, paddingLeft: 18, color: "var(--color-graphite)", display: "grid", gap: 8 }}>
                <li><b>Variable-rate</b> mortgages, loans and some overdrafts can get more or less expensive when Bank Rate changes. <b>Fixed-rate</b> deals stay the same until the fixed period ends.</li>
                <li>Credit cards charge far more than Bank Rate. A card at 24.9% APR is about {Math.round(24.9 - data.latest.boe)} percentage points above today’s {pct(data.latest.boe)}.</li>
                <li>Savings rates usually follow Bank Rate too, so higher rates can help savers while costing borrowers more.</li>
              </ul>
            </div>
            <div className="list stack">
              <p className="h3">Where these numbers come from</p>
              <p className="small" style={{ color: "var(--color-graphite)" }}>
                UK: Bank of England official Bank Rate (series IUDBEDR). US: effective federal funds rate (FRED, FEDFUNDS). Euro area: ECB deposit facility rate (FRED, ECBDFR).
                Monthly values are the last reading in each month, carried forward when a month has no change. Refreshed daily.
              </p>
              <p className="small muted">This page explains the background. It doesn’t predict where rates will go, and it isn’t advice.</p>
              <Link href="/check?type=loan" className="link small">See how a rate changes a loan’s cost</Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
