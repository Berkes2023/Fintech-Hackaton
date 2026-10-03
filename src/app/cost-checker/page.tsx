import type { Metadata } from "next";
import { Suspense } from "react";
import { Checker } from "@/components/Checker";

export const metadata: Metadata = { title: "Cost checker" };

export default function CostCheckerPage() {
  return (
    <Suspense>
      <Checker />
    </Suspense>
  );
}
