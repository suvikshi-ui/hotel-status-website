import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site-chrome";
import { HOTEL } from "@/lib/hotels";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

const MAP =
  "https://www.google.com/maps/search/?api=1&query=Hotel+Status+Residency+Mahape+MIDC+Navi+Mumbai";

function ContactPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs tracking-[0.22em] text-gold uppercase">Hotel Status Residency</p>
        <h1 className="mt-3 font-display text-5xl font-semibold">Contact</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          This page is for enquiries. A stay is arranged directly with the hotel. Phone and email will be added here.
        </p>

        <dl className="mt-12 divide-y divide-ink/10 border-y border-ink/10">
          <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
            <dt className="text-xs tracking-[0.18em] text-muted uppercase">Address</dt>
            <dd className="leading-relaxed">{HOTEL.address}</dd>
          </div>
          <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
            <dt className="text-xs tracking-[0.18em] text-muted uppercase">Phone</dt>
            <dd className="text-ink-soft">To be added</dd>
          </div>
          <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
            <dt className="text-xs tracking-[0.18em] text-muted uppercase">Email</dt>
            <dd className="text-ink-soft">To be added</dd>
          </div>
          <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
            <dt className="text-xs tracking-[0.18em] text-muted uppercase">Front desk</dt>
            <dd>Open through the day and night</dd>
          </div>
        </dl>

        <a
          href={MAP}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex h-11 items-center border border-ink px-5 text-xs tracking-[0.16em] uppercase"
        >
          Open in maps
        </a>
      </main>
    </PageShell>
  );
}
