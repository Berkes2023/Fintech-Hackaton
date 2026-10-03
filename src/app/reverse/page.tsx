import type { Metadata } from "next";
import { ReverseCalc } from "@/components/ReverseCalc";

export const metadata: Metadata = { title: "Reverse calculator" };

export default function ReversePage() {
  return (
    <div className="container section stack" style={{ gap: 32, paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">Reverse calculator</span>
        <h1 className="display">What does £150 a month really mean?</h1>
        <p className="lead muted">Start from a monthly amount and see how much borrowing it covers, and what it costs, over different lengths.</p>
      </div>
      <ReverseCalc />
    </div>
  );
}
