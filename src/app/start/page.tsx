import type { Metadata } from "next";
import { StartGuide } from "@/components/StartGuide";

export const metadata: Metadata = { title: "Not sure where to start?" };

export default function StartPage() {
  return (
    <div className="container section stack" style={{ gap: 24, paddingTop: 40 }}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <span className="caption">Not sure where to start?</span>
        <h1 className="display">Let’s figure it out together</h1>
      </div>
      <StartGuide />
    </div>
  );
}
