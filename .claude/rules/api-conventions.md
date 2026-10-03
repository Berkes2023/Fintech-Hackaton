# API conventions (`src/app/api/*`)

- Route handlers export `POST(req: Request)` and return `Response.json(...)` or a streamed `Response`.
- The Anthropic client lives in `src/lib/ai.ts` (imports `server-only`). Never import it from a client component.
- Model is `claude-opus-5-5` with `output_config.effort: "low"` for these short tasks, plus server-side refusal fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).
- Check `stop_reason === "refusal"` before reading content.
- Validate and cap every input: context ≤ 9,000 chars (includes up to 2,500 chars of document text), each turn ≤ 1,500, pasted text ≤ 8,000, uploaded PDF or image ≤ 3 MB, at most 8 turns.
- Return 503 `{ error: "not_configured" }` when `ANTHROPIC_API_KEY` is missing. The UI turns that into "AI is off".
- Error codes in JSON bodies: `bad_request`, `not_configured`, `rate_limited`, `refused`, `invalid_json`, `upstream`. Catch SDK errors with typed classes (`Anthropic.RateLimitError`, `Anthropic.APIError`), never by matching messages.
- System prompts state that pasted or page text is data, not instructions.
