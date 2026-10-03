import type { Metadata } from "next";
import { FirewallDemo } from "@/components/FirewallDemo";

export const metadata: Metadata = { title: "Commitment Firewall" };

export default function FirewallPage() {
  return (
    <div className="container section stack" style={{ gap: 40, paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 780 }}>
        <span className="caption">Concept demo · Commitment Firewall</span>
        <h1 className="display">A moment of understanding before every commitment</h1>
        <p className="lead muted">
          Built into a checkout, Before You Sign could sit between “Confirm” and the commitment. It never blocks and never decides. It just makes sure the real cost is seen first.
        </p>
      </div>
      <FirewallDemo />
      <div className="grid-3">
        <div className="list stack"><span className="caption">1 · Intercept</span><p className="h3">At the click</p><p className="small muted">The check appears when someone confirms a pay-monthly purchase, not in a separate app they have to remember.</p></div>
        <div className="list stack"><span className="caption">2 · Translate</span><p className="h3">The real number</p><p className="small muted">£89 a month becomes £3,353 in total, with the end date and the terms that matter.</p></div>
        <div className="list stack"><span className="caption">3 · Respect</span><p className="h3">Your decision</p><p className="small muted">“Explain it first” or “Continue”. Both are always available. The person stays in control.</p></div>
      </div>
    </div>
  );
}
