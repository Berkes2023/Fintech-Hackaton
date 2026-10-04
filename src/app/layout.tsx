import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import Link from "next/link";
import { AgreementBanner } from "@/components/Acknowledge";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

// DM Sans stands in for Aeonik Pro (display, weight 500); Inter carries the UI.
const display = DM_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-sans" });
const ui = Inter({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Before You Sign", template: "%s · Before You Sign" },
  description: "A monthly payment tells you what leaves your account. Before You Sign shows what it could leave you with, before you sign. We explain; you decide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${ui.variable}`}>
      <body>
        <div className="promo">
          Built for UKFinnovator Bristol 2026: Money, Explained. <Link href="/about">See how it works</Link>
        </div>
        <Header />
        <main>{children}</main>
        <Footer />
        <AgreementBanner />
      </body>
    </html>
  );
}
