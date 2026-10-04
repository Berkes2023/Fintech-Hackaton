const gbp0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const gbp2 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** £1,234 for large amounts, £12.34 for small ones (or always pence when `exact`). */
export function money(v: number, exact = false): string {
  // Pence only when they matter: exact amounts, or small amounts that aren’t whole pounds.
  return exact || (Math.abs(v) < 100 && !Number.isInteger(Math.round(v * 100) / 100)) ? gbp2.format(v) : gbp0.format(v);
}

export function pct(v: number): string {
  return v.toLocaleString("en-GB", { maximumFractionDigits: 2 }) + "%";
}

/** Months as "2 years 3 months"; under a month shows weeks. */
export function dur(months: number): string {
  if (months < 1) {
    const w = Math.round(months * 4.345);
    return w <= 1 ? "1 week" : `${w} weeks`;
  }
  const m = Math.round(months);
  const y = Math.floor(m / 12);
  const r = m % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} ${y === 1 ? "year" : "years"}`);
  if (r) parts.push(`${r} ${r === 1 ? "month" : "months"}`);
  return parts.join(" ") || "0 months";
}
