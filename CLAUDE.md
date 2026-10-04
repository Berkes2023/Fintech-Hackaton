@AGENTS.md

# Before You Sign

Hackathon prototype for UKFinnovator Bristol 2026, challenge “Money, Explained: Making Financial Decisions Easier” (sponsor: EdTechLab).
Users enter a commitment-based product (loan, credit card, overdraft, BNPL, subscription, household bill) and see its real cost, risks, a repayment chart and a side-by-side comparison. AI explains and reads pasted small print; it never recommends.

## Judging rubric (keep work pointed at this)
- 20% Problem understanding, challenge fit and impact
- 30% Prototype, functionality, usability and feasibility
- 20% Technical and domain quality
- 20% Responsible design, safety and user protection
- 10% Teamwork and showcase communication

## Stack
- Next.js 16 App Router, React 19, TypeScript, plain CSS (`src/app/globals.css`). No Tailwind.
- Google Gemini via `@google/genai`, in route handlers only (`src/app/api/*`). One model, set in one place: `MODEL` in `src/lib/ai.ts`, from the server-side `GEMINI_MODEL` env var (default `gemini-3.8-flash`). No automatic fallback; every AI response carries an `X-AI-Model` header.
- Vitest for unit tests. Deployed on Vercel.

## Map
- `src/lib/finance.ts`: products, field definitions, `simulate()`, `explain()`, `risks()`. All money maths lives here and is pure.
- `src/lib/finance.test.ts`: tests for the maths. Add one for every formula change.
- `src/lib/store.ts`: browser-only state (draft + saved comparisons) in localStorage via `useSyncExternalStore`.
- `src/lib/ai.ts`: server-only Gemini client, model config, error mapping and system prompts. `src/lib/extraction.ts` validates the extraction JSON before the UI sees it.
- `src/components/Header.tsx`: mega menu, driven by `src/lib/nav.ts`.
- `src/components/Checker.tsx`: the cost checker. `ComparePanel.tsx`: comparison table and chart.
- `src/components/HeroCard.tsx`: home page example card that rises as you scroll (sets `--p` from 0 to 1).
- `src/lib/rates.ts`: live Bank of England / Fed / ECB rates for `/rates`, cached for a day. UK uses BoE series IUDBEDR because FRED's BOERUKM stopped in 2017.
- `src/lib/finance.ts` also holds `twin()`/`scenarios()` (digital twin), `stressTest()`, `levers()` (what changes the total) and `crossCheck()` (document figures vs ours).
- `src/lib/privacy.ts`: redacts personal details in the browser before text goes to AI. `src/lib/highlight.ts`: finds quotes for "Show me where".
- `src/lib/api.ts` + `src/app/api/v1/label`: public, AI-free Money Label API (documented at `/developers`).
- `src/lib/dna.ts`: Product DNA (universal schema), questions to ask, reverse calculator, future-payment dates, commitment map. `src/lib/concepts.ts`: fixed explainers for the learning nudge and misconceptions.
- Pages: `/firewall` (Commitment Firewall demo), `/commitments` (commitment map), `/reverse`, `/diff` (contract diff), `/developers`.
- **Car decision journey** (`/check`, the MVP; `/decide/car` redirects there; the old cost checker is `/cost-checker`). Stages come from `src/lib/decision.ts`, reusable for other decisions: `src/lib/sim.ts` is its tested engine (financial picture, self-reported credit profile, future events, finance scenarios, month-by-month simulation, hidden cost, what-ifs, careful wording). UI in `src/components/CarJourney.tsx` + `CarParts.tsx`. One-off money is never recurring; credit profile never feeds affordability; every number carries a source badge.
- Home sells the story (`src/app/page.tsx`): hero, animated `StoryDemo.tsx` (fictional data, every figure from `sim.ts`, respects reduced motion), problem, credit ≠ affordability, journey path, supporting tools and roadmap. Other goals use the simplified wizard (`/plan`, `journey.ts`) and `/start` helps people who aren’t sure.
- `src/lib/credit.ts`: credit context. Published Experian (0–1250), Equifax (0–1000) and TransUnion (0–999 new, 0–710 older) scales, checked 4 Oct 2026, with sources. Scores are USER_SUPPLIED, never calculated, converted or linked to a rate. `creditEstimate()` is the Before You Sign Credit Estimate: our deterministic, educational 0–100 model (payment 35, utilisation 25, history 15, applications 10, borrowing 10, report indicators 5), every point explained; never an official score, never uses income or living costs. `/check` is gated: no step after the credit result without `creditEstablished()`. UI in `CreditContext.tsx`.
- Finance scenarios in the journey are fictional Providers A/B/C (`illustrativeProviders`), independent of credit profile. Never invent real lender rates.
- `analysis/rates_vs_assets.py`: pandas script correlating asset moves with rate changes (same sources).

## Commands
- `npm run dev`: local dev server on http://localhost:3000
- `npm run check`: lint + typecheck + tests. Run before every commit.
- `npm run build`: production build (what Vercel runs)

## Non-negotiables
- Never present output as financial advice or tell the user which product to choose. Copy says “explain”, never “recommend”.
- Every figure shown comes from `finance.ts`, never from the model.
- AI features must degrade gracefully: if `GEMINI_API_KEY` is missing the API returns 503 and the UI says AI is off.
- No real bank connections, payments or personal data storage. User figures stay in the browser.
- Follow the design rules in `.claude/rules/code-style.md` (Revolut-style monochrome, pill controls).
