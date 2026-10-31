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
    [
      row.guest_name,
      row.id,
      room,
      row.check_in,
      row.check_out,
      String(row.guests),
      `₹${row.total_amount}`,
    ],
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

type MailConfig = {
  transport: "smtp" | "gmail";
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

/** First non-empty env value among several accepted names (common aliases are tolerated). */
function envFirst(...names: string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

const SMTP_HOST = ["SMTP_HOST", "SMTP_SERVER", "MAIL_HOST", "EMAIL_HOST"];
const SMTP_USER = ["SMTP_USER", "SMTP_USERNAME", "MAIL_USER", "MAIL_USERNAME", "EMAIL_USER"];
const SMTP_PASS = ["SMTP_PASS", "SMTP_PASSWORD", "MAIL_PASS", "MAIL_PASSWORD", "EMAIL_PASS", "EMAIL_PASSWORD"];
const SMTP_PORT = ["SMTP_PORT", "MAIL_PORT", "EMAIL_PORT"];
const MAIL_FROM = ["MAIL_FROM", "SMTP_FROM", "EMAIL_FROM"];

/** SMTP config: generic SMTP_* (e.g. GoDaddy) first, then legacy GMAIL_* fallback. Logs only names/booleans. */
function smtpConfig(): MailConfig | null {
  const host = envFirst(...SMTP_HOST);
  const user = envFirst(...SMTP_USER);
  const pass = envFirst(...SMTP_PASS);
  const gUser = envFirst("GMAIL_USER");
  const gPass = envFirst("GMAIL_APP_PASSWORD", "GMAIL_PASSWORD", "GMAIL_PASS");
  const present = {
    smtpHost: host?.name ?? false,
    smtpUser: user ? user.name : false,
    smtpPass: pass ? pass.name : false,
    gmailUser: Boolean(gUser),
    gmailPass: Boolean(gPass),
  };
  if (host && user && pass) {
    const portRaw = envFirst(...SMTP_PORT)?.value;
    const port = Number(portRaw || 465) || 465;
    const secureRaw = process.env.SMTP_SECURE?.trim().toLowerCase();
    const secure = secureRaw === "true" ? true : secureRaw === "false" ? false : port === 465;
    const fromAddr = envFirst(...MAIL_FROM)?.value || user.value;
    console.log("[mail] transport=smtp", { host: host.value, port, secure, userPresent: true, passPresent: true, envNames: present });
    return {
      transport: "smtp",
      host: host.value,
      port,
      secure,
      user: user.value,
      pass: pass.value,
      from: fromAddr.includes("<") ? fromAddr : `"Hotel Status Residency" <${fromAddr}>`,
    };
  }
  if (gUser && gPass) {
    console.log("[mail] transport=gmail", { host: "smtp.gmail.com", port: 465, secure: true, userPresent: true, passPresent: true, envNames: present });
    return {
      transport: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      user: gUser.value,
      pass: gPass.value,
      from: `"Hotel Status Residency" <${gUser.value}>`,
    };
  }
  console.error("[mail] transport=none: no complete SMTP_* or GMAIL_* settings; mail NOT sent", { envNames: present });
  return null;
}

function mailError(error: unknown) {
  const e = (error ?? {}) as { code?: string; responseCode?: number; response?: string; command?: string; message?: string };
  return { code: e.code, responseCode: e.responseCode, response: e.response, command: e.command, message: e.message };
}

/** Sends mail via SMTP_* or GMAIL_* settings. Throws when mail is not configured or delivery fails. */
export async function sendMail(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<void> {
  const cfg = smtpConfig();
  if (!cfg) throw new Error("Mail is not configured (no SMTP_* or GMAIL_* settings).");
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: !cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  const where = { transport: cfg.transport, host: cfg.host, port: cfg.port, secure: cfg.secure };
  try {
    await transport.verify();
    console.log("[mail] verify ok", where);
  } catch (error) {
    console.error("[mail] verify failed", { ...where, ...mailError(error) });
    throw error;
  }
  try {
    const info = await transport.sendMail({
      from: cfg.from,
      to,
      replyTo: HOTEL.email,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    console.log("[mail] sent", { ...where, to, messageId: info.messageId, response: info.response, accepted: info.accepted, rejected: info.rejected });
  } catch (error) {
    console.error("[mail] send failed", { ...where, to, ...mailError(error) });
    throw error;
  } finally {
    transport.close();
  }
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
    row.total_amount > row.amount_paid
      ? `Balance at hotel: ₹${row.total_amount - row.amount_paid}`
      : "Fully paid",
  ].join("\n");
  await Promise.allSettled([sendMail(HOTEL.email, `Payment ${row.id}`, text)]);
}
