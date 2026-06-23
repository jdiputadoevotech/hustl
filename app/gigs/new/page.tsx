import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GigForm } from "@/components/marketplace/gig-form";
import { createGig } from "../actions";

export const metadata = { title: "Post a gig — Hustl" };

type SearchParams = Promise<{ error?: string }>;

export default async function NewGigPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (!user.isSeller) {
    return (
      <div className="py-10 max-w-xl">
        <h1 className="text-2xl font-bold mb-3">Post a gig</h1>
        <p className="text-muted-foreground">
          Only verified Carolinians (an <code>@usc.edu.ph</code> email) can post
          gigs. You&apos;re signed in as a client account, so you can browse and
          hire, but not sell.
        </p>
      </div>
    );
  }

  return (
    <div className="py-10 space-y-6">
      <h1 className="text-2xl font-bold">Post a gig</h1>
      <GigForm action={createGig} submitLabel="Publish gig" error={error} />
    </div>
  );
}
