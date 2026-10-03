import { describe, expect, it } from "vitest";
import { suggest } from "./guide";

describe("not sure where to start", () => {
  it("puts free help first when money is a struggle", () => {
    const s = suggest({ mind: "buy", buy: "car", feel: "struggling", when: "now" });
    expect(s[0].help).toBe(true);
    expect(s[0].why).toMatch(/MoneyHelper/);
  });

  it("sends someone buying a car now to the car plan and to decoding an offer", () => {
    const ids = suggest({ mind: "buy", buy: "car", feel: "okay", when: "now" }).map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(["goal-car", "decode"]));
  });

  it("suggests saving towards it when the purchase is later", () => {
    expect(suggest({ mind: "buy", buy: "car", feel: "comfortable", when: "later" }).map((x) => x.id)).toContain("save");
  });

  it("points only to places in the app, never to a product", () => {
    const all = (["buy", "owe", "ahead", "offer", "unsure"] as const).flatMap((mind) => suggest({ mind, feel: "tight", when: "exploring", buy: "home" }));
    for (const x of all) {
      expect(x.href || x.goal || x.help).toBeTruthy();
      expect(`${x.title} ${x.why}`).not.toMatch(/recommend|you should|best/i);
    }
    expect(all.every((x) => x.title)).toBe(true);
  });

  it("never returns more than four suggestions", () => {
    expect(suggest({ mind: "buy", buy: "car", feel: "struggling", when: "later" }).length).toBeLessThanOrEqual(4);
  });
});
