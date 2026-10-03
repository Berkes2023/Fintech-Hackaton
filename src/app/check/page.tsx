import type { Metadata } from "next";
import { Suspense } from "react";
import { CarJourney } from "@/components/CarJourney";

export const metadata: Metadata = { title: "Before you sign: think it through" };

export default function CheckPage() {
  return (
    <div className="container section stack" style={{ gap: 20, paddingTop: 40 }}>
      <span className="caption">Before You Sign · What could this decision mean for my situation?</span>
      <Suspense>
        <CarJourney />
      </Suspense>
    </div>
  );
}
