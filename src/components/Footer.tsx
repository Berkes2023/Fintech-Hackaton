import Link from "next/link";
import { NAV } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="stack" style={{ alignContent: "start" }}>
            <span className="wordmark">Before You <span>Sign</span></span>
            <p className="small" style={{ color: "#a6a6aa", maxWidth: "36ch" }}>
              Making financial decisions easier to understand. Built for the UKFinnovator Bristol 2026 hackathon, “Money, Explained” challenge.
            </p>
          </div>
          {NAV.slice(0, 3).map((g) => (
            <div key={g.key}>
              <h4>{g.label}</h4>
              <ul>
                {g.links.map((l) => <li key={l.href}><Link href={l.href} className="small">{l.title}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="legal">
          <p>
            Before You Sign is a prototype. It is not financial advice, is not authorised by the FCA, and is not connected to any bank.
            Figures are estimates based on what you enter. Always read the provider’s own documents before you commit.
          </p>
          <p style={{ marginTop: 8 }}>
            Free, impartial help: MoneyHelper, moneyhelper.org.uk, 0800 138 7777 · StepChange, stepchange.org, 0800 138 1111.
          </p>
          <nav className="footer-legal" aria-label="Legal">
            <Link href="/agreement">User agreement</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms &amp; conditions</Link>
            <Link href="/about#sources">Sources &amp; methodology</Link>
            <Link href="/about">About</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
