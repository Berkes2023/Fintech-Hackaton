// The reusable decision engine's shape. The category changes the words; the process stays the same:
//   credit context → what you're thinking about → cost → upfront money → finance → situation → future → simulation.
// Only the car is fully built for the prototype; the others reuse the same stages and sim.ts when they're built.

export type DecisionKind = "car" | "home" | "improve" | "purchase" | "borrowing" | "other";

export interface DecisionCopy {
  label: string;
  /** Full journey built, or currently handled by the simplified wizard. */
  status: "full" | "simplified" | "guide";
  cost: string;
  upfront: string;
  financeName: string;
  financeQuestion: string;
  thing: string;
}

export const DECISIONS: Record<DecisionKind, DecisionCopy> = {
  car: {
    label: "Buy a car", status: "full", thing: "the car",
    cost: "How much is the car you’re looking at?",
    upfront: "How much could you put down upfront?",
    financeName: "car finance",
    financeQuestion: "How might you finance the rest?",
  },
  home: {
    label: "Buy a home", status: "simplified", thing: "the property",
    cost: "How much is the property?", upfront: "How much deposit do you have?",
    financeName: "mortgage", financeQuestion: "How might a mortgage cover the rest?",
  },
  improve: {
    label: "Improve my home", status: "simplified", thing: "the project",
    cost: "How much is the project likely to cost?", upfront: "How much cash could you use?",
    financeName: "home improvement finance", financeQuestion: "How might you pay for the rest?",
  },
  purchase: {
    label: "Finance a large purchase", status: "simplified", thing: "the purchase",
    cost: "How much is it?", upfront: "How much could you pay now?",
    financeName: "purchase finance", financeQuestion: "How might you spread the rest?",
  },
  borrowing: {
    label: "Manage existing borrowing", status: "guide", thing: "your borrowing",
    cost: "", upfront: "", financeName: "", financeQuestion: "",
  },
  other: {
    label: "Something else", status: "guide", thing: "it",
    cost: "", upfront: "", financeName: "", financeQuestion: "",
  },
};

/** The stages every decision passes through, in the order a person naturally thinks about them. */
export const STAGES = ["Credit", "Your idea", "The cost", "Finance", "Your situation", "Your future", "Simulation", "What if", "Before you sign"] as const;
export type Stage = (typeof STAGES)[number];
