import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, anthropic, EXPLAIN_SYSTEM, FALLBACK_BETA, MODEL } from "@/lib/ai";

interface Turn { role: "user" | "assistant"; content: string }

const MAX_CONTEXT = 9000;
const MAX_TURN = 1500;
const MAX_TURNS = 8;

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

export async function POST(req: Request) {
  if (!aiConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const input = parse(await req.json().catch(() => null));
  if (!input) return Response.json({ error: "bad_request" }, { status: 400 });

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: `PAGE DATA (recalculated for this question):\n${input.context}` },
    ...input.turns,
  ];

  const stream = anthropic().beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: EXPLAIN_SYSTEM,
      messages,
    },
    { signal: req.signal },
  );

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n[The assistant couldn't answer that. Try asking in a different way.]"));
        }
      } catch (err) {
        if (!req.signal.aborted) {
          const msg = err instanceof Anthropic.RateLimitError
            ? "The assistant is busy. Try again in a minute."
            : "Something went wrong reaching the assistant. Try again.";
          controller.enqueue(encoder.encode(`\n\n[${msg}]`));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
