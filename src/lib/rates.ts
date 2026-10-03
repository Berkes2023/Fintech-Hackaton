import "server-only";

// Central bank policy rates, monthly (last value in each month, carried forward).
// UK: Bank of England official Bank Rate (IUDBEDR). FRED's BOERUKM series stopped in 2017, so it isn't used.
// US: Fed funds effective rate (FRED FEDFUNDS). Euro area: ECB deposit facility rate (FRED ECBDFR).

export interface RatePoint { month: string; boe: number; fed: number; ecb: number; ukUs: number; ukEu: number }
export interface RatesData { points: RatePoint[]; latest: { boe: number; boeDate: string; fed: number; ecb: number }; fetchedAt: string }

const DAY = 60 * 60 * 24;
const START = "2007-01";

type Series = Map<string, number>; // "YYYY-MM" -> last value that month

const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

/** Parses "date,value" CSV rows into month -> last value, skipping blanks and "." placeholders. */
export function monthlyLast(csv: string, toIso: (d: string) => string | null): { series: Series; lastDate: string | null } {
  const series: Series = new Map();
  let lastDate: string | null = null;
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [rawDate, rawValue] = line.split(",");
    const iso = toIso(rawDate?.trim() ?? "");
    const value = Number(rawValue);
    if (!iso || rawValue === undefined || rawValue.trim() === "" || rawValue.trim() === "." || !Number.isFinite(value)) continue;
    series.set(iso.slice(0, 7), value); // rows are in date order, so the last write per month wins
    lastDate = iso;
  }
  return { series, lastDate };
}

const fredDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
/** BoE dates look like "01 Oct 2026". */
export const boeDate = (d: string) => {
  const m = /^(\d{2}) (\w{3}) (\d{4})$/.exec(d);
  return m && MONTHS[m[2]] ? `${m[3]}-${MONTHS[m[2]]}-${m[1]}` : null;
};

/** Joins three monthly series from `start`, carrying the last known value forward (like pandas ffill). */
export function joinMonthly(boe: Series, fed: Series, ecb: Series, start = START): RatePoint[] {
  const months = [...new Set([...boe.keys(), ...fed.keys(), ...ecb.keys()])].filter((m) => m >= start).sort();
  const last = { boe: NaN, fed: NaN, ecb: NaN };
  const seed = (s: Series) => { let v = NaN; for (const [m, x] of s) if (m < start) v = x; return v; };
  last.boe = seed(boe); last.fed = seed(fed); last.ecb = seed(ecb);
  const out: RatePoint[] = [];
  for (const month of months) {
    last.boe = boe.get(month) ?? last.boe;
    last.fed = fed.get(month) ?? last.fed;
    last.ecb = ecb.get(month) ?? last.ecb;
    if ([last.boe, last.fed, last.ecb].some(Number.isNaN)) continue;
    out.push({ month, ...last, ukUs: +(last.boe - last.fed).toFixed(2), ukEu: +(last.boe - last.ecb).toFixed(2) });
  }
  return out;
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { next: { revalidate: DAY }, headers: { "User-Agent": "Mozilla/5.0 (BeforeYouSign hackathon prototype)" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

export async function getRates(): Promise<RatesData | null> {
  try {
    const [boeCsv, fedCsv, ecbCsv] = await Promise.all([
      getText("https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2006&Dateto=now&SeriesCodes=IUDBEDR&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N"),
      getText("https://fred.stlouisfed.org/graph/fredgraph.csv?id=FEDFUNDS"),
      getText("https://fred.stlouisfed.org/graph/fredgraph.csv?id=ECBDFR"),
    ]);
    const boe = monthlyLast(boeCsv, boeDate);
    const fed = monthlyLast(fedCsv, fredDate);
    const ecb = monthlyLast(ecbCsv, fredDate);
    const points = joinMonthly(boe.series, fed.series, ecb.series);
    if (points.length < 12 || !boe.lastDate) return null;
    const end = points[points.length - 1];
    return { points, latest: { boe: end.boe, boeDate: boe.lastDate, fed: end.fed, ecb: end.ecb }, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
