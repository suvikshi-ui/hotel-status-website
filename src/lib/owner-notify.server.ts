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
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return;
  const template = process.env.WHATSAPP_TEMPLATE?.trim() || "booking_confirmed";
  const room = ROOM_NAMES[row.room_type] ?? row.room_type;
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
            parameters: [
              { type: "text", text: row.guest_name },
              { type: "text", text: row.id },
              { type: "text", text: room },
              { type: "text", text: row.check_in },
              { type: "text", text: row.check_out },
              { type: "text", text: String(row.guests) },
              { type: "text", text: `₹${row.total_amount}` },
            ],
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
    to: HOTEL.email,
    subject,
    text,
  });
}

export async function notifyOwnerOfBooking(row: BookingRow): Promise<void> {
  const text = hotelMessage(row);
  const jobs = [
    sendEmail(`New booking ${row.id}`, text),
    ...HOTEL.phones.map((phone) => sendWhatsApp(phone, row, text)),
  ];
  await Promise.allSettled(jobs);
}
