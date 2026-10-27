import type { ReactNode } from "react";
import { PageShell } from "@/components/site-chrome";

export const LEGAL = {
  name: "Hotel Status Residency",
  address: "TTC Industrial Area, Mahape, Navi Mumbai 400710, Maharashtra, India",
  gstin: "27ATAPP6184D2ZL",
  email: "contact@hotelstatusresidency.com",
  updated: "27 October 2026",
};

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs tracking-[0.22em] text-gold uppercase">{LEGAL.name}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated {LEGAL.updated}</p>
        <div className="mt-10 space-y-6 text-base leading-relaxed text-ink-soft [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {children}
          <h2>Contact</h2>
          <p>
            {LEGAL.name}, {LEGAL.address}. GSTIN {LEGAL.gstin}. Email{" "}
            <a href={`mailto:${LEGAL.email}`} className="underline">{LEGAL.email}</a>.
          </p>
        </div>
      </main>
    </PageShell>
  );
}
