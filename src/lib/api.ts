import { productDNA } from "./dna";
import { explain, isProductType, moneyLabel, PRODUCTS, risks, simulate, type ProductType, type Values } from "./finance";

// The public "transparency layer": any site can send a product's terms and get the same Money Label back.
// Pure maths, no AI, no personal data.

export type LabelRequest = { type: ProductType; values: Values };

const MAX_NUMBER = 10_000_000;

/** Validates a request body. Unknown fields are dropped; missing ones take the product's standard values. */
export function parseLabelRequest(body: unknown): { ok: true; req: LabelRequest; defaulted: string[] } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON object: { type, values }." };
  const { type, values } = body as { type?: unknown; values?: unknown };
  if (!isProductType(type)) return { ok: false, error: `type must be one of: ${Object.keys(PRODUCTS).join(", ")}.` };
  const input = values && typeof values === "object" ? (values as Record<string, unknown>) : {};
  const out: Values = {};
  const defaulted: string[] = [];
  for (const f of PRODUCTS[type].fields) {
    const raw = input[f.id];
    if (raw === undefined || raw === null || raw === "") { out[f.id] = f.def; defaulted.push(f.id); continue; }
    if (f.type === "select") {
      if (!f.options?.some((o) => o[0] === raw)) return { ok: false, error: `${f.id} must be one of: ${f.options?.map((o) => o[0]).join(", ")}.` };
      out[f.id] = raw as string;
    } else {
      const x = Number(raw);
      if (!Number.isFinite(x) || x < 0 || x > MAX_NUMBER) return { ok: false, error: `${f.id} must be a number between 0 and ${MAX_NUMBER}.` };
      out[f.id] = x;
    }
  }
  return { ok: true, req: { type, values: out }, defaulted };
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function buildLabel({ type, values }: LabelRequest, defaulted: string[] = []) {
  const m = simulate(type, values);
  const label = moneyLabel(type, values, m);
  return {
    product: PRODUCTS[type].label,
    inputs: values,
    defaulted,
    summary: {
      regular_payment: r2(m.regular),
      first_3_months: r2(m.next3),
      total: m.never ? null : r2(m.total),
      cost_on_top: m.never ? null : r2(Math.max(0, m.onTop)),
      months: m.never ? null : m.end,
      never_cleared: m.never,
    },
    dna: productDNA(type, values, m, [], defaulted),
    label: { rows: label.rows, notes: label.notes, breakdown: label.parts.map((p) => ({ label: p.label, amount: r2(p.value) })) },
    risks: risks(type, values, m).map(({ lvl, title, body }) => ({ level: lvl, title, body })),
    plain_english: explain(type, values, m).map((p) => p.replace(/\*\*/g, "")),
    disclaimer: "Estimates from the figures supplied. Not financial advice.",
  };
}
