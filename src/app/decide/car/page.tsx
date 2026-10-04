import { redirect } from "next/navigation";

// The car journey lives at /check. This keeps old links working and opens it with the car goal remembered (credit comes first).
export default function CarPage() {
  redirect("/check?goal=car");
}
