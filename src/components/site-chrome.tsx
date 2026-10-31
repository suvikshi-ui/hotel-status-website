import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HOTEL } from "@/lib/hotels";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#c6a15a]/40 bg-[#3c1620] text-cream">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-6 px-4 py-2 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3 text-cream lg:shrink-0" onClick={() => setOpen(false)}>
          <img
            src="/hotels/logo-digital.png?v=5"
            alt="Hotel Status Residency logo"
            className="size-14 shrink-0 object-contain sm:size-16 xl:size-20"
          />
          <span className="min-w-0">
            <span className="block font-display text-2xl leading-none font-medium tracking-tight text-balance sm:text-3xl xl:text-[1.7rem] xl:whitespace-nowrap">
              Hotel Status Residency
            </span>
            <span className="block text-[0.65rem] tracking-[0.22em] text-[#c6a15a] uppercase">Mahape</span>
          </span>
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 xl:flex">
          <Link
            to="/"
            hash="stay"
            className="flex h-11 items-center px-3 font-display text-lg tracking-[0.12em] text-cream/85 uppercase hover:text-[#e4c98a]"
          >
            Stay
          </Link>
          <Link
            to="/"
            hash="rooms"
            className="flex h-11 items-center px-3 font-display text-lg tracking-[0.12em] text-cream/85 uppercase hover:text-[#e4c98a]"
          >
            Rooms
          </Link>
          <Link
            to="/"
            hash="amenities"
            className="flex h-11 items-center px-3 font-display text-lg tracking-[0.12em] text-cream/85 uppercase hover:text-[#e4c98a]"
          >
            Amenities
          </Link>
          <Link
            to="/"
            hash="around"
            className="flex h-11 items-center px-3 font-display text-lg tracking-[0.12em] text-cream/85 uppercase hover:text-[#e4c98a]"
          >
            Around
          </Link>
          <Link
            to="/"
            hash="gallery"
            className="flex h-11 items-center px-3 font-display text-lg tracking-[0.12em] text-cream/85 uppercase hover:text-[#e4c98a]"
          >
            Gallery
          </Link>
          <Link
            to="/bookings"
            className="flex h-11 items-center px-3 font-display text-lg tracking-[0.12em] text-cream/85 uppercase hover:text-[#e4c98a]"
          >
            Your stay
          </Link>
          <Button asChild size="sm" variant="gold" className="ml-3 rounded-none tracking-[0.16em] uppercase">
            <Link to="/book/$hotelId" params={{ hotelId: HOTEL.id }}>
              Book a stay
            </Link>
          </Button>
        </nav>

        <div className="flex shrink-0 items-center xl:hidden">
          <Button asChild size="sm" variant="gold" className="rounded-none px-3 tracking-[0.14em] uppercase">
            <Link to="/book/$hotelId" params={{ hotelId: HOTEL.id }}>
              Book
            </Link>
          </Button>
          <button
            type="button"
            className="flex size-11 items-center justify-center text-cream"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-[#c6a15a]/30 bg-[#3c1620] px-4 py-3 xl:hidden">
          <div className="flex flex-col">
            <Link to="/" hash="stay" className="flex h-11 items-center text-sm tracking-[0.16em] text-cream uppercase" onClick={() => setOpen(false)}>
              Stay
            </Link>
            <Link to="/" hash="rooms" className="flex h-11 items-center text-sm tracking-[0.16em] text-cream uppercase" onClick={() => setOpen(false)}>
              Rooms
            </Link>
            <Link to="/" hash="amenities" className="flex h-11 items-center text-sm tracking-[0.16em] text-cream uppercase" onClick={() => setOpen(false)}>
              Amenities
            </Link>
            <Link to="/" hash="around" className="flex h-11 items-center text-sm tracking-[0.16em] text-cream uppercase" onClick={() => setOpen(false)}>
              Around
            </Link>
            <Link to="/" hash="gallery" className="flex h-11 items-center text-sm tracking-[0.16em] text-cream uppercase" onClick={() => setOpen(false)}>
              Gallery
            </Link>
            <Link to="/bookings" className="flex h-11 items-center text-sm tracking-[0.16em] text-cream uppercase" onClick={() => setOpen(false)}>
              Your stay
            </Link>
            <Button asChild variant="gold" className="mt-2 w-full rounded-none tracking-[0.16em] uppercase">
              <Link to="/book/$hotelId" params={{ hotelId: HOTEL.id }} onClick={() => setOpen(false)}>
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
    <footer className="border-t border-[#c6a15a]/50 bg-[#2a1016] text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight">Hotel Status Residency</p>
          <p className="mt-3 text-sm text-cream/70">Mahape, Navi Mumbai · PIN {HOTEL.pins[0]}</p>
        </div>
        <div className="text-sm text-cream/70">
          <p className="text-xs tracking-[0.18em] text-gold uppercase">Contact</p>
          <p className="mt-3">
            {HOTEL.phones.map((phone, index) => (
              <span key={phone}>
                {index > 0 ? " · " : null}
                <a href={`tel:+91${phone}`} className="tabular-nums text-cream">
                  {phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                </a>
              </span>
            ))}
          </p>
          <p className="mt-2">
            <a href={`mailto:${HOTEL.email}`} className="text-cream">
              {HOTEL.email}
            </a>
          </p>
        </div>
        <div className="text-sm text-cream/70">
          <p className="text-xs tracking-[0.18em] text-gold uppercase">The stay</p>
          <p className="mt-3">Deluxe and Suite rooms. Wi-Fi, parking, and a 24-hour front desk.</p>
          <p className="mt-4 flex flex-col gap-2">
            <Link to="/book/$hotelId" params={{ hotelId: HOTEL.id }} className="text-cream">
              Book a stay
            </Link>
            <Link to="/bookings" className="text-cream">
              Find your stay
            </Link>
            <Link to="/owner" className="text-cream">
              Owner desk
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <nav aria-label="Legal" className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-4 py-5 text-xs text-cream/70 sm:px-6 lg:px-8">
          <Link to="/terms" className="text-cream">Terms of Service</Link>
          <Link to="/privacy" className="text-cream">Privacy Policy</Link>
          <Link to="/refund" className="text-cream">Refund &amp; Cancellation Policy</Link>
          <span>GSTIN 27ATAPP6184D2ZL</span>
        </nav>
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
