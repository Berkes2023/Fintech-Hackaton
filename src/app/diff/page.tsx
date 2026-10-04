import type { Metadata } from "next";
import Link from "next/link";
import { ContractDiff } from "@/components/ContractDiff";

export const metadata: Metadata = { title: "Contract diff" };

export default function DiffPage() {
  return (
    <div className="container section stack" style={{ gap: 32, paddingTop: 56 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">Contract diff</span>
        <h1 className="display">Two offers, compared clause by clause</h1>
        <p className="lead muted">Upload or paste two offers. We translate both into the same Product DNA, then show exactly where they differ.</p>
        <p className="small muted">Needs the AI reader. Without it, use <Link href="/compare" className="link">Compare</Link> with typed figures.</p>
      </div>
      <ContractDiff />
    </div>
  );
}
