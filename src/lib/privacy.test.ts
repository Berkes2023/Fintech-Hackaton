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

  it("removes a postcode, a mobile and a landline from a typed question", () => {
    const question = "I live at BS1 4DJ. Call me on 07700 900123, at work on 0117 496 0123 or +44 20 7946 0018. Is the APR fixed?";
    const { text, found } = redact(question);
    for (const secret of ["BS1 4DJ", "07700 900123", "0117 496 0123", "7946 0018"]) expect(text).not.toContain(secret);
    expect(text).toContain("Is the APR fixed?");
    expect(found).toEqual(expect.arrayContaining([{ kind: "postcode", count: 1 }, { kind: "phone number", count: 3 }]));
  });

  it("catches landlines in their usual formats", () => {
    for (const n of ["020 7946 0018", "01632 960123", "0300 123 4567", "01179460123", "+44 (0)117 496 0123", "+441632960123"]) {
      expect(redact(`Phone ${n} today`).text).toBe("Phone [PHONE] today");
    }
  });

  it("catches bracketed area codes, mobiles with (0) or dashes, and labelled sort codes", () => {
    expect(redact("Phone (0117) 496 0123 today").text).toBe("Phone [PHONE] today");
    expect(redact("Tel: (020) 7946 0018").text).toBe("Tel: [PHONE]");
    expect(redact("Call +44 (0) 7700 900123 now").text).toBe("Call [PHONE] now");
    expect(redact("Call 07700-900-123 now").text).toBe("Call [PHONE] now");
    expect(redact("Sort code: 12 34 56.")).toEqual({ text: "Sort code: [SORT CODE].", found: [{ kind: "sort code", count: 1 }] });
    expect(redact("sort code 123456 please").text).toBe("Sort code: [SORT CODE] please");
  });

  it("removes postcodes typed in lower case but leaves ordinals and quarters alone", () => {
    const { text, found } = redact("my postcode is bs1 4dj, is the APR fixed?");
    expect(text).toBe("my postcode is [POSTCODE], is the APR fixed?");
    expect(found).toEqual([{ kind: "postcode", count: 1 }]);
    for (const p of ["sw1a 1aa", "bs14dj", "Bs1 4dj", "LS1 1ST"]) expect(redact(`at ${p} now`).text).toBe("at [POSTCODE] now");
    for (const s of ["Q1 2nd quarter", "v2 1st", "a1 2nd payment", "q4 2025"]) expect(redact(s)).toEqual({ text: s, found: [] });
  });

  it("removes the whole name after a title, including initials, capitals, apostrophes and hyphens", () => {
    expect(redact("Dear Mr J Smith,")).toEqual({ text: "Dear [NAME],", found: [{ kind: "name", count: 1 }] });
    expect(redact("Borrower: MR JOHN SMITH").text).toBe("Borrower: [NAME]");
    for (const n of ["MR J SMITH", "Mrs O'Neill", "Ms Smith-Jones", "Dr Jane Mary Smith", "Mr. J. R. Smith", "Mr McDonald"]) {
      expect(redact(`Signed ${n}`).text).toBe("Signed [NAME]");
    }
    expect(redact("Mrs Smith agreed to pay £86.73").text).toBe("[NAME] agreed to pay £86.73");
    expect(redact("Mr Smith APR 29.9%").text).toBe("[NAME] APR 29.9%");
    for (const s of ["DRIVE AWAY TODAY", "open it in ms word"]) expect(redact(s)).toEqual({ text: s, found: [] });
  });

  it("keeps money figures, rates and dates that contain zeros", () => {
    const terms = "£1,023.50 a month for 36 months, 0% for 3 months, then 29.9% APR. Total £12,300.00. First payment 01/02/2027.";
    expect(redact(terms)).toEqual({ text: terms, found: [] });
  });
});
