import { getSql } from "@/lib/db";

/** Bookings that count toward a code's uses, revenue and agent earnings. */
export const COUNTED = `b.status not in ('cancelled', 'expired')`;

export type ReferralCode = {
  id: number;
  label: string;
  code: string;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  guest_discount_percent: number;
  agent_percent: number;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  max_uses: number | null;
  notes: string;
  created_at: string;
};

export type ReferralSummary = ReferralCode & {
  uses: number;
  revenue: number;
  earnings_total: number;
  earnings_paid: number;
  earnings_unpaid: number;
  earnings_month: number;
};

export type ReferralInput = Omit<ReferralCode, "id" | "created_at">;

const CODE_SELECT = `
  c.id::int as id, c.label, c.code, c.agent_name, c.agent_phone, c.agent_email,
  c.guest_discount_percent::float8 as guest_discount_percent, c.agent_percent::float8 as agent_percent,
  c.active, c.valid_from::text as valid_from, c.valid_to::text as valid_to, c.max_uses, c.notes,
  to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
`;

/** Current month in India (YYYY-MM). */
export function istMonth(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 7);
}

const num = (v: unknown) => Number(v ?? 0);

export async function listReferrals(month: string): Promise<ReferralSummary[]> {
  const sql = await getSql();
  const rows = await sql.query<ReferralSummary>(
    `select ${CODE_SELECT},
       count(b.id)::int as uses,
       coalesce(sum(b.total_amount), 0)::int as revenue,
       coalesce(sum(b.agent_commission_amount), 0)::int as earnings_total,
       coalesce(sum(b.agent_commission_amount) filter (where b.agent_commission_paid_at is not null), 0)::int as earnings_paid,
       coalesce(sum(b.agent_commission_amount) filter (where b.agent_commission_paid_at is null), 0)::int as earnings_unpaid,
       coalesce(sum(b.agent_commission_amount) filter (
         where to_char(b.created_at at time zone 'Asia/Kolkata', 'YYYY-MM') = $1), 0)::int as earnings_month
     from referral_codes c
     left join bookings b on b.referral_code_id = c.id and ${COUNTED}
     group by c.id
     order by c.active desc, c.created_at desc`,
    [month],
  );
  return rows.map((r) => ({
    ...r,
    uses: num(r.uses),
    revenue: num(r.revenue),
    earnings_total: num(r.earnings_total),
    earnings_paid: num(r.earnings_paid),
    earnings_unpaid: num(r.earnings_unpaid),
    earnings_month: num(r.earnings_month),
    guest_discount_percent: num(r.guest_discount_percent),
    agent_percent: num(r.agent_percent),
  }));
}

export async function createReferral(input: ReferralInput): Promise<void> {
  const sql = await getSql();
  try {
    await sql.query(
      `insert into referral_codes (label, code, agent_name, agent_phone, agent_email, guest_discount_percent,
         agent_percent, active, valid_from, valid_to, max_uses, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::date, $11, $12)`,
      params(input),
    );
  } catch (error) {
    throw friendly(error);
  }
}

export async function updateReferral(id: number, input: ReferralInput): Promise<void> {
  const sql = await getSql();
  try {
    await sql.query(
      `update referral_codes set label = $1, code = $2, agent_name = $3, agent_phone = $4, agent_email = $5,
         guest_discount_percent = $6, agent_percent = $7, active = $8, valid_from = $9::date, valid_to = $10::date,
         max_uses = $11, notes = $12, updated_at = now()
       where id = $13`,
      [...params(input), id],
    );
  } catch (error) {
    throw friendly(error);
  }
}

export async function setReferralActive(id: number, active: boolean): Promise<void> {
  const sql = await getSql();
  await sql.query(`update referral_codes set active = $2, updated_at = now() where id = $1`, [id, active]);
}

function params(i: ReferralInput): unknown[] {
  return [
    i.label, i.code, i.agent_name, i.agent_phone, i.agent_email, i.guest_discount_percent,
    i.agent_percent, i.active, i.valid_from, i.valid_to, i.max_uses, i.notes,
  ];
}

function friendly(error: unknown): Error {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "23505") return new Error("That code is already used. Pick another.");
  if (code === "23514") return new Error("Check the percentages (0–100, together at most 100) and dates.");
  return error instanceof Error ? error : new Error("Could not save the code.");
}

export async function codeExists(code: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query(`select 1 from referral_codes where lower(code) = lower($1)`, [code]);
  return rows.length > 0;
}

export type AppliedReferral = { id: number; code: string; guestPercent: number; agentPercent: number };

/** Validates a code for a booking made today (IST). Throws a guest-facing message. */
export async function resolveReferral(raw: string): Promise<AppliedReferral> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: number; code: string; g: number; a: number; active: boolean;
    not_started: boolean; ended: boolean; max_uses: number | null; uses: number;
  }>(
    `select c.id::int as id, c.code, c.guest_discount_percent::float8 as g, c.agent_percent::float8 as a, c.active,
       (c.valid_from is not null and c.valid_from > (now() at time zone 'Asia/Kolkata')::date) as not_started,
       (c.valid_to is not null and c.valid_to < (now() at time zone 'Asia/Kolkata')::date) as ended,
       c.max_uses,
       (select count(*)::int from bookings b where b.referral_code_id = c.id and ${COUNTED}) as uses
     from referral_codes c where lower(c.code) = lower($1)`,
    [raw.trim()],
  );
  const r = rows[0];
  if (!r || !r.active) throw new Error("That referral code is not valid.");
  if (r.not_started) throw new Error("That referral code is not active yet.");
  if (r.ended) throw new Error("That referral code has expired.");
  if (r.max_uses !== null && Number(r.uses) >= Number(r.max_uses)) {
    throw new Error("That referral code has reached its limit.");
  }
  return { id: Number(r.id), code: r.code, guestPercent: Number(r.g), agentPercent: Number(r.a) };
}

/** Discount and commission, both on the list (pre-discount) price, whole rupees. */
export function referralAmounts(listAmount: number, guestPercent: number, agentPercent: number) {
  const discount = Math.floor((listAmount * guestPercent) / 100);
  const commission = Math.round((listAmount * agentPercent) / 100);
  return { discount, commission, total: listAmount - discount };
}

export async function attachReferral(
  bookingId: string,
  ref: AppliedReferral,
  listAmount: number,
  discount: number,
  commission: number,
): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `update bookings set referral_code_id = $2, list_amount = $3, guest_discount_amount = $4,
       agent_commission_amount = $5 where id = $1`,
    [bookingId, ref.id, listAmount, discount, commission],
  );
}

export type ReferralBooking = {
  id: string;
  guest_name: string;
  room_type: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number;
  list_amount: number | null;
  guest_discount_amount: number;
  agent_commission_amount: number;
  agent_commission_paid_at: string | null;
  created_at: string;
};

export async function referralBookings(codeId: number, month: string | null): Promise<ReferralBooking[]> {
  const sql = await getSql();
  const rows = await sql.query<ReferralBooking>(
    `select b.id, b.guest_name, b.room_type, b.check_in::text as check_in, b.check_out::text as check_out, b.status,
       b.total_amount, b.list_amount, b.guest_discount_amount, b.agent_commission_amount,
       case when b.agent_commission_paid_at is null then null
         else to_char(b.agent_commission_paid_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end as agent_commission_paid_at,
       to_char(b.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
     from bookings b
     where b.referral_code_id = $1
       and ($2::text is null or to_char(b.created_at at time zone 'Asia/Kolkata', 'YYYY-MM') = $2)
     order by b.created_at desc`,
    [codeId, month],
  );
  return rows.map((r) => ({
    ...r,
    total_amount: num(r.total_amount),
    guest_discount_amount: num(r.guest_discount_amount),
    agent_commission_amount: num(r.agent_commission_amount),
  }));
}

export async function setCommissionPaid(bookingId: string, paid: boolean): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `update bookings set agent_commission_paid_at = case when $2 then coalesce(agent_commission_paid_at, now()) else null end
     where id = $1 and referral_code_id is not null`,
    [bookingId, paid],
  );
}

/** Room types: owner settings (price, visibility). */
export type RoomSetting = { room_type: string; price: number; is_active: boolean; rooms: number; sort_order: number };

export async function roomSettings(): Promise<RoomSetting[]> {
  const sql = await getSql();
  const rows = await sql.query<RoomSetting>(
    `select room_type, price, is_active, rooms, sort_order from room_inventory order by sort_order, room_type`,
  );
  return rows.map((r) => ({ ...r, price: num(r.price), rooms: num(r.rooms), sort_order: num(r.sort_order) }));
}

export async function updateRoomSetting(roomType: string, price: number, isActive: boolean): Promise<void> {
  const sql = await getSql();
  await sql.query(`update room_inventory set price = $2, is_active = $3 where room_type = $1`, [roomType, price, isActive]);
}
