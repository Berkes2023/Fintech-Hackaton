import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, anthropic, EXTRACT_SYSTEM, FALLBACK_BETA, MODEL } from "@/lib/ai";
import { PRODUCT_TYPES, PRODUCTS } from "@/lib/finance";

const MAX_TEXT = 8000;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["product", "values", "missing", "unusual"],
  properties: {
    product: { type: "string", enum: PRODUCT_TYPES },
    values: {
      type: "array",
      description: "One entry per field id that is stated in the text.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "value"],
        properties: {
          id: { type: "string" },
          value: { type: "string", description: "A plain number (no £ or %), or an option value for select fields." },
        },
      },
    },
    missing: { type: "array", items: { type: "string" }, description: "Labels of important fields the text does not state." },
    unusual: { type: "array", items: { type: "string" }, description: "Up to 3 short plain-English notes about terms worth checking." },
  },
};

const fieldSpec = PRODUCT_TYPES.map((t) =>
  `${t}: ${PRODUCTS[t].fields.map((f) => `${f.id}${f.options ? ` (${f.options.map((o) => o[0]).join("|")})` : ""} = ${f.label}`).join("; ")}`,
).join("\n");

export async function POST(req: Request) {
  if (!aiConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    const res = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: EXTRACT_SYSTEM,
      messages: [{
        role: "user",
        content: `Products and their field ids:\n${fieldSpec}\n\nTreat a BNPL or "pay monthly" plan with fixed instalments as bnpl, and other fixed-term finance as loan.\n\n<pasted_text>\n${text.slice(0, MAX_TEXT)}\n</pasted_text>`,
      }],
    });
    if (res.stop_reason === "refusal") return Response.json({ error: "refused" }, { status: 422 });
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return Response.json({ error: "empty" }, { status: 502 });
    return Response.json(JSON.parse(block.text));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return Response.json({ error: "rate_limited" }, { status: 429 });
    if (err instanceof SyntaxError) return Response.json({ error: "invalid_json" }, { status: 502 });
    if (err instanceof Anthropic.APIError) return Response.json({ error: "upstream" }, { status: 502 });
    throw err;
  }
}
