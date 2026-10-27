import { HOTEL } from "@/lib/hotels";
import type { BookingRow } from "@/lib/bookings.server";

const ROOM_NAMES: Record<string, string> = {
  deluxe: "Deluxe",
  "super-deluxe": "Super Deluxe",
  suite: "Suite",
};

function hotelMessage(row: BookingRow): string {
  const room = ROOM_NAMES[row.room_type] ?? row.room_type;
  return [
    "New booking at Hotel Status Residency.",
    `Booking ID: ${row.id}`,
    `Guest: ${row.guest_name}`,
    `Phone: ${row.phone}`,
    `Room: ${room}`,
    `Check-in: ${row.check_in}`,
    `Check-out: ${row.check_out}`,
    `Guests: ${row.guests}`,
    `Total: ₹${row.total_amount}`,
  ].join("\n");
}

function waPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

async function sendWhatsApp(to: string, row: BookingRow, text: string): Promise<void> {
  const room = ROOM_NAMES[row.room_type] ?? row.room_type;
  await sendWhatsAppTemplate(
    to,
    process.env.WHATSAPP_TEMPLATE?.trim() || "booking_confirmed",
    [row.guest_name, row.id, room, row.check_in, row.check_out, String(row.guests), `₹${row.total_amount}`],
    text,
  );
}

/**
 * WhatsApp Cloud API: send an approved template with body parameters, falling
 * back to plain text (only delivered inside a 24h customer window). No-op
 * without WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID.
 */
export async function sendWhatsAppTemplate(
  to: string,
  template: string,
  params: string[],
  text: string,
): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return;
  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: waPhone(to),
      type: "template",
      template: {
        name: template,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: params.map((value) => ({ type: "text", text: value })),
          },
        ],
      },
    }),
  });
  if (response.ok) return;
  await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: waPhone(to),
      type: "text",
      text: { body: text },
    }),
  });
}

async function sendEmail(subject: string, text: string): Promise<void> {
  await sendMail(HOTEL.email, subject, text);
}

/** Gmail SMTP (app password). No-op without GMAIL_USER / GMAIL_APP_PASSWORD. */
export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return;
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  await transport.sendMail({
    from: `"Hotel Status Residency" <${user}>`,
    to,
    replyTo: HOTEL.email,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}

export { ROOM_NAMES };

export async function notifyOwnerOfBooking(row: BookingRow): Promise<void> {
  const text = hotelMessage(row);
  const jobs = [
    sendEmail(`New booking ${row.id}`, text),
    ...HOTEL.phones.map((phone) => sendWhatsApp(phone, row, text)),
  ];
  await Promise.allSettled(jobs);
}

export async function notifyOwnerOfPayment(row: BookingRow): Promise<void> {
  const text = [
    `Payment received for ${row.id}.`,
    `Guest: ${row.guest_name}`,
    `Paid: ₹${row.amount_paid} of ₹${row.total_amount}`,
    row.total_amount > row.amount_paid ? `Balance at hotel: ₹${row.total_amount - row.amount_paid}` : "Fully paid",
  ].join("\n");
  await Promise.allSettled([sendMail(HOTEL.email, `Payment ${row.id}`, text)]);
}
