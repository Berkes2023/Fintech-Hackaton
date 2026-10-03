---
name: security-review
description: Security and user-protection review for Before You Sign. Use before a demo, before deploying, or when API routes, prompts or storage code change.
---
# Security review

Work through each item and report pass or fail with `file:line`.

## Secrets
- `ANTHROPIC_API_KEY` is only read in `src/lib/ai.ts`, which imports `server-only`.
- No `.env*` file is committed (`git ls-files | grep env`).
- No key appears in client bundles: after `npm run build`, `grep -r "sk-ant" .next/static` finds nothing.

## API routes
- Inputs are type-checked and size-capped before reaching the model (see `.claude/rules/api-conventions.md`).
- Errors don't leak stack traces or upstream messages to the client.
- Streaming responses stop when the client aborts (`req.signal`).

## Prompt injection
- Pasted text is wrapped in `<pasted_text>` tags and the system prompt says it is data.
- Extracted values are checked against the product's field list and numeric types before use, and outlined for the user to check.

## User protection
- No copy recommends a product. Search: `grep -rniE "recommend|best option|you should" src`.
- AI answers are labelled. The footer and Responsible AI page state that this is not advice.
- User figures stay in localStorage. Nothing leaves the browser except questions and pasted text sent to `/api/*` when the user asks.
