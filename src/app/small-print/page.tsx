import type { Metadata } from "next";
import { SmallPrint } from "@/components/SmallPrint";

export const metadata: Metadata = { title: "Read the small print" };

export default function SmallPrintPage() {
  return (
    <div className="container section stack" style={{ gap: 24, paddingTop: 48 }}>
      <div className="stack" style={{ maxWidth: 760, gap: 8 }}>
        <span className="caption">Read the small print</span>
        <h1 className="display">What does this agreement actually say?</h1>
        <p className="lead muted">Paste or upload the terms. AI reads them and shows the exact words behind each value; our code works out the cost and what it changes for you.</p>
      </div>
      <SmallPrint />
    </div>
  );
}
