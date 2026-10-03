"use client";

import type { RatePoint } from "@/lib/rates";
import { Chart } from "./Chart";

const pctFmt = (v: number) => `${+v.toFixed(2)}%`;
const ppFmt = (v: number) => (Math.abs(v) < 0.005 ? "0 pts" : `${v > 0 ? "+" : ""}${+v.toFixed(2)} pts`);
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export function RatesCharts({ points }: { points: RatePoint[] }) {
  const xTick = (t: number) => points[Math.round(t)]?.month.slice(0, 4) ?? "";
  const tipLabel = (t: number) => (points[Math.round(t)] ? monthName(points[Math.round(t)].month) : "");
  const line = (name: string, key: keyof Omit<RatePoint, "month">, color: string, dash?: string) => ({
    name, kind: "line" as const, color, dash, pts: points.map((p, t) => ({ t, y: p[key] })),
  });

  return (
    <>
      <section className="card stack" aria-labelledby="policy-title">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 id="policy-title" className="h3">Policy rates since 2007</h2>
          <div className="legend">
            <span><i />Bank of England</span>
            <span><i style={{ borderTopStyle: "dashed", borderColor: "#717173" }} />US Federal Reserve</span>
            <span><i style={{ borderTopStyle: "dotted", borderColor: "#4c4c4c" }} />European Central Bank</span>
          </div>
        </div>
        <Chart
          label="Bank of England, Federal Reserve and ECB policy rates by month since 2007"
          series={[line("Bank of England", "boe", "#1f1f1f"), line("US Fed", "fed", "#717173", "7 5"), line("ECB", "ecb", "#4c4c4c", "2 4")]}
          format={pctFmt} xTick={xTick} xStep={36} tipLabel={tipLabel} endLabels={false}
        />
      </section>

      <section className="card stack" aria-labelledby="diff-title">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 id="diff-title" className="h3">The gap between the UK and others</h2>
          <div className="legend">
            <span><i />UK minus US</span>
            <span><i style={{ borderTopStyle: "dashed", borderColor: "#717173" }} />UK minus euro area</span>
          </div>
        </div>
        <p className="small muted">Above zero means UK rates are higher. Differences like these move the pound’s exchange rate, which affects the price of imported goods and holidays abroad.</p>
        <Chart
          label="Difference between UK and US, and UK and euro area policy rates, in percentage points"
          series={[line("UK − US", "ukUs", "#1f1f1f"), line("UK − euro area", "ukEu", "#717173", "7 5")]}
          format={ppFmt} xTick={xTick} xStep={36} tipLabel={tipLabel} endLabels={false} height={240}
        />
      </section>
    </>
  );
}
