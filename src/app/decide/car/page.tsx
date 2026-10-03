import { redirect } from "next/navigation";

// The car journey lives at /check. This keeps old links working and opens it at the car's price.
export default function CarPage() {
  redirect("/check?step=3");
}
