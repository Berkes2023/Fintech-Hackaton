import type { Metadata } from "next";
import { CommitmentMap } from "@/components/CommitmentMap";

export const metadata: Metadata = { title: "Commitment map" };

export default function CommitmentsPage() {
  return (
    <div className="container section stack" style={{ gap: 32, paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">Commitment map</span>
        <h1 className="display">Everything you’re signed up to, in one place</h1>
        <p className="lead muted">We usually think about each product on its own. Seeing them together shows what really goes out each month, and when it stops.</p>
      </div>
      <CommitmentMap />
      <p className="small muted">Saved only in this browser. Nothing is sent anywhere.</p>
    </div>
  );
}
