import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HOTEL } from "@/lib/hotels";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3 text-ink" onClick={() => setOpen(false)}>
          <img src="/hotels/logo-mark.png" alt="" className="size-14 shrink-0 object-contain sm:size-16" />
          <span className="min-w-0">
            <span className="block font-display text-xl font-semibold tracking-tight sm:text-2xl">
              Hotel Status Residency
            </span>
            <span className="block text-[0.65rem] tracking-[0.22em] text-muted uppercase">Mahape</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            hash="stay"
            className="flex h-11 items-center px-3 text-xs tracking-[0.18em] text-ink uppercase"
          >
            Stay
          </Link>
          <Link
            to="/"
            hash="rooms"
            className="flex h-11 items-center px-3 text-xs tracking-[0.18em] text-ink uppercase"
          >
            Rooms
          </Link>
          <Link
            to="/"
            hash="amenities"
            className="flex h-11 items-center px-3 text-xs tracking-[0.18em] text-ink uppercase"
          >
            Amenities
          </Link>
          <Link
            to="/"
            hash="around"
            className="flex h-11 items-center px-3 text-xs tracking-[0.18em] text-ink uppercase"
          >
            Around
          </Link>
          <Link
            to="/"
            hash="gallery"
            className="flex h-11 items-center px-3 text-xs tracking-[0.18em] text-ink uppercase"
          >
            Gallery
          </Link>
          <Button asChild size="sm" variant="ink" className="ml-3 rounded-none tracking-[0.16em] uppercase">
            <Link to="/contact">Book a stay</Link>
          </Button>
        </nav>

        <button
          type="button"
          className="flex size-11 items-center justify-center text-ink md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-ink/10 bg-paper px-4 py-3 md:hidden">
          <div className="flex flex-col">
            <Link to="/" hash="stay" className="flex h-11 items-center text-sm tracking-[0.16em] text-ink uppercase" onClick={() => setOpen(false)}>
              Stay
            </Link>
            <Link to="/" hash="rooms" className="flex h-11 items-center text-sm tracking-[0.16em] text-ink uppercase" onClick={() => setOpen(false)}>
              Rooms
            </Link>
            <Link to="/" hash="amenities" className="flex h-11 items-center text-sm tracking-[0.16em] text-ink uppercase" onClick={() => setOpen(false)}>
              Amenities
            </Link>
            <Link to="/" hash="around" className="flex h-11 items-center text-sm tracking-[0.16em] text-ink uppercase" onClick={() => setOpen(false)}>
              Around
            </Link>
            <Link to="/" hash="gallery" className="flex h-11 items-center text-sm tracking-[0.16em] text-ink uppercase" onClick={() => setOpen(false)}>
              Gallery
            </Link>
            <Button asChild variant="ink" className="mt-2 w-full rounded-none tracking-[0.16em] uppercase">
              <Link to="/contact" onClick={() => setOpen(false)}>
                Book a stay
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight">Hotel Status Residency</p>
          <p className="mt-3 text-sm text-cream/70">Mahape, Navi Mumbai · PIN {HOTEL.pins[0]}</p>
        </div>
        <div className="text-sm text-cream/70">
          <p className="text-xs tracking-[0.18em] text-gold uppercase">Contact</p>
          <p className="mt-3">Ask the hotel directly. Phone and email will be added on the contact page.</p>
        </div>
        <div className="text-sm text-cream/70">
          <p className="text-xs tracking-[0.18em] text-gold uppercase">The stay</p>
          <p className="mt-3">Deluxe, Super Deluxe and Suite rooms. Wi-Fi, parking, and a 24-hour front desk.</p>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
