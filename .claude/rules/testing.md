# Testing

- Run `npm run check` (lint + typecheck + Vitest) before every commit, and `npm run build` before pushing.
- Every formula in `src/lib/finance.ts` needs a test that checks the number against an independent calculation (see the annuity test for the pattern).
- Test the edge cases that matter to users: 0% APR, a payment that never clears the balance, missed BNPL payments, 0% intro periods.
- Use `close(a, b, tol)` for money comparisons. Never compare floats with `toBe`.
- AI routes aren't unit-tested against the live API. Check by hand: with `GEMINI_API_KEY` unset, the UI must say AI is off and everything else must still work.
