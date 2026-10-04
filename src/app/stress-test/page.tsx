import type { Metadata } from "next";
import { StressMonth } from "@/components/StressMonth";

export const metadata: Metadata = { title: "Stress test your month" };

export default function StressTestPage() {
  return (
    <div className="container section stack" style={{ gap: 24, paddingTop: 48 }}>
      <div className="stack" style={{ maxWidth: 760, gap: 8 }}>
        <span className="caption">Stress test your month</span>
        <h1 className="display">What if something changed?</h1>
        <p className="lead muted">See how your month and your savings would look if bills rose, income fell or something unexpected happened.</p>
      </div>
      <StressMonth />
    </div>
  );
}
