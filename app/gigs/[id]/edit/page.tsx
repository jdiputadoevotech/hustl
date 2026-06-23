import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { GigForm } from "@/components/marketplace/gig-form";
import { updateGig } from "../../actions";

export const metadata = { title: "Edit gig — Hustl" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function EditGigPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: gig } = await supabase
    .from("gigs")
    .select("id, title, description, price, category, image_url, student_id")
    .eq("id", id)
    .single();

  if (!gig) notFound();
  if (gig.student_id !== user.id) redirect(`/gigs/${id}`);

  return (
    <div className="py-10 space-y-6">
      <h1 className="text-2xl font-bold">Edit gig</h1>
      <GigForm
        action={updateGig.bind(null, id)}
        gig={gig}
        submitLabel="Save changes"
        error={error}
      />
    </div>
  );
}
