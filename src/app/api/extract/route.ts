import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, anthropic, EXTRACT_SYSTEM, FALLBACK_BETA, MODEL } from "@/lib/ai";
import { PRODUCT_TYPES, PRODUCTS } from "@/lib/finance";

const MAX_TEXT = 8000;
/** Base64 is ~4/3 the file size; Vercel caps request bodies at 4.5 MB, so files must be under ~3 MB. */
const MAX_FILE_B64 = 4_000_000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["product", "values", "missing", "unusual"],
  properties: {
    product: { type: "string", enum: PRODUCT_TYPES },
    values: {
      type: "array",
      description: "One entry per field id that is stated in the document.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "value", "quote"],
        properties: {
          id: { type: "string" },
          value: { type: "string", description: "A plain number (no £ or %), or an option value for select fields." },
          quote: { type: "string", description: "The exact words from the document this value comes from, copied verbatim, under 160 characters." },
        },
      },
    },
    missing: { type: "array", items: { type: "string" }, description: "Field ids that matter for the total cost but are not stated." },
    unusual: {
      type: "array",
      description: "Up to 3 terms worth checking (variable rates, early repayment charges, penalties), each with its exact source words.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["note", "quote"],
        properties: { note: { type: "string" }, quote: { type: "string" } },
      },
    },
  },
};

const fieldSpec = PRODUCT_TYPES.map((t) =>
  `${t}: ${PRODUCTS[t].fields.map((f) => `${f.id}${f.options ? ` (${f.options.map((o) => o[0]).join("|")})` : ""} = ${f.label}`).join("; ")}`,
).join("\n");

const INSTRUCTIONS = `Products and their field ids:\n${fieldSpec}\n\nTreat a BNPL or "pay monthly" plan with fixed instalments as bnpl, and other fixed-term finance as loan. Only include a value if the document states it; give the exact source words for each. List required-but-absent fields in "missing" rather than guessing.`;

interface FileIn { type: string; data: string }

function documentBlock(file: FileIn): Anthropic.Beta.BetaContentBlockParam | null {
  if (file.data.length > MAX_FILE_B64 || !/^[A-Za-z0-9+/=]+$/.test(file.data)) return null;
  if (file.type === "application/pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } };
  if ((IMAGE_TYPES as readonly string[]).includes(file.type)) return { type: "image", source: { type: "base64", media_type: file.type as ImageType, data: file.data } };
  return null;
}

export async function POST(req: Request) {
  if (!aiConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; file?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
  const fileIn = body?.file as FileIn | undefined;
  const file = fileIn && typeof fileIn.type === "string" && typeof fileIn.data === "string" ? documentBlock(fileIn) : null;
  if (fileIn && !file) return Response.json({ error: "bad_file" }, { status: 400 });
  if (!text && !file) return Response.json({ error: "bad_request" }, { status: 400 });

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (file) content.push(file);
  content.push({ type: "text", text: `${INSTRUCTIONS}${text ? `\n\n<pasted_text>\n${text}\n</pasted_text>` : "\n\nThe document is attached above."}` });

  try {
    const res = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: EXTRACT_SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") return Response.json({ error: "refused" }, { status: 422 });
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return Response.json({ error: "empty" }, { status: 502 });
    return Response.json(JSON.parse(block.text));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return Response.json({ error: "rate_limited" }, { status: 429 });
    if (err instanceof SyntaxError) return Response.json({ error: "invalid_json" }, { status: 502 });
    if (err instanceof Anthropic.BadRequestError) return Response.json({ error: "bad_file" }, { status: 400 });
    if (err instanceof Anthropic.APIError) return Response.json({ error: "upstream" }, { status: 502 });
    throw err;
  }
}
