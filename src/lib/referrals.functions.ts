import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ownerMiddleware } from "@/lib/owner-auth.functions";
import {
  codeExists,
  createReferral,
  istMonth,
  listReferrals,
  referralBookings,
  roomSettings,
  setCommissionPaid,
  setReferralActive,
  updateReferral,
  updateRoomSetting,
  type ReferralBooking,
  type ReferralSummary,
  type RoomSetting,
} from "@/lib/referrals.server";

export type { ReferralBooking, ReferralSummary, RoomSetting };

async function noStore() {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
}

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const percent = z.number().min(0, "Use 0–100.").max(100, "Use 0–100.");

const referralInput = z
  .object({
    label: z.string().trim().min(1, "Enter a name or label.").max(120),
    code: z
      .string()
      .trim()
      .min(3, "Code must be at least 3 characters.")
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - or _ only.")
      .transform((v) => v.toUpperCase()),
    agent_name: z.string().trim().min(1, "Enter the agent name.").max(120),
    agent_phone: z.string().trim().max(20).default(""),
    agent_email: z.union([z.literal(""), z.string().trim().email().max(160)]).default(""),
    guest_discount_percent: percent,
    agent_percent: percent,
    active: z.boolean(),
    valid_from: iso.nullable(),
    valid_to: iso.nullable(),
    max_uses: z.number().int().positive().nullable(),
    notes: z.string().trim().max(1000).default(""),
  })
  .refine((v) => v.guest_discount_percent + v.agent_percent <= 100, {
    message: "Guest discount % and agent commission % together cannot exceed 100.",
  })
  .refine((v) => !v.valid_from || !v.valid_to || v.valid_to >= v.valid_from, {
    message: "Valid-to must be on or after valid-from.",
  });

export type ReferralForm = z.input<typeof referralInput>;

export const ownerReferrals = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ month: month.optional() }))
  .handler(async ({ data }): Promise<{ month: string; codes: ReferralSummary[] }> => {
    await noStore();
    const m = data.month ?? istMonth();
    return { month: m, codes: await listReferrals(m) };
  });

export const ownerReferralBookings = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ id: z.number().int().positive(), month: month.nullable() }))
  .handler(async ({ data }): Promise<ReferralBooking[]> => {
    await noStore();
    return referralBookings(data.id, data.month);
  });

export const ownerSaveReferral = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ id: z.number().int().positive().nullable(), form: referralInput }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await noStore();
    if (data.id) await updateReferral(data.id, data.form);
    else await createReferral(data.form);
    return { ok: true };
  });

export const ownerToggleReferral = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ id: z.number().int().positive(), active: z.boolean() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await noStore();
    await setReferralActive(data.id, data.active);
    return { ok: true };
  });

/** Suggests an unused code from the label, e.g. "Ravi Travels" -> RAVI10 style. */
export const ownerSuggestCode = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ seed: z.string().max(120) }))
  .handler(async ({ data }): Promise<{ code: string }> => {
    await noStore();
    const base = (data.seed.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "HSR").padEnd(3, "X");
    for (let i = 0; i < 30; i += 1) {
      const suffix = String(Math.floor(100 + Math.random() * 900));
      const code = `${base}${suffix}`;
      if (!(await codeExists(code))) return { code };
    }
    return { code: `HSR${Date.now().toString(36).toUpperCase()}` };
  });

export const ownerCommissionPaid = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ bookingId: z.string().trim().min(1).max(40), paid: z.boolean() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await noStore();
    await setCommissionPaid(data.bookingId, data.paid);
    return { ok: true };
  });

export const ownerRoomSettings = createServerFn({ method: "GET" })
  .middleware([ownerMiddleware])
  .handler(async (): Promise<RoomSetting[]> => {
    await noStore();
    return roomSettings();
  });

export const ownerUpdateRoomSetting = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(
    z.object({
      room_type: z.enum(["deluxe", "super-deluxe", "suite"]),
      price: z.number().int().min(1).max(1_000_000),
      is_active: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<RoomSetting[]> => {
    await noStore();
    await updateRoomSetting(data.room_type, data.price, data.is_active);
    return roomSettings();
  });
