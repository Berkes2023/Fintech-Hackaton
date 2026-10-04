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
- `src/lib/store.ts`: browser-only state in localStorage (`bys:*` keys) via `useSyncExternalStore`. Every store has `reset()`; `clearSaved()` clears every key and in-memory cache (Privacy & your data → clear). `src/lib/motion.ts`: `scrollMotion()` respects reduced motion for JS scrolling.
- `src/lib/ai.ts`: server-only Gemini client, model config, error mapping and system prompts. `src/lib/extraction.ts` validates the extraction JSON before the UI sees it.
- `src/components/Header.tsx`: mega menu, driven by `src/lib/nav.ts`.
- `src/components/Checker.tsx`: the cost checker. `ComparePanel.tsx`: comparison table and chart.
- `src/lib/rates.ts`: live Bank of England / Fed / ECB rates for `/rates`, cached for a day. UK uses BoE series IUDBEDR because FRED's BOERUKM stopped in 2017.
- `src/lib/finance.ts` also holds `twin()`/`scenarios()` (digital twin), `stressTest()`, `levers()` (what changes the total) and `crossCheck()` (document figures vs ours).
- `src/lib/privacy.ts`: redacts personal details (emails, mobile and landline numbers, card/account/NI numbers, sort codes, postcodes, titled names, labelled addresses and dates of birth) in the browser before pasted text, file transcriptions, AI questions and AI context go to Gemini. `src/lib/highlight.ts`: finds quotes for "Show me where".
- `src/lib/api.ts` + `src/app/api/v1/label`: public, AI-free Money Label API (documented at `/developers`).
- `src/lib/dna.ts`: Product DNA (universal schema), questions to ask, reverse calculator, future-payment dates, commitment map. `src/lib/concepts.ts`: fixed explainers for the learning nudge and misconceptions.
- Pages: `/firewall` (Commitment Firewall demo), `/commitments` (commitment map), `/reverse`, `/diff` (contract diff), `/developers`.
- **Consequence engine** (`src/lib/consequence.ts`, tested): `snapshot()` (your situation today), `paymentConsequence()` (before → after monthly remaining, % of income, % of current flexibility, gap to the person’s own chosen buffer), `savingsConsequence()`, `aprScenarios()`, `termConsequence()`, `depositConsequence()`, `compareRows()`, `changePoints()`, `keyMoments()`. Every important number answers “what is it?” and “what does it change for you?”. Also `paymentFigures()` (the six labelled figures), `termSentence()`, `stressStart()` + `stressScenarios()` (before → after for remaining, savings floored at £0 with the shortfall stated, commitments, buffer), `waitScenarios()` (buy now vs wait, stated regular saving only) and `decisionChanges()` (last time vs now). Never says safe/unsafe/affordable; no invented thresholds. UI pattern: `Consequence.tsx` (result → the numbers → what this could mean for you → what it changes → what could you change).
- **Insight engine** (`src/lib/insight.ts`, tested): input → calculation → context → insight → optional what-if, at every journey step. `insightsFor(moment, ctx)` returns ranked insights (savings projections, annualised costs, repeated purchases, buffer in months, debt ending, deposit’s two effects, price/APR/term comparisons, bonus timing); `pictureNarrative()` narrates the month as it forms. Insights can carry an in-place `whatIf` (e.g. “What if I saved £50 more?”). UI: `Insights.tsx` (one prominent insight + at most two folded, live ledger Income − costs − debt − commitments = estimated monthly remaining). Projections only carry forward what was entered; insights notice and explain, never instruct.
- **Information architecture**: Products = Plan (`/plan`, the one guided journey), Read the small print (`/small-print`: extract with quotes → our calculation → consequences, `offer.ts` incl. `mergeQuestions()`/`documentValues()`), Stress test (`/stress-test`, reuses the Plan situation) and the cost checkers. Tools = Compare, Contract diff, Commitment map, Reverse calculator (only distinct utilities). Learn includes `/learn#credit` (UK credit scores). `/check` and `/decide/car` redirect to `/plan`; non-car goals go to `/plan/simple?step=2&from=plan`, seeded by `situationFromPicture()`; `/start` only routes (the unsure path lands in Plan). About (`/about`) is one page: how it works, calculations & responsible AI, what we don’t do, privacy & your data, sources & methodology (`Sources.tsx`, every statistic in `stats.ts`) and roadmap (Developer API demo, Commitment Firewall concept). `/privacy` and `/terms` describe actual data handling (localStorage `bys:*`, Gemini for AI features only, no DB, no logging in our code, no cookies/analytics). `src/lib/copy.test.ts` scans all UI copy for verdict/instruction/prediction words.
- **Car decision journey** (`/plan`, the MVP; formerly `/check`; order: situation → snapshot → credit → goal → car → deposit → finance → future → consequences → over time → what if → small print → summary; stage-relative counter and contextual Next labels; `/decide/car` redirects there; the old cost checker is `/cost-checker`). Stages come from `src/lib/decision.ts`, reusable for other decisions: `src/lib/sim.ts` is its tested engine (financial picture, self-reported credit profile, future events, finance scenarios, month-by-month simulation, hidden cost, what-ifs, careful wording). UI in `src/components/CarJourney.tsx` + `CarParts.tsx`. One-off money is never recurring; credit profile never feeds affordability; every number carries a source badge.
- Home (`src/app/page.tsx`) is a short pitch, one moment per idea: static h1 hero (“A monthly payment tells you what leaves your account. We show what it could leave you with.”) → 3 sourced stats (84%, 18%, 12% from `stats.ts`) → one APR example (£20,000 at 9.9% over 48 months via `schedule()`) → £670 → −£420 → £250 consequence (`snapshot()`/`paymentConsequence()`; £420 = the same £20,000 over 60 months) → three CRA scales → the equation → how it works (#how) + Start my journey → promises. Full research lives at `/about#sources`. Every statistic has source, year, population and geography (checked 4 Oct 2026). `StoryKit.tsx` keeps Reveal/Counter/DotGrid/Sequence/useReducedMotion; final states show for reduced motion and without JS. Other goals use the simplified wizard (`/plan/simple`, `journey.ts`, one illustrative APR per kind, never chosen by credit) and `/start` helps people who aren’t sure.
- `src/lib/credit.ts`: credit context. Published Experian (0–1250), Equifax (0–1000) and TransUnion (0–999 new, 0–710 older) scales, checked 4 Oct 2026, with sources. Scores are USER_SUPPLIED, never calculated, converted or linked to a rate. Up to three agency scores are kept side by side (`scores`, one per agency), never averaged or converted. `creditEstimate()` is the Before You Sign profile (0–100) for people who don’t know their scores; `conversions()` maps it onto each agency’s displayed scale (round(profile × max / 100)), always labelled “Before You Sign estimate”, with a score the person entered taking precedence (`displayedScores()`). The profile itself is: our deterministic, educational 0–100 model (payment 35, utilisation 25, history 15, applications 10, borrowing 10, report indicators 5), every point explained; never an official score, never uses income or living costs. `/plan` is gated: no step after the credit result without `creditEstablished()`. UI in `CreditContext.tsx`.
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
- No real bank connections, payments or server-side storage. User figures stay in the browser; only what someone sends to an AI feature (document or question) leaves it, redacted first where possible.
- Follow the design rules in `.claude/rules/code-style.md` (Revolut-style monochrome, pill controls).
