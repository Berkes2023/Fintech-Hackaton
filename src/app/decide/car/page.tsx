import type { Metadata } from "next";
import { Suspense } from "react";
import { CarJourney } from "@/components/CarJourney";

export const metadata: Metadata = { title: "Buy a car" };

export default function CarPage() {
  return (
    <div className="container section stack" style={{ gap: 20, paddingTop: 40 }}>
      <div className="stack" style={{ maxWidth: 820, gap: 8 }}>
        <span className="caption">Buy a car · What could this mean for my life before I commit?</span>
      </div>
      <Suspense>
        <CarJourney />
      </Suspense>
    </div>
  );
}
