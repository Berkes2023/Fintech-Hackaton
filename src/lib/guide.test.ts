import { describe, expect, it } from "vitest";
import { FEEL, MIND, suggest, WHEN, type Answers, type Feel, type Mind, type When } from "./guide";
import { GOALS, type Goal } from "./journey";

// Every combination of answers the guide can receive.
const every: Answers[] = (Object.keys(MIND) as Mind[]).flatMap((mind) =>
  (Object.keys(FEEL) as Feel[]).flatMap((feel) =>
    [...(Object.keys(WHEN) as When[]), undefined].flatMap((when) =>
      [...(Object.keys(GOALS) as Goal[]), undefined].map((buy) => ({ mind, feel, when, buy })))));

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
    for (const a of every) expect(suggest(a).length).toBeLessThanOrEqual(4);
  });

  it("sends someone who isn’t sure into Plan, starting with their situation", () => {
    const first = suggest({ mind: "unsure", feel: "okay" })[0];
    expect(first.href).toBe("/plan");
    expect(first.title).toBe("Start with your situation");
    for (const feel of Object.keys(FEEL) as Feel[]) expect(suggest({ mind: "unsure", feel }).some((x) => x.href === "/plan")).toBe(true);
  });

  it("routes every buying answer into Plan", () => {
    for (const a of every.filter((x) => x.mind === "buy")) {
      const s = suggest(a);
      if (a.buy) expect(s.some((x) => x.goal === a.buy)).toBe(true);
      else expect(s.some((x) => x.href === "/plan")).toBe(true);
    }
  });

  it("never links back to the home page, and never uses advice or verdict words", () => {
    for (const x of every.flatMap(suggest)) {
      if (x.href) expect(x.href.startsWith("/#")).toBe(false);
      expect(`${x.title} ${x.why}`).not.toMatch(/recommend|you should|\bbest\b|afford|\bsafe\b|unsafe/i);
    }
  });
});
