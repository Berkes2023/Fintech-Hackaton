import type { Metadata } from "next";
import { FirewallDemo } from "@/components/FirewallDemo";

export const metadata: Metadata = { title: "Commitment Firewall (future vision)" };

export default function FirewallPage() {
  return (
    <div className="container section stack" style={{ gap: 40, paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 780 }}>
        <span className="caption">Future vision · Commitment Firewall</span>
        <h1 className="display">Before You Sign, at the moment you need it</h1>
        <p className="lead muted">
          Today, people come to Before You Sign to explore a decision. Next, it could come to them: an optional browser companion that notices a significant financial commitment and offers a short summary before checkout. It informs; it never blocks.
        </p>
      </div>
      <FirewallDemo />
      <div className="grid-3">
        <div className="list stack"><span className="caption">Recognise</span><p className="h3">At the right moment</p><p className="small muted">It spots a pay-monthly checkout or a finance agreement and quietly offers a card beside it.</p></div>
        <div className="list stack"><span className="caption">Inform</span><p className="h3">The real commitment</p><p className="small muted">The monthly cost, the total, how long it lasts, the conditions that matter, and what it could mean for your financial picture.</p></div>
        <div className="list stack"><span className="caption">Respect</span><p className="h3">Never in the way</p><p className="small muted">Dismiss it and carry on at any time. It never stops a purchase or decides for you.</p></div>
      </div>
      <p className="small muted">“Commitment Firewall” is a concept name for this future idea. It isn’t part of the current prototype beyond this demonstration.</p>
    </div>
  );
}
