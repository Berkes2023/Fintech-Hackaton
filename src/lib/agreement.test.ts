import { describe, expect, it } from "vitest";
import { AGREEMENT_VERSION, isAcknowledgement, isCurrent, PRIVACY_STATEMENT, USER_TERMS } from "./agreement";
import { VERDICT_WORDS } from "./consequence";

describe("the user agreement", () => {
  it("accepts only a well-formed acknowledgement", () => {
    expect(isAcknowledgement({ version: 1, at: "2026-10-04T13:00:00.000Z" })).toBe(true);
    expect(isAcknowledgement({ version: "1", at: "2026-10-04" })).toBe(false);
    expect(isAcknowledgement(null)).toBe(false);
    expect(isAcknowledgement("yes")).toBe(false);
  });

  it("asks again when the wording changes", () => {
    expect(isCurrent({ version: AGREEMENT_VERSION, at: "x" })).toBe(true);
    expect(isCurrent({ version: AGREEMENT_VERSION - 1, at: "x" })).toBe(false);
    expect(isCurrent(null)).toBe(false);
  });

  it("states what the prototype is and isn't, and how data is handled", () => {
    const terms = USER_TERMS.join(" ");
    expect(terms).toMatch(/isn’t financial advice/);
    expect(terms).toMatch(/doesn’t predict lender approval/);
    expect(terms).toMatch(/decision is always yours/);
    const privacy = PRIVACY_STATEMENT.join(" ");
    expect(privacy).toMatch(/Google Gemini/);
    expect(privacy).toMatch(/no database/i);
    expect(privacy).toMatch(/Vercel/);
    // No verdicts or promises the code can't keep.
    for (const s of [...USER_TERMS, ...PRIVACY_STATEMENT]) expect(s).not.toMatch(VERDICT_WORDS);
    expect(privacy).not.toMatch(/never stored|we don’t save|GDPR|encrypted/i);
  });
});
