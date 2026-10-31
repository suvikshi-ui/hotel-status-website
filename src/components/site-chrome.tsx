import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HOTEL } from "@/lib/hotels";

const NAV = [
  { label: "Rooms", hash: "rooms" },
  { label: "Gallery", hash: "gallery" },
  { label: "Amenities", hash: "amenities" },
  { label: "Around", hash: "around" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#c6a15a]/70 bg-[#12263d] text-cream shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-6 px-4 py-2 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3 text-cream lg:shrink-0" onClick={() => setOpen(false)}>
          <img
            src="/hotels/logo-digital.png?v=real"
            alt="Hotel Status Residency logo"
            className="size-14 shrink-0 object-contain sm:size-16 xl:size-20"
          />
          <span className="min-w-0">
            <span className="block font-display text-lg leading-tight font-medium tracking-[0.04em] text-balance sm:text-2xl lg:text-xl lg:whitespace-nowrap xl:text-2xl">
              Hotel Status Residency
            </span>
            <span className="block text-[0.65rem] tracking-[0.22em] text-[#c6a15a] uppercase">Mahape</span>
          </span>
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.hash}
              to="/"
              hash={item.hash}
              className="flex h-11 items-center px-3 text-xs tracking-[0.18em] text-cream/80 uppercase hover:text-[#e4c98a]"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/bookings"
            className="flex h-11 items-center px-3 text-xs tracking-[0.18em] text-cream/80 uppercase hover:text-[#e4c98a]"
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
        <div className="border-t border-[#c6a15a]/30 bg-[#12263d] px-4 py-3 xl:hidden">
          <div className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.hash}
                to="/"
                hash={item.hash}
                className="flex h-11 items-center text-sm tracking-[0.16em] text-cream uppercase"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
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
    <footer className="border-t border-[#c6a15a]/50 bg-[#0b1626] text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <img src="/hotels/logo-digital.png?v=real" alt="" className="mb-4 h-16 w-16 object-contain" />
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
          <p className="mt-1">
            <a href={`mailto:${HOTEL.contactEmail}`} className="text-cream">
              {HOTEL.contactEmail}
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
