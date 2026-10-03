import type { Content, GenerateContentResponse } from "@google/genai";
import { aiConfigured, classify, EXPLAIN_SYSTEM, gemini, MODEL, MODEL_HEADER, requestSignal, thinkingFor } from "@/lib/ai";

interface Turn { role: "user" | "assistant"; content: string }

const MAX_CONTEXT = 9000;
const MAX_TURN = 1500;
const MAX_TURNS = 8;
const BLOCKED = ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"];

function parse(body: unknown): { context: string; turns: Turn[] } | null {
  if (!body || typeof body !== "object") return null;
  const { context, messages } = body as { context?: unknown; messages?: unknown };
  if (typeof context !== "string" || !Array.isArray(messages) || !messages.length) return null;
  const turns: Turn[] = [];
  for (const m of messages.slice(-MAX_TURNS)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.trim()) return null;
    turns.push({ role: m.role, content: m.content.slice(0, MAX_TURN) });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return null;
  return { context: context.slice(0, MAX_CONTEXT), turns };
}

const STATUS = { rate_limited: 429, timeout: 504, bad_request: 400, model_unavailable: 502, upstream: 502 } as const;

export async function POST(req: Request) {
  if (!aiConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const input = parse(await req.json().catch(() => null));
  if (!input) return Response.json({ error: "bad_request" }, { status: 400 });

  // Gemini uses "user" / "model" roles. The page data rides along in the first user turn.
  const contents: Content[] = input.turns.map((t, i) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: i === 0 ? `PAGE DATA (recalculated for this question):\n${input.context}\n\nQUESTION:\n${t.content}` : t.content }],
  }));

  const signal = requestSignal(req);
  let stream: AsyncGenerator<GenerateContentResponse>;
  try {
    stream = await gemini().models.generateContentStream({
      model: MODEL,
      contents,
      config: { systemInstruction: EXPLAIN_SYSTEM, maxOutputTokens: 2048, temperature: 0.3, thinkingConfig: thinkingFor(MODEL), abortSignal: signal },
    });
  } catch (err) {
    const code = classify(err, signal);
    return Response.json({ error: code }, { status: STATUS[code], headers: MODEL_HEADER });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let finish: string | undefined, blocked = false, wrote = false;
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) { controller.enqueue(encoder.encode(text)); wrote = true; }
          finish = chunk.candidates?.[0]?.finishReason ?? finish;
          if (chunk.promptFeedback?.blockReason) blocked = true;
        }
        if (blocked || (finish && BLOCKED.includes(finish))) controller.enqueue(encoder.encode(`${wrote ? "\n\n" : ""}[The assistant couldn’t answer that. Try asking in a different way.]`));
        else if (finish === "MAX_TOKENS") controller.enqueue(encoder.encode(" …"));
        else if (!wrote) controller.enqueue(encoder.encode("[The assistant didn’t reply. Try asking again.]"));
      } catch (err) {
        if (!req.signal.aborted) {
          const code = classify(err, signal);
          const msg = code === "rate_limited" ? "The assistant is busy. Try again in a minute."
            : code === "timeout" ? "The assistant took too long. Try again."
            : "Something went wrong reaching the assistant. Try again.";
          controller.enqueue(encoder.encode(`\n\n[${msg}]`));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...MODEL_HEADER } });
}
