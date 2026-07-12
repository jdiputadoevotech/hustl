import { redirect } from "next/navigation";

// Overview is the admin landing.
export default function AdminIndex() {
  redirect("/admin/overview");
}
