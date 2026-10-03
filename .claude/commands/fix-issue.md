---
description: Fix a GitHub issue end to end
argument-hint: <issue-number>
---
Fix GitHub issue #$ARGUMENTS.

1. Read it with `gh issue view $ARGUMENTS`.
2. Find the relevant code (start from the map in CLAUDE.md).
3. If it touches the maths, write a failing test in `src/lib/finance.test.ts` first.
4. Make the smallest change that fixes it.
5. Run `npm run check` and `npm run build`. Both must pass.
6. Commit with a message that references the issue, for example `Fix minimum payment floor (#$ARGUMENTS)`.
