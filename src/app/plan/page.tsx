import type { Metadata } from "next";
import { Suspense } from "react";
import { Journey } from "@/components/Journey";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
  return (
    <div className="container section stack" style={{ gap: 24, paddingTop: 40 }}>
      <Suspense>
        <Journey />
      </Suspense>
    </div>
  );
}
