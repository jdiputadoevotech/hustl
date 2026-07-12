const STEPS = [
  {
    n: 1,
    title: "Browse & reach out",
    body: "Find a gig that fits and message the employer on Messenger.",
  },
  {
    n: 2,
    title: "Get hired",
    body: "Agree on the work — the hire is tracked here as a contract.",
  },
  {
    n: 3,
    title: "Review",
    body: "Once the contract is Completed, leave the employer a review.",
  },
];

/** Static 3-step explainer band for the home page. */
export function HowItWorks() {
  return (
    // Full-bleed muted band — breaks out of the site-shell container so the
    // background color separates this section from the gigs feed above.
    <section className="relative left-1/2 right-1/2 -mb-8 flex w-screen -mx-[50vw] flex-1 flex-col justify-center border-t bg-muted/40">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-14 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border bg-card p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-green-500 font-bold text-white">
                {s.n}
              </div>
              <h3 className="font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
