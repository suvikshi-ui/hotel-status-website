import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/format";
import { HOTEL } from "@/lib/hotels";

export function PayStay({
  status,
  url,
  amount,
}: {
  status: "unpaid" | "paid";
  url: string | null;
  amount: number;
}) {
  if (status === "paid") {
    return <p className="mt-3 text-sm text-success">Paid {formatInr(amount)} on Razorpay.</p>;
  }
  if (!url) {
    return (
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        The room is booked. The Razorpay link is not ready yet — call {HOTEL.phones[0]} and quote the booking number.
      </p>
    );
  }
  return (
    <div className="mt-5">
      <Button asChild variant="ink" className="rounded-none tracking-[0.16em] uppercase">
        <a href={url}>Pay {formatInr(amount)}</a>
      </Button>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Opens Razorpay for this total. Pay by UPI, QR, net banking, or card. Card numbers stay on Razorpay, not on this
        site.
      </p>
    </div>
  );
}
