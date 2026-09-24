import { Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <PageShell>
      <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
        <p className="text-sm tracking-widest text-gold uppercase">404</p>
        <h1 className="font-display text-4xl font-semibold">This page is empty.</h1>
        <p className="text-ink-soft">Hotel Status Residency, Mahape — head back home.</p>
        <Button asChild>
          <Link to="/">Home</Link>
        </Button>
      </main>
    </PageShell>
  );
}
