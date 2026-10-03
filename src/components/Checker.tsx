"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { dur, money } from "@/lib/format";
import {
  defaults, explain, GLOSSARY, isProductType, monthlyEquivalent, PRODUCT_TYPES, PRODUCTS, risks, RISK_LABEL,
  simulate, suggestName, visibleFields, type ProductType,
} from "@/lib/finance";
import { draftStore, MAX_SAVED, newOptionId, savedStore, type Draft } from "@/lib/store";
import { AskPanel } from "./AskPanel";
import { Chart, type Series } from "./Chart";
import { PasteFill } from "./PasteFill";

function Rich({ text }: { text: string }) {
  return <>{text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}</>;
}

export function Checker() {
  const params = useSearchParams();
  const urlType = params.get("type");
  const stored = draftStore.use();
  // The URL wins when someone arrives from a menu link for a different product.
  const draft: Draft = isProductType(urlType) && urlType !== stored.type
    ? { type: urlType, values: defaults(urlType), example: false }
    : stored;
  const { type, values: v } = draft;
  const product = PRODUCTS[type];

  const [filled, setFilled] = useState<string[]>([]);
  const [spare, setSpare] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const saved = savedStore.use();

  const commit = (next: Draft) => {
    draftStore.set(next);
    if (next.type !== urlType) window.history.replaceState(null, "", `?type=${next.type}`);
  };
  const pickType = (t: ProductType) => { if (t !== type) { setFilled([]); commit({ type: t, values: defaults(t), example: false }); } };
  const setField = (id: string, value: number | string) => {
    setFilled((f) => f.filter((x) => x !== id));
    commit({ type, values: { ...v, [id]: value }, example: false });
  };

  const m = simulate(type, v);
  const spareNum = Number(spare) || 0;
  const riskList = risks(type, v, m, spareNum);

  // Headline
  let headline: React.ReactNode, sub: string;
  if (product.credit) {
    if (m.never) {
      headline = <>You borrow {money(m.principal)}. <span className="soft">At this rate you never pay it off.</span></>;
      sub = "Your payment barely covers the interest. Try a bigger monthly amount.";
    } else {
      headline = <>You borrow {money(m.principal)}. <span className="soft">You pay back {money(m.total)} over {dur(m.end)}.</span></>;
      sub = m.onTop > 0.5 && m.principal > 0
        ? `That’s ${money(m.onTop)} on top, about ${Math.round((m.onTop / m.principal) * 100)}p for every £1 borrowed.`
        : "No interest or fees, as long as every payment is made on time.";
    }
  } else {
    headline = <>At {money(m.advertised, true)} a month it looks small. <span className="soft">Over {dur(m.end)} you pay {money(m.total)}.</span></>;
    sub = m.onTop > 0.5 ? `That’s ${money(m.onTop)} more than the advertised price suggests.` : "The price stays the same throughout.";
  }

  const fortnightly = type === "bnpl" && v.interval === "fortnight";
  const tiles: [string, string, string][] = [
    [type === "bnpl" ? "Each payment" : "Regular payment", money(m.regular, true), fortnightly ? "every two weeks" : "a month"],
    ["First 3 months", money(m.next3), "leaves your account soon"],
    ["Total you pay", m.never ? "Never ends" : money(m.total), m.never ? "not cleared in the time shown" : `over ${dur(m.end)}`],
    [product.credit ? "Cost of borrowing" : "Price rises & fees", m.never ? "—" : money(Math.max(0, m.onTop)), product.credit ? "interest and fees" : "above the advertised price"],
  ];

  const series: Series[] = [{ name: "Total paid", fill: true, pts: m.s.map((p) => ({ t: p.t, y: p.cum })) }];
  if (product.credit && m.s.some((p) => p.bal > 0)) {
    series.push({ name: "Still owed", kind: "line", dash: "1 5", pts: [{ t: 0, y: m.principal }, ...m.s.map((p) => ({ t: p.t, y: p.bal }))] });
  }

  const context = () => {
    const fields = visibleFields(type, v).map((f) => {
      const val = f.type === "select" ? f.options?.find((o) => o[0] === v[f.id])?.[1] : `${f.pre ?? ""}${v[f.id]}${f.post ? " " + f.post : ""}`;
      return `${f.label}: ${val}`;
    }).join("\n");
    return [
      `PRODUCT: ${product.label}`,
      `DETAILS ENTERED:\n${fields}`,
      `CALCULATED:`,
      `Regular payment: ${money(m.regular, true)}`,
      `First 3 months: ${money(m.next3)}`,
      `Total paid: ${m.never ? "never cleared in the time shown" : money(m.total)}`,
      `Time to finish: ${m.never ? "more than the time shown" : dur(m.end)}`,
      product.credit ? `Amount borrowed: ${money(m.principal)}\nInterest: ${money(m.interest)}\nFees: ${money(m.fees)}` : `Above advertised price: ${money(m.onTop)}`,
      `WARNINGS SHOWN: ${riskList.map((r) => r.title).join("; ")}`,
    ].join("\n");
  };

  const save = () => {
    if (saved.length >= MAX_SAVED) { setSaveMsg(`You can compare up to ${MAX_SAVED}. Remove one on the Compare page first.`); return; }
    savedStore.set([...saved, { id: newOptionId(), name: saveName.trim() || suggestName(type, v), type, values: { ...v } }]);
    setSaveName("");
    setSaveMsg("Added. See it on the Compare page.");
  };

  return (
    <div className="container section" style={{ paddingTop: 48 }}>
      <div className="tool">
        <aside className="tool-form" aria-label="Product details">
          <div className="stack">
            <p className="caption">Step 1 · What are you looking at?</p>
            <div className="type-pills" role="group" aria-label="Product type">
              {PRODUCT_TYPES.map((t) => (
                <button key={t} type="button" className="type-pill" aria-pressed={t === type} onClick={() => pickType(t)}>{PRODUCTS[t].label}</button>
              ))}
            </div>
          </div>

          <div className="stack">
            <p className="caption">Step 2 · Enter the details</p>
            <div className="fields">
              {visibleFields(type, v).map((f) => (
                <div key={f.id} className={`field${filled.includes(f.id) ? " filled" : ""}`}>
                  <label htmlFor={`f-${f.id}`}>{f.label}</label>
                  <div className="input">
                    {f.pre && <span>{f.pre}</span>}
                    {f.type === "select" ? (
                      <select id={`f-${f.id}`} value={String(v[f.id])} onChange={(e) => setField(f.id, e.target.value)}>
                        {f.options?.map(([val, l]) => <option key={val} value={val}>{l}</option>)}
                      </select>
                    ) : (
                      <input id={`f-${f.id}`} type="number" inputMode="decimal" min={0} step={f.step ?? 1}
                        value={v[f.id] ?? ""} onChange={(e) => setField(f.id, e.target.value === "" ? 0 : Number(e.target.value))} />
                    )}
                    {f.post && <span>{f.post}</span>}
                  </div>
                  {f.help && <p className="help">{f.help}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="stack anchor-target" id="afford">
            <p className="caption">Step 3 · Can it fit your month? (optional)</p>
            <div className="field">
              <label htmlFor="spare">Money left after bills each month</label>
              <div className="input"><span>£</span><input id="spare" type="number" min={0} step={10} inputMode="decimal" placeholder="e.g. 250" value={spare} onChange={(e) => setSpare(e.target.value)} /></div>
              <p className="help">Only used on this page to compare against the payment. It isn’t saved or sent anywhere.</p>
            </div>
          </div>

          <PasteFill onFill={(t, vals, ids) => { setFilled(ids); commit({ type: t, values: vals, example: false }); }} />
        </aside>

        <div className="results" aria-live="polite">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="pill-label">{draft.example ? "Example: paying for a £1,200 laptop" : `${product.label} · your figures`}</span>
            <button type="button" className="link small" onClick={() => { setFilled([]); commit({ type, values: defaults(type), example: false }); }}>Reset to standard values</button>
          </div>
          <h1 className="headline">{headline}</h1>
          <p className="lead" style={{ color: "var(--color-graphite)" }}>{sub}</p>

          <div className="tiles">
            {tiles.map(([label, val, desc], i) => (
              <div key={label} className={`tile${i === 2 ? " emph" : ""}`}>
                <span className="caption">{label}</span>
                <span className="v">{val}</span>
                <span className="small muted">{desc}</span>
              </div>
            ))}
          </div>

          <section className="card stack" aria-labelledby="chart-title">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 id="chart-title" className="h3">Where your money goes over time</h2>
              <div className="legend">
                <span><i />Total paid</span>
                <span><i style={{ borderTop: "10px solid #c9c9cd" }} />{product.credit ? "Paid above what you borrowed" : "Paid above advertised price"}</span>
                {series[1] && <span><i style={{ borderTopStyle: "dotted", borderColor: "#717173" }} />Still owed</span>}
              </div>
            </div>
            <Chart series={series} refLine={{ y: product.credit ? m.principal : m.headlineTotal, label: product.credit ? "Borrowed" : "Advertised price" }} label="Total amount paid over time" />
          </section>

          <div className="grid-2">
            <section className="card plain" aria-labelledby="plain-title">
              <h2 id="plain-title" className="h3" style={{ marginBottom: 14 }}>In plain English</h2>
              {explain(type, v, m).map((p, i) => <p key={i}><Rich text={p} /></p>)}
              <dl className="gloss">
                {GLOSSARY[type].map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
              </dl>
            </section>
            <section className="card" aria-labelledby="risk-title">
              <h2 id="risk-title" className="h3" style={{ marginBottom: 14 }}>Check before you sign</h2>
              <ul className="risks">
                {riskList.map((r) => (
                  <li key={r.title} className="risk">
                    <span className={`sev ${r.lvl}`}>{RISK_LABEL[r.lvl]}</span>
                    <b>{r.title}</b>
                    <p>{r.body}</p>
                  </li>
                ))}
              </ul>
              {spareNum > 0 && (
                <p className="small muted" style={{ marginTop: 12 }}>
                  About {money(monthlyEquivalent(type, v, m))} a month against {money(spareNum)} spare.
                </p>
              )}
            </section>
          </div>

          <AskPanel key={type} type={type} context={context} />

          <div className="save-bar">
            <div className="input">
              <label htmlFor="save-name" className="sr-only">Name this option</label>
              <input id="save-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder={suggestName(type, v)} />
            </div>
            <button type="button" className="btn btn-dark" onClick={save}>Add to comparison</button>
            {saveMsg && <p className="small" role="status" style={{ flexBasis: "100%" }}>{saveMsg} {saveMsg.startsWith("Added") && <Link href="/compare">Open Compare</Link>}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
