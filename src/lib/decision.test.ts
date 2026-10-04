import { describe, expect, it } from "vitest";
import { DECISIONS, SIMPLE_GOAL, simplePlanHref, STAGES, type DecisionKind } from "./decision";
import { GOALS } from "./journey";

describe("decision goals", () => {
  it("use the same labels as the home page and navigation goals", () => {
    for (const [kind, goal] of Object.entries(SIMPLE_GOAL) as [DecisionKind, keyof typeof GOALS][]) {
      expect(DECISIONS[kind].label).toBe(GOALS[goal].label);
    }
    expect(DECISIONS.car.label).toBe(GOALS.car.label);
  });

  it("route every goal into Plan except “Something else”", () => {
    const guided = (Object.keys(DECISIONS) as DecisionKind[]).filter((k) => DECISIONS[k].status === "guide");
    expect(guided).toEqual(["other"]);
    for (const k of Object.keys(DECISIONS) as DecisionKind[]) {
      if (k !== "car" && k !== "other") expect(SIMPLE_GOAL[k]).toBeDefined();
    }
  });

  it("hand saving or investing to the wizard's money step, and borrowing goals to the cost step", () => {
    expect(simplePlanHref("invest")).toBe("/plan/simple?step=1&from=plan");
    expect(simplePlanHref("home")).toBe("/plan/simple?step=2&from=plan");
    expect(simplePlanHref("borrow")).toBe("/plan/simple?step=2&from=plan");
  });

  it("call the document step “Small print”, not “Decode It”", () => {
    expect(STAGES).toContain("Small print");
    expect(STAGES.join(" ")).not.toMatch(/decode/i);
  });
});
