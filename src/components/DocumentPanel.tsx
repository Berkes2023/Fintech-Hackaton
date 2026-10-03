"use client";

import { useEffect, useRef } from "react";
import { segments, type Mark } from "@/lib/highlight";
import type { Redaction } from "@/lib/privacy";

/** The document as the AI saw it, with every quoted sentence marked. "Show me where" lights one up. */
export function DocumentPanel({ source, marks, active, redactions }: { source: string; marks: Mark[]; active: string | null; redactions: Redaction[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current?.querySelector<HTMLElement>(`mark[data-key="${CSS.escape(active)}"]`);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);

  if (!source.trim()) return null;
  const segs = segments(source, marks);
  const found = new Set(segs.filter((s) => s.key).map((s) => s.key));
  const activeMissing = active && !found.has(active);

  return (
    <section className="card stack anchor-target" id="document" ref={ref} aria-labelledby="doc-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="doc-title" className="h3">Your document</h2>
        <span className="small muted">Highlighted: everything we used</span>
      </div>
      {redactions.length > 0 && (
        <p className="privacy small">
          <b>Privacy shield:</b> removed {redactions.map((r) => `${r.count} ${r.kind}${r.count > 1 ? "s" : ""}`).join(", ")} before the AI saw this.
        </p>
      )}
      <div className="doc-text">
        {segs.map((s, i) => s.key
          ? <mark key={i} data-key={s.key} className={s.key === active ? "active" : undefined}>{s.text}</mark>
          : <span key={i}>{s.text}</span>)}
      </div>
      {activeMissing && <p className="small" role="status">We couldn’t find that exact wording in the text above. Check the original document.</p>}
    </section>
  );
}
