"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { dur, money } from "@/lib/format";
import {
  defaults, explain, fieldLabel, GLOSSARY, isProductType, moneyLabel, monthlyEquivalent, PRODUCT_TYPES, PRODUCTS,
  risks, RISK_LABEL, simulate, suggestName, understandingCheck, visibleFields, type ProductType,
} from "@/lib/finance";
import { productDNA, questionsToAsk } from "@/lib/dna";
import type { Mark } from "@/lib/highlight";
import { commitmentsStore, draftStore, MAX_COMMITMENTS, MAX_SAVED, newOptionId, savedStore, thisMonth, type Draft } from "@/lib/store";
import { AskPanel } from "./AskPanel";
import { Chart, type Series } from "./Chart";
import { ClaimReality } from "./ClaimReality";
import { CommitCheck } from "./CommitCheck";
import { CostScanner } from "./CostScanner";
import { DigitalTwin } from "./DigitalTwin";
import { DocumentPanel } from "./DocumentPanel";
import { FuturePayments } from "./FuturePayments";
import { PresentationCheck } from "./PresentationCheck";
import { ProductDNACard } from "./ProductDNACard";
import { Questions } from "./Questions";
import { MoneyLabelCard } from "./MoneyLabelCard";
import { PasteFill, type FillResult } from "./PasteFill";
import { StressTest, type Budget } from "./StressTest";
import { WhatIf } from "./WhatIf";
import { WhyNumber } from "./WhyNumber";

type Extracted = Omit<FillResult, "type" | "values">;

const CONFIDENCE = { high: "High confidence", medium: "Medium confidence", low: "Low confidence: check this" } as const;

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

  // What AI read from a document: which fields it filled, the words behind each, and what was missing.
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [detailed, setDetailed] = useState(true);
  const [budget, setBudget] = useState<Budget>({ income: "", essentials: "", existing: "" });
  const [saveName, setSaveName] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const saved = savedStore.use();
  const commitments = commitmentsStore.use();
  const filled = extracted?.filled ?? [];
  const missing = extracted?.missing ?? [];

  const commit = (next: Draft) => {
    draftStore.set(next);
    if (next.type !== urlType) window.history.replaceState(null, "", `?type=${next.type}`);
  };
  const clearDoc = () => { setExtracted(null); setActive(null); };
  const pickType = (t: ProductType) => { if (t !== type) { clearDoc(); commit({ type: t, values: defaults(t), example: false }); } };
  const setField = (id: string, value: number | string) => {
    // Once someone types a value it's theirs: drop the AI highlight, quote and "missing" flag for that field.
    setExtracted((x) => x && {
      ...x,
      filled: x.filled.filter((f) => f !== id),
      missing: x.missing.filter((f) => f !== id),
      evidence: Object.fromEntries(Object.entries(x.evidence).filter(([k]) => k !== id)),
    });
    commit({ type, values: { ...v, [id]: value }, example: false });
  };
  const show = (key: string) => {
    // Re-selecting the same quote should still scroll to it, so clear first.
    setActive(null);
    requestAnimationFrame(() => setActive(key));
  };

  const m = simulate(type, v);
  const income = Number(budget.income) || 0;
  const spare = income > 0 ? income - (Number(budget.essentials) || 0) - (Number(budget.existing) || 0) : 0;
  const riskList = risks(type, v, m, spare);
  const label = moneyLabel(type, v, m);
  const shownRisks = detailed ? riskList : riskList.filter((r) => r.lvl !== "info");
  const paragraphs = explain(type, v, m);
  const fortnightly = type === "bnpl" && v.interval === "fortnight";
  const perLabel = fortnightly ? "every two weeks" : "a month";
  const missingLabels = missing.map((id) => fieldLabel(type, id));

  const marks: Mark[] = extracted
    ? [
        ...Object.entries(extracted.evidence).map(([id, e]) => ({ key: `f-${id}`, quote: e.quote })),
        ...extracted.conditions.map((c, i) => ({ key: `cond-${i}`, quote: c.quote })),
        ...(extracted.claim ? [{ key: "claim", quote: extracted.claim }] : []),
        ...extracted.contradictions.flatMap((c, i) => [{ key: `hl-${i}`, quote: c.headline_quote }, { key: `tm-${i}`, quote: c.terms_quote }]),
        ...(extracted.stated.monthlyQuote ? [{ key: "stated-monthly", quote: extracted.stated.monthlyQuote }] : []),
        ...(extracted.stated.totalQuote ? [{ key: "stated-total", quote: extracted.stated.totalQuote }] : []),
      ].filter((x) => x.quote)
    : [];

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

  const tiles: [string, string, string][] = [
    [type === "bnpl" ? "Each payment" : "Regular payment", money(m.regular, true), perLabel],
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
    const lines = [
      `PRODUCT: ${product.label}`,
      `DETAILS ENTERED:\n${fields}`,
      `CALCULATED:`,
      `Regular payment: ${money(m.regular, true)}`,
      `First 3 months: ${money(m.next3)}`,
      `Total paid: ${m.never ? "never cleared in the time shown" : money(m.total)}`,
      `Time to finish: ${m.never ? "more than the time shown" : dur(m.end)}`,
      product.credit ? `Amount borrowed: ${money(m.principal)}\nInterest: ${money(m.interest)}\nFees: ${money(m.fees)}` : `Above advertised price: ${money(m.onTop)}`,
      `WARNINGS SHOWN: ${riskList.map((r) => r.title).join("; ")}`,
    ];
    if (extracted) {
      const quotes = Object.entries(extracted.evidence).map(([id, e]) => `${fieldLabel(type, id)}: "${e.quote}"`);
      lines.push(`QUOTES FROM THE PROVIDER'S DOCUMENT (field: exact words):\n${quotes.join("\n") || "none"}`);
      for (const c of extracted.conditions) lines.push(`Condition (${c.title}): "${c.quote}"`);
      if (extracted.claim) lines.push(`Advert headline: "${extracted.claim}"`);
      if (missing.length) lines.push(`NOT STATED IN THE DOCUMENT (standard values used instead): ${missingLabels.join(", ")}`);
      if (extracted.source.length > 40) lines.push(`DOCUMENT TEXT (excerpt, personal details removed):\n${extracted.source.slice(0, 2500)}`);
    } else {
      lines.push("No document was provided: the figures were typed in by the person.");
    }
    return lines.join("\n");
  };

  const kinds = extracted?.conditions.map((c) => c.kind) ?? [];
  const dna = productDNA(type, v, m, kinds, missingLabels);
  const questions = questionsToAsk(type, v, { missing, conditionKinds: kinds, fromDocument: !!extracted, statedTotal: !!extracted?.stated.total });

  const addCommitment = () => {
    if (commitments.length >= MAX_COMMITMENTS) { setSaveMsg(`Your map holds up to ${MAX_COMMITMENTS}. Remove one on the Commitment map first.`); return; }
    commitmentsStore.set([...commitments, { id: newOptionId(), name: saveName.trim() || suggestName(type, v), type, values: { ...v } }]);
    setSaveName("");
    setSaveMsg("Added to your commitment map.");
  };

  const save = () => {
    if (saved.length >= MAX_SAVED) { setSaveMsg(`You can compare up to ${MAX_SAVED}. Remove one on the Compare page first.`); return; }
    savedStore.set([...saved, { id: newOptionId(), name: saveName.trim() || suggestName(type, v), type, values: { ...v } }]);
    setSaveName("");
    setSaveMsg("Added. See it on the Compare page.");
  };

  const onFill = (r: FillResult) => {
    const { type: t, values, ...rest } = r;
    setExtracted(rest);
    setActive(null);
    commit({ type: t, values, example: false });
    // The "aha" moment: jump straight to the decoded result.
    requestAnimationFrame(() => document.getElementById("results-top")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="container section" style={{ paddingTop: 48 }}>
      <div className="tool">
        <aside className="tool-form" aria-label="Product details">
          <PasteFill onFill={onFill} />

          <div className="stack">
            <p className="caption">Or choose a product and type the details</p>
            <div className="type-pills" role="group" aria-label="Product type">
              {PRODUCT_TYPES.map((t) => (
                <button key={t} type="button" className="type-pill" aria-pressed={t === type} onClick={() => pickType(t)}>{PRODUCTS[t].label}</button>
              ))}
            </div>
          </div>

          <div className="fields">
            {visibleFields(type, v).map((f) => {
              const ev = extracted?.evidence[f.id];
              return (
                <div key={f.id} className={`field${filled.includes(f.id) ? " filled" : ""}${missing.includes(f.id) ? " missing" : ""}`}>
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
                  {ev && (
                    <div className="quote">
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <span className={`conf ${ev.confidence}`}>{CONFIDENCE[ev.confidence]}</span>
                        <button type="button" className="link small" onClick={() => show(`f-${f.id}`)}>Show me where</button>
                      </div>
                      “{ev.quote}”
                    </div>
                  )}
                  {missing.includes(f.id) && <p className="help"><b>Not in the document.</b> A standard value is shown: ask the provider for the real one.</p>}
                  {detailed && f.help && <p className="help">{f.help}</p>}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="results" aria-live="polite">
          <div className="row anchor-target" id="results-top" style={{ justifyContent: "space-between" }}>
            <span className="pill-label">{draft.example ? "Example: paying for a £1,200 laptop" : extracted ? `${product.label} · decoded from your document` : `${product.label} · your figures`}</span>
            <div className="row">
              <div className="view-switch">
                <div className="segmented" role="group" aria-label="How much to show">
                  <button type="button" aria-pressed={!detailed} onClick={() => setDetailed(false)} title="Key costs and things to know">Quick view</button>
                  <button type="button" aria-pressed={detailed} onClick={() => setDetailed(true)} title="All costs, assumptions, terms and calculations">Full breakdown</button>
                </div>
                <span className="small muted">{detailed ? "All costs, assumptions, terms and calculations." : "Key costs and things to know."} Same numbers either way.</span>
              </div>
              <button type="button" className="link small quiet" onClick={() => { if (!window.confirm("Reset these figures to the defaults?")) return; clearDoc(); commit({ type, values: defaults(type), example: false }); }}>Reset</button>
            </div>
          </div>

          {missing.length > 0 && (
            <div className="missing-banner" role="alert">
              <b>We can’t work out the real cost from this document alone.</b>
              <p className="small">
                It doesn’t say: {missingLabels.join(", ")}. The figures below use standard values so you can explore, but they’re only an estimate. Ask the provider for these before you commit.
              </p>
            </div>
          )}

          <h1 className="headline">{headline}</h1>
          <p className="lead" style={{ color: "var(--color-graphite)" }}>{sub}</p>

          <div className="tiles">
            {tiles.map(([title, val, desc], i) => (
              <div key={title} className={`tile${i === 2 ? " emph" : ""}`}>
                <span className="caption">{title}</span>
                <span className="v">{val}</span>
                <span className="small muted">{desc}</span>
              </div>
            ))}
          </div>

          {extracted && (
            <ClaimReality claim={extracted.claim} m={m} credit={product.credit} missing={missingLabels} stated={extracted.stated} onShow={show} />
          )}

          {extracted && <PresentationCheck contradictions={extracted.contradictions} prominence={extracted.prominence} onShow={show} />}

          {extracted && (extracted.conditions.length > 0 || extracted.source) && (
            <div className="grid-2 doc-row">
              <CostScanner conditions={extracted.conditions} onShow={show} />
              <DocumentPanel source={extracted.source} marks={marks} active={active} redactions={extracted.redactions} />
            </div>
          )}

          {/* The checkpoint sits on its own line so changing product types never leaves a gap beside it. */}
          <CommitCheck key={type} type={type} m={m} risks={riskList} check={understandingCheck(type, v, m)} perLabel={perLabel} onSave={save} />

          {(() => {
            const why = detailed ? <WhyNumber type={type} v={v} m={m} /> : null;
            return (
              <div className={why && product.credit && !m.never ? "label-row" : "label-row single"}>
                <MoneyLabelCard label={label} product={product.label} estimate={missingLabels} />
                {why}
              </div>
            );
          })()}

          <div className="grid-2">
            <ProductDNACard dna={dna} />
            <Questions questions={questions} />
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

          <FuturePayments m={m} start={thisMonth()} perLabel={perLabel} />
          <DigitalTwin key={`twin-${type}`} type={type} v={v} />
          <WhatIf key={`${type}-${String(v.payType)}`} type={type} v={v} base={m} onApply={setField} />
          <StressTest budget={budget} onChange={setBudget} payment={monthlyEquivalent(type, v, m)} perLabel={perLabel} />

          <div className="grid-2">
            <section className="card plain" aria-labelledby="plain-title">
              <h2 id="plain-title" className="h3" style={{ marginBottom: 14 }}>In plain English</h2>
              {(detailed ? paragraphs : paragraphs.slice(0, 2)).map((p, i) => <p key={i}><Rich text={p} /></p>)}
              {detailed && (
                <dl className="gloss">
                  {GLOSSARY[type].map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
                </dl>
              )}
            </section>
            <section className="card" aria-labelledby="risk-title">
              <h2 id="risk-title" className="h3" style={{ marginBottom: 14 }}>Check before you sign</h2>
              <ul className="risks">
                {shownRisks.map((r) => (
                  <li key={r.title} className="risk">
                    <span className={`sev ${r.lvl}`}>{RISK_LABEL[r.lvl]}</span>
                    <b>{r.title}</b>
                    <p>{r.body}</p>
                  </li>
                ))}
                {shownRisks.length === 0 && <li className="risk"><p>Nothing stands out. Switch to Detailed to see everything worth knowing.</p></li>}
              </ul>
            </section>
          </div>

          <AskPanel key={type} type={type} context={context} hasDocument={!!extracted} />

          <div className="save-bar">
            <div className="input">
              <label htmlFor="save-name" className="sr-only">Name this option</label>
              <input id="save-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder={suggestName(type, v)} />
            </div>
            <button type="button" className="btn btn-dark" onClick={save}>Add to comparison</button>
            <button type="button" className="btn btn-light" onClick={addCommitment}>I already pay this</button>
            {saveMsg && (
              <p className="small" role="status" style={{ flexBasis: "100%" }}>
                {saveMsg} {saveMsg.startsWith("Added. See") && <Link href="/compare">Open Compare</Link>}
                {saveMsg.startsWith("Added to your") && <Link href="/commitments">Open your commitment map</Link>}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
