import { redirect } from "next/navigation";

// Merged into the single About page.
export default function ResponsibleAIPage() {
  redirect("/about#ai");
}
