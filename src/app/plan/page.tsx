import type { Metadata } from "next";
import { Suspense } from "react";
import { CarJourney } from "@/components/CarJourney";

export const metadata: Metadata = { title: "Plan a decision step by step" };

/** The one guided journey: your situation, credit context, goal, decision, consequences, future, what-ifs, small print, summary. */
export default function PlanPage() {
  return (
    <div className="container section stack" style={{ gap: 20, paddingTop: 40 }}>
      <span className="caption">Plan step by step · What could this decision change for me?</span>
      <Suspense>
        <CarJourney />
      </Suspense>
    </div>
  );
}
