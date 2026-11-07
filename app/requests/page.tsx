import { redirect } from "next/navigation";

// Requests are managed from the requester dashboard.
export default function RequestsPage() {
  redirect("/dashboard");
}
