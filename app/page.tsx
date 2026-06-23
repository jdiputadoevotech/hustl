import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center text-center gap-8 py-20">
      <span className="text-xs font-medium px-3 py-1 rounded-full border text-muted-foreground">
        For University of San Carlos students
      </span>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl">
        Get it done by a fellow Carolinian.
      </h1>
      <p className="text-muted-foreground max-w-xl text-lg">
        Hustl is the campus gig marketplace. Hire USC students for design,
        coding, tutoring, and more — or post your own services and start earning.
        Chat happens on Messenger; payment is settled peer-to-peer.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/gigs">Browse gigs</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/gigs/new">Post a gig</Link>
        </Button>
      </div>
    </div>
  );
}
