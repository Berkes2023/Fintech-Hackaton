import { createPartFromBase64, type Part } from "@google/genai";
import { aiConfigured, classify, EXTRACT_SYSTEM, gemini, MODEL, MODEL_HEADER, requestSignal, thinkingFor } from "@/lib/ai";
import { forGemini, validateExtraction } from "@/lib/extraction";
import { PRODUCT_TYPES, PRODUCTS } from "@/lib/finance";

const MAX_TEXT = 8000;
/** Base64 is ~4/3 the file size; Vercel caps request bodies at 4.5 MB, so files must be under ~3 MB. */
const MAX_FILE_B64 = 4_000_000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const CONDITION_KINDS = ["variable_rate", "late_fee", "promo_ends", "auto_renewal", "early_repayment_charge", "price_rise", "exit_fee", "credit_check", "other"];
const str = (description: string) => ({ type: "string", description });

// Every field is required (structured outputs need that); "not stated" is an empty string.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["product", "values", "conditions", "contradictions", "prominence", "claim", "stated", "document_text"],
  properties: {
    product: { type: "string", enum: PRODUCT_TYPES },
    values: {
      type: "array",
      description: "One entry per field id that is stated in the document.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "value", "quote", "confidence"],
        properties: {
          id: { type: "string" },
          value: str("A plain number (no £ or %), or an option value for select fields."),
          quote: str("The exact words from the document this value comes from, copied verbatim, under 160 characters."),
          confidence: { type: "string", enum: ["high", "medium", "low"], description: "high = stated outright; medium = stated but indirectly (e.g. in a table or footnote); low = ambiguous wording" },
        },
      },
    },
    conditions: {
      type: "array",
      description: "Every condition that could cost money or limit flexibility: variable rates, fees, promotional periods ending, automatic renewal, early repayment charges, price rises, credit checks.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "title", "plain", "why", "quote", "confidence"],
        properties: {
          kind: { type: "string", enum: CONDITION_KINDS },
          title: str("A short heading, e.g. 'Variable rate'."),
          plain: str("One plain-English sentence on what the clause means. Explain, never advise."),
          why: str("One sentence on why it could matter to the person's costs or flexibility."),
          quote: str("The exact words from the document, verbatim, under 200 characters."),
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
    contradictions: {
      type: "array",
      description: "Places where a headline or prominent claim gives a different impression from the full terms (e.g. '0% interest' vs '0% for 3 months, then 29.9% APR'). Describe neutrally; never accuse.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["headline", "headline_quote", "full_terms", "terms_quote"],
        properties: {
          headline: str("What the headline suggests, in plain words."),
          headline_quote: str("The headline's exact words."),
          full_terms: str("What the full terms say, in plain words."),
          terms_quote: str("The exact words from the full terms."),
        },
      },
    },
    prominence: {
      type: "object",
      additionalProperties: false,
      required: ["monthly_payment", "total_payable", "length", "interest_rate", "fees"],
      description: "How prominently each fact is presented: in a headline or large text, in normal body text, only in small print or footnotes, or not at all.",
      properties: Object.fromEntries(["monthly_payment", "total_payable", "length", "interest_rate", "fees"].map((k) => [k, { type: "string", enum: ["headline", "body", "small_print", "absent"] }])),
    },
    claim: str("The most prominent marketing claim, verbatim (e.g. 'ONLY £99 A MONTH!'), or empty if there is none."),
    stated: {
      type: "object",
      additionalProperties: false,
      required: ["monthly", "monthly_quote", "total", "total_quote"],
      properties: {
        monthly: str("The monthly or regular payment the document states, as a plain number, or empty."),
        monthly_quote: str("Its exact words, or empty."),
        total: str("The total amount payable the document states, as a plain number, or empty."),
        total_quote: str("Its exact words, or empty."),
      },
    },
    document_text: str("For an attached file only: a faithful transcription of the document text, up to 3,000 characters. Empty when the text was pasted."),
  },
};

const fieldSpec = PRODUCT_TYPES.map((t) =>
  `${t}: ${PRODUCTS[t].fields.map((f) => `${f.id}${f.options ? ` (${f.options.map((o) => o[0]).join("|")})` : ""} = ${f.label}`).join("; ")}`,
).join("\n");

const INSTRUCTIONS = `Products and their field ids:\n${fieldSpec}\n\nTreat a BNPL or "pay monthly" plan with fixed instalments as bnpl, and other fixed-term finance as loan. Only include a value if the document states it, with its exact source words and a confidence. Never fill in a value the document leaves out. Copy quotes character for character so they can be found in the text.`;

interface FileIn { type: string; data: string }

function documentPart(file: FileIn): Part | null {
  if (file.data.length > MAX_FILE_B64 || !/^[A-Za-z0-9+/=]+$/.test(file.data)) return null;
  if (file.type !== "application/pdf" && !(IMAGE_TYPES as readonly string[]).includes(file.type)) return null;
  return createPartFromBase64(file.data, file.type);
}

const BLOCKED = ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"];
const STATUS = { rate_limited: 429, timeout: 504, bad_request: 400, model_unavailable: 502, upstream: 502 } as const;
const GEMINI_SCHEMA = forGemini(SCHEMA);

export async function POST(req: Request) {
  if (!aiConfigured()) return Response.json({ error: "not_configured" }, { status: 503, headers: MODEL_HEADER });
  const body = (await req.json().catch(() => null)) as { text?: unknown; file?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
  const fileIn = body?.file as FileIn | undefined;
  const file = fileIn && typeof fileIn.type === "string" && typeof fileIn.data === "string" ? documentPart(fileIn) : null;
  if (fileIn && !file) return Response.json({ error: "bad_file" }, { status: 400, headers: MODEL_HEADER });
  if (!text && !file) return Response.json({ error: "bad_request" }, { status: 400, headers: MODEL_HEADER });

  const parts: Part[] = [];
  if (file) parts.push(file);
  parts.push({ text: `${INSTRUCTIONS}${text ? `\n\n<pasted_text>\n${text}\n</pasted_text>` : "\n\nThe document is attached above."}` });

  const signal = requestSignal(req);
  try {
    const res = await gemini().models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: EXTRACT_SYSTEM,
        responseMimeType: "application/json",
        responseJsonSchema: GEMINI_SCHEMA,
        temperature: 0,
        maxOutputTokens: 8192,
        thinkingConfig: thinkingFor(MODEL),
        abortSignal: signal,
      },
    });
    const finish = res.candidates?.[0]?.finishReason;
    if (res.promptFeedback?.blockReason || (finish && BLOCKED.includes(finish))) return Response.json({ error: "refused" }, { status: 422, headers: MODEL_HEADER });
    if (!res.text) return Response.json({ error: "upstream" }, { status: STATUS.upstream, headers: MODEL_HEADER });
    // Validate before the UI sees anything: malformed or invented structure is dropped here.
    const clean = validateExtraction(JSON.parse(res.text));
    if (!clean) return Response.json({ error: "invalid_json" }, { status: 502, headers: MODEL_HEADER });
    return Response.json(clean, { headers: MODEL_HEADER });
  } catch (err) {
    if (err instanceof SyntaxError) return Response.json({ error: "invalid_json" }, { status: 502, headers: MODEL_HEADER });
    const code = classify(err, signal);
    if (code === "bad_request") return Response.json({ error: file ? "bad_file" : "bad_request" }, { status: 400, headers: MODEL_HEADER });
    return Response.json({ error: code }, { status: STATUS[code], headers: MODEL_HEADER });
  }
}
