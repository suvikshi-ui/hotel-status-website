import { Button } from "@/components/ui/button";
import { bookingNote, gmailHref, whatsAppHref, type BookingNote } from "@/lib/booking-note";

export function SendBooking({ stay }: { stay: BookingNote }) {
  const note = bookingNote(stay);
  return (
    <div className="mt-5">
      <p className="text-sm leading-relaxed text-ink-soft">
        Send the booking ID and details to this WhatsApp number and Gmail.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="ink" className="rounded-none tracking-[0.14em] uppercase">
          <a href={whatsAppHref(stay.phone, note)} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-none tracking-[0.14em] uppercase">
          <a href={gmailHref(stay.email, stay.id, note)} target="_blank" rel="noreferrer">
            Gmail
          </a>
        </Button>
      </div>
    </div>
  );
}
