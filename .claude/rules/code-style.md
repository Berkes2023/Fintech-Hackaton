# Code style and design rules

## TypeScript / React
- Strict TypeScript. No `any`; use the SDK's own types for Gemini data (`Content`, `Part`).
- Server Components by default. Add `"use client"` only for components with state or browser APIs.
- Keep components pure: no `Date.now()`, `Math.random()` or storage reads during render. Put them in event handlers or in `src/lib/store.ts`.
- Money maths belongs in `src/lib/finance.ts` as pure functions. Components only format and display.
- Format money with `money()` and durations with `dur()` from `src/lib/format.ts`. UK English, £, en-GB.

## Visual design (Revolut-style reference)
- Palette is neutral only: ink `#1f1f1f`, white, mist `#f7f7f7`, ash `#c9c9cd`, slate `#717173`, graphite `#4c4c4c`.
- The blue gradient is reserved for the top promo bar. Never use it anywhere else.
- Every button, tag and input is a pill (`border-radius: 9999px`). Cards use 22.5px, list containers 20px.
- No shadows on cards or buttons: separate with `#c9c9cd` hairlines and surface changes. Only popovers (the mega menu) may have a shadow.
- Display type (DM Sans, standing in for Aeonik Pro) is weight 500 at most. Inter handles 16px and below.
- Show state with form (filled vs outlined pills, weight), not colour.

## Copy
- Write from the user's side: short sentences, active voice, no unexplained jargon.
- Never "recommend", "best" or "you should". Say what something costs and what to check.
