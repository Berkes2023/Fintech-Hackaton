"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GOALS, type Goal } from "@/lib/journey";
import { journeyStore } from "@/lib/store";
import { Icon } from "./Icon";
import { startGoal } from "./Journey";

const TOOLS = [
  { href: "/check#paste", title: "I’ve been offered something", desc: "Decode the small print", icon: "doc" },
  { href: "/compare", title: "Compare offers", desc: "Side by side, clause by clause", icon: "compare" },
  { href: "/commitments", title: "My commitments", desc: "Everything I already pay", icon: "chart" },
  { href: "/learn", title: "Learn the words", desc: "APR, EAR and more, in plain English", icon: "book" },
];

/** The home dashboard: pick what you want to do, and the wizard takes it from there. */
export function Dashboard() {
  const router = useRouter();
  const open = (g: Goal) => {
    if (g === "car") { router.push("/decide/car"); return; }
    journeyStore.set(startGoal(journeyStore.get(), g));
    router.push("/plan?step=1");
  };
  return (
    <div className="dash anchor-target" id="dashboard">
      <Link href="/start" className="dash-unsure">
        <span><b>Not sure where to start?</b><span className="small">Answer three quick questions and we’ll point you somewhere useful.</span></span>
        <span className="dash-go" aria-hidden="true" style={{ position: "static" }}><Icon name="arrow" size={18} /></span>
      </Link>
      <div className="dash-goals">
        {(Object.keys(GOALS) as Goal[]).map((g) => (
          <button key={g} type="button" className="dash-tile" onClick={() => open(g)}>
            <span className="icon"><Icon name={GOALS[g].icon} size={24} /></span>
            <b>{GOALS[g].label}</b>
            <span className="small">{GOALS[g].blurb}</span>
            <span className={g === "car" ? "dash-tag full" : "dash-tag"}>{g === "car" ? "Full journey" : "Simplified"}</span>
            <span className="dash-go" aria-hidden="true"><Icon name="arrow" size={18} /></span>
          </button>
        ))}
        <Link href="/start" className="dash-tile">
          <span className="icon"><Icon name="spark" size={24} /></span>
          <b>Something else</b>
          <span className="small">Answer a few questions and we’ll suggest where to start</span>
          <span className="dash-go" aria-hidden="true"><Icon name="arrow" size={18} /></span>
        </Link>
      </div>
      <div className="dash-tools">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="dash-tool">
            <Icon name={t.icon} size={20} />
            <span><b>{t.title}</b><span className="small muted">{t.desc}</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
