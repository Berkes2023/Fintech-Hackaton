import { redirect } from "next/navigation";

// "Think a decision through" is now part of Plan step by step. Old links keep working, query and all.
export default async function CheckPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") q.set(k, v);
  redirect(q.size ? `/plan?${q}` : "/plan");
}
