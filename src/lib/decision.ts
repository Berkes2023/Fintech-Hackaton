import type { Goal } from "./journey";

// The reusable decision engine's shape. The category changes the words; the process stays the same:
//   your situation → credit context → what you're thinking about → cost → upfront money → finance → future → simulation.
// Only the car is fully built for the prototype; the others use the simplified wizard (/plan/simple) for now.

export type DecisionKind = "car" | "home" | "improve" | "purchase" | "borrowing" | "education" | "invest" | "other";

export interface DecisionCopy {
  label: string;
  /** Full journey built, handled by the simplified wizard, or routed to a guide. */
  status: "full" | "simplified" | "guide";
  cost: string;
  upfront: string;
  financeName: string;
  financeQuestion: string;
  thing: string;
}

/** Labels match journey.ts GOALS and the /start guide, so a choice reads the same everywhere. */
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
    label: "Make a big purchase", status: "simplified", thing: "the purchase",
    cost: "How much is it?", upfront: "How much could you pay now?",
    financeName: "purchase finance", financeQuestion: "How might you spread the rest?",
  },
  borrowing: {
    label: "Borrow money", status: "simplified", thing: "the loan",
    cost: "How much do you need?", upfront: "How much of it could you cover yourself?",
    financeName: "a loan", financeQuestion: "How might a loan cover the rest?",
  },
  education: {
    label: "Pay for a course", status: "simplified", thing: "the course",
    cost: "How much does the course cost?", upfront: "How much could you pay yourself?",
    financeName: "course finance", financeQuestion: "How might you pay for the rest?",
  },
  invest: {
    label: "Save or invest", status: "simplified", thing: "your saving",
    cost: "", upfront: "", financeName: "", financeQuestion: "",
  },
  other: {
    label: "Something else", status: "guide", thing: "it",
    cost: "", upfront: "", financeName: "", financeQuestion: "",
  },
};

/** Which simplified-wizard goal (journey.ts) each decision opens. The car has its own journey; "Something else" goes to /start. */
export const SIMPLE_GOAL: Partial<Record<DecisionKind, Goal>> = {
  home: "home", improve: "improve", purchase: "purchase", borrowing: "borrow", education: "education", invest: "invest",
};

/**
 * Where Plan hands a goal over to the simplified wizard: its money step ("Your money", step index 1) for saving or
 * investing, otherwise the cost step (index 2), since Plan has already asked about the situation.
 */
export const simplePlanHref = (g: Goal) => `/plan/simple?step=${g === "invest" ? 1 : 2}&from=plan`;

/** The stages every decision passes through, in the order a person naturally thinks about them. */
export const STAGES = ["My situation", "Credit context", "Goal", "Purchase", "Finance", "Future", "Consequences", "What if", "Small print", "Before you sign"] as const;
export type Stage = (typeof STAGES)[number];
