import type { Metadata } from "next";
import { ComparePanel } from "@/components/ComparePanel";

export const metadata: Metadata = { title: "Compare options" };

export default function ComparePage() {
  return (
    <div className="container section stack" style={{ gap: 32, paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">Compare</span>
        <h1 className="display">Side by side</h1>
        <p className="lead muted">
          The lowest number isn’t always the right fit. A lower total can mean a higher monthly payment, or less flexibility. The choice is yours.
        </p>
      </div>
      <ComparePanel />
    </div>
  );
}
