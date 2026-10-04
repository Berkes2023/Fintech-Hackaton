import type { Metadata } from "next";
import { Suspense } from "react";
import { Journey } from "@/components/Journey";

// The simplified wizard for goals other than a car (home, improvements, purchases, education, saving). Reached from the Plan goal step.
export const metadata: Metadata = { title: "Plan: simplified journey" };

export default function SimplePlanPage() {
  return (
    <div className="container section stack" style={{ gap: 24, paddingTop: 40 }}>
      <Suspense>
        <Journey />
      </Suspense>
    </div>
  );
}
