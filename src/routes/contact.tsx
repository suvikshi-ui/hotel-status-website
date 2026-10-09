import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
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
          Book a room online, or call the front desk. Both numbers are answered through the day and night.
        </p>
        <Button asChild variant="ink" className="mt-8 rounded-none tracking-[0.16em] uppercase">
          <Link to="/book/$hotelId" params={{ hotelId: HOTEL.id }}>
            Book a stay
          </Link>
        </Button>

        <dl className="mt-12 divide-y divide-ink/10 border-y border-ink/10">
          <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
            <dt className="text-xs tracking-[0.18em] text-muted uppercase">Address</dt>
            <dd className="leading-relaxed">{HOTEL.address}</dd>
          </div>
          <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
            <dt className="text-xs tracking-[0.18em] text-muted uppercase">Phone</dt>
            <dd className="flex flex-col gap-2">
              {HOTEL.phones.map((phone) => (
                <a key={phone} href={`tel:+91${phone}`} className="tabular-nums">
                  {phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                </a>
              ))}
            </dd>
          </div>
          <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
            <dt className="text-xs tracking-[0.18em] text-muted uppercase">Email</dt>
            <dd>
              <a href={`mailto:${HOTEL.email}`}>{HOTEL.email}</a>
            </dd>
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
