import type { Metadata } from "next";
import { Suspense } from "react";
import { CarJourney } from "@/components/CarJourney";

export const metadata: Metadata = { title: "Plan a decision" };

/** The one guided journey: your situation, credit context, goal, purchase, finance, future, consequences, what-ifs, small print, summary. */
export default function PlanPage() {
  return (
    <div className="container section stack" style={{ gap: 20, paddingTop: 40 }}>
      <h1 className="caption">Plan a decision · What could this decision change for me?</h1>
      <Suspense>
        <CarJourney />
      </Suspense>
    </div>
  );
}
