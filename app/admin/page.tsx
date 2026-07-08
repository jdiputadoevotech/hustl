import { redirect } from "next/navigation";

// No standalone overview yet — Users is the default admin landing.
export default function AdminIndex() {
  redirect("/admin/users");
}
