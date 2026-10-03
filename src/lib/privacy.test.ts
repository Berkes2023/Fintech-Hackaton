import { describe, expect, it } from "vitest";
import { redact } from "./privacy";

describe("privacy shield", () => {
  it("removes personal details but keeps the financial terms", () => {
    const letter = `Dear Jane Smith
Address: 12 High Street, Bristol
Postcode BS1 4DJ. Email jane@example.com, mobile 07700 900123.
Account number 12345678, sort code 20-00-00.
Representative 29.9% APR. Monthly payment £86.73 over 12 months.`;
    const { text, found } = redact(letter);
    for (const secret of ["Jane", "High Street", "BS1 4DJ", "jane@example.com", "07700 900123", "12345678", "20-00-00"]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain("Representative 29.9% APR. Monthly payment £86.73 over 12 months.");
    expect(found.map((f) => f.kind)).toEqual(expect.arrayContaining(["name", "address", "postcode", "email", "phone number", "account number", "sort code"]));
  });

  it("leaves a plain advert untouched", () => {
    const ad = "NEW LAPTOP - ONLY £83/MONTH! Representative 19.9% APR over 36 months.";
    expect(redact(ad)).toEqual({ text: ad, found: [] });
  });
});
