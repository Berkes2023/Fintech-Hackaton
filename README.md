# Before You Sign

**Know the real cost before you sign.** A prototype for the UKFinnovator Bristol 2026 hackathon, challenge *“Money, Explained: Making Financial Decisions Easier”*.

Enter a loan, credit card, overdraft, Buy Now Pay Later plan, subscription or household bill. Before You Sign shows:

- **The cost:** regular payment, first three months, total you pay and the cost of borrowing.
- **A plain-English explanation** of what you’re agreeing to, plus a jargon buster.
- **Risks to check**, ranked: minimum-payment traps, the FCA “persistent debt” test, 0% offers ending, late fees, price rises and exit fees.
- **A chart** of everything you pay over time, against what you borrowed.
- **A side-by-side comparison** of up to four options.
- **An optional AI assistant** that answers questions and reads pasted small print to fill in the form. It explains and never recommends.

> Not financial advice. Not connected to any bank. Figures are estimates from what you enter.

## Run it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY to turn on the AI features
npm run dev                  # http://localhost:3000
```

Without an API key everything works except the two AI features, which say they’re switched off.

| Script | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run check` | Lint, typecheck and unit tests |
| `npm run build` | Production build (what Vercel runs) |

## How it’s built

- **Next.js 16** (App Router) + **TypeScript**, plain CSS design tokens in a Revolut-style monochrome system with a mega-menu header.
- **`src/lib/finance.ts`**: all money maths as pure, tested functions (annuity repayments, card minimum payments, overdraft EAR, BNPL instalments, subscription and contract price rises).
- **`src/app/api/explain`** and **`src/app/api/extract`**: Claude (`claude-opus-5-5`) via the Anthropic SDK. Chat answers stream; extraction uses structured JSON output. Inputs are size-capped and pasted text is treated as data.
- **Privacy:** figures and comparisons are stored only in the browser (localStorage).

## Responsible design

Every number comes from transparent maths, never the model. AI is optional, labelled, told never to recommend, and points people to MoneyHelper and StepChange when money worries come up. See `/responsible-ai` in the app.

## Working with Claude Code

The `.claude/` folder holds team settings, slash commands (`/review`, `/fix-issue`, `/deploy`), rules, skills and subagents. Start with `CLAUDE.md`. Put personal notes in `CLAUDE.local.md` (gitignored).

```
CLAUDE.md                 team instructions (committed)
CLAUDE.local.md           personal overrides (gitignored)
.claude/
  settings.json           permissions + config (committed)
  settings.local.json     personal permissions (gitignored)
  commands/               review · fix-issue · deploy
  rules/                  code-style · testing · api-conventions
  skills/                 security-review · deploy
  agents/                 code-reviewer · security-auditor
```
