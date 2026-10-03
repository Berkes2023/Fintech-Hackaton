---
description: Review the current changes against the hackathon rubric and project rules
---
Review the uncommitted changes (`git diff` and `git diff --staged`), or the files named in: $ARGUMENTS

Check, in this order:
1. **Money maths**: any change to `src/lib/finance.ts` has a matching test in `src/lib/finance.test.ts`, and `npm test` passes.
2. **Responsible design**: no copy that recommends a product, ranks options as "best", or implies advice. AI output stays labelled. Errors explain what to do next.
3. **Usability and accessibility**: every input has a label, controls are keyboard-reachable, focus is visible, layout works at 375px wide.
4. **Style**: follows `.claude/rules/code-style.md` (monochrome, pill controls, no shadows on cards, no new colours).
5. **Security**: nothing secret reaches the client, and API routes validate input sizes.

Report findings as a short list ranked by severity with `file:line`. Don't rewrite code unless asked.
