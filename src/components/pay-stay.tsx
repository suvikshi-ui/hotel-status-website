import { Button } from "@/components/ui/button";
import type { BookingRow } from "@/lib/bookings.functions";
import { formatInr } from "@/lib/format";
import { HOTEL } from "@/lib/hotels";

function holdTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

export function PayStay({ row }: { row: BookingRow }) {
  if (row.status === "cancelled") return null;
  if (row.payment_status === "paid") {
    return <p className="mt-3 text-sm text-success">Paid {formatInr(row.amount_paid)} on Razorpay.</p>;
  }
  if (row.payment_status === "partial") {
    return (
      <p className="mt-3 text-sm text-success">
        Advance of {formatInr(row.amount_paid)} received. Pay the balance of {formatInr(row.balance)} at the hotel.
      </p>
    );
  }
  if (row.payment_status === "pay_at_hotel") {
    return (
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Confirmed with pay at hotel. Pay {formatInr(row.total_amount)} at check-in.
      </p>
    );
  }
  if (row.status === "expired") {
    return (
      <p className="mt-3 text-sm text-terracotta">
        The payment window closed and the rooms were released. Book again, or call {HOTEL.phones[0]}.
      </p>
    );
  }
  if (!row.payment_url) {
    return (
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        The rooms are held. The Razorpay link is not ready yet — call {HOTEL.phones[0]} and quote the booking number.
      </p>
    );
  }
  return (
    <div className="mt-5">
      <Button asChild variant="ink" className="rounded-none tracking-[0.16em] uppercase">
        <a href={row.payment_url}>
          Pay {formatInr(row.amount_due_now)}
          {row.payment_mode === "advance" ? " advance" : ""}
        </a>
      </Button>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Rooms are held until {holdTime(row.hold_expires_at)} while you pay. Pay by UPI, QR, net banking, or card on
        Razorpay. Card numbers stay on Razorpay, not on this site.
        {row.payment_mode === "advance" ? ` The balance of ${formatInr(row.total_amount - row.amount_due_now)} is paid at the hotel.` : ""}
      </p>
    </div>
  );
}
