import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center text-center gap-8 py-20">
      <span className="text-xs font-medium px-3 py-1 rounded-full border text-muted-foreground">
        For University of San Carlos students
      </span>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl">
        The campus job board for Carolinians.
      </h1>
      <p className="text-muted-foreground max-w-xl text-lg">
        Hustl connects USC students with gigs and part- or full-time work. Browse
        openings, message employers, and get hired — chatting happens on
        Messenger, hiring is tracked here.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/jobs">Browse jobs</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/jobs/new">Post a job</Link>
        </Button>
      </div>
    </div>
  );
}
