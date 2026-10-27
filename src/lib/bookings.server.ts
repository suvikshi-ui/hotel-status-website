import { getSql } from "@/lib/db";
import { bookingId } from "@/lib/format";

export type BookingRow = {
  id: string;
  guest_name: string;
  phone: string;
  email: string;
  room_type: string;
  check_in: string;
  check_out: string;
  guests: number;
  rooms: number;
  total_amount: number;
  status: "pending_payment" | "confirmed" | "cancelled" | "expired";
  payment_status: "unpaid" | "partial" | "paid" | "pay_at_hotel" | "refunded" | "partially_refunded";
  payment_mode: "full" | "advance" | "pay_at_hotel";
  amount_due_now: number;
  amount_paid: number;
  balance: number;
  hold_expires_at: string | null;
  payment_url: string | null;
  payment_link_id: string | null;
  payment_id: string | null;
  manage_token: string;
  cancelled_at: string | null;
  refund_amount: number;
  refund_id: string | null;
  refund_status: string | null;
  invoice_number: string | null;
  invoiced_at: string | null;
  created_at: string;
};

export type NewBooking = {
  guestName: string;
  phone: string;
  email: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalAmount: number;
  paymentMode: "full" | "advance" | "pay_at_hotel";
  amountDueNow: number;
  holdMinutes: number;
};

const BOOKING_SELECT = `
  id,
  guest_name,
  phone,
  email,
  room_type,
  check_in::text as check_in,
  check_out::text as check_out,
  guests,
  rooms,
  total_amount,
  status,
  payment_status,
  payment_url,
  payment_link_id,
  payment_id,
  manage_token,
  refund_amount,
  refund_id,
  refund_status,
  invoice_number,
  case when invoiced_at is null then null
    else to_char(invoiced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end as invoiced_at,
  case when cancelled_at is null then null
    else to_char(cancelled_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end as cancelled_at,
  payment_mode,
  amount_due_now,
  amount_paid,
  greatest(total_amount - amount_paid, 0) as balance,
  case when hold_expires_at is null then null
    else to_char(hold_expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end as hold_expires_at,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
`;

export { BOOKING_SELECT };

const SELECT_BOOKINGS = `select ${BOOKING_SELECT} from bookings order by created_at desc`;

export async function listBookingRows(): Promise<BookingRow[]> {
  const sql = await getSql();
  return sql.query<BookingRow>(SELECT_BOOKINGS);
}

export async function insertBooking(input: NewBooking): Promise<BookingRow> {
  const sql = await getSql();
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = bookingId();
    try {
      const rows = await sql.query<BookingRow>(
        `select ${BOOKING_SELECT} from place_booking($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11, $12, $13)`,
        [
          id,
          input.guestName,
          input.phone,
          input.email,
          input.roomType,
          input.checkIn,
          input.checkOut,
          input.guests,
          input.rooms,
          input.totalAmount,
          input.paymentMode,
          input.amountDueNow,
          input.holdMinutes,
        ],
      );
      const row = rows[0];
      if (!row) throw new Error("Booking was not saved.");
      return row;
    } catch (error) {
      lastError = error;
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      const message = error instanceof Error ? error.message : "";
      if (code === "P0001" || message.includes("overlapping_booking")) {
        throw new Error("Not enough rooms of this type are free for those dates.");
      }
      if (code === "23505") continue;
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not save the booking.");
}

export async function cancelBookingRow(id: string): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `update bookings set status = 'cancelled' where id = $1 and status in ('confirmed', 'pending_payment') returning ${BOOKING_SELECT}`,
    [id],
  );
  return rows[0] ?? null;
}

export type RoomsLeft = Record<string, { capacity: number; left: number }>;

/** Rooms still free for every night of [checkIn, checkOut), per room type. */
export async function roomsLeft(checkIn: string, checkOut: string): Promise<RoomsLeft> {
  const sql = await getSql();
  const rows = await sql.query<{ room_type: string; capacity: number; taken: number }>(
    `select room_type, rooms as capacity, rooms_taken(room_type, $1::date, $2::date) as taken from room_inventory`,
    [checkIn, checkOut],
  );
  const out: RoomsLeft = {};
  for (const row of rows) {
    out[row.room_type] = { capacity: Number(row.capacity), left: Math.max(0, Number(row.capacity) - Number(row.taken)) };
  }
  return out;
}

export type TakenStay = {
  room_type: string;
  check_in: string;
  check_out: string;
};

export async function listTakenStays(): Promise<TakenStay[]> {
  const sql = await getSql();
  return sql.query<TakenStay>(
    `
      select room_type, check_in::text as check_in, check_out::text as check_out
      from bookings
      where booking_active(bookings)
    `,
  );
}

export async function findBookingRow(id: string, phone: string): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `select ${BOOKING_SELECT} from bookings where id = $1 and phone = $2`,
    [id, phone],
  );
  return rows[0] ?? null;
}

export async function cancelBookingForPhone(id: string, phone: string): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `update bookings
     set status = 'cancelled'
     where id = $1 and phone = $2 and status in ('confirmed', 'pending_payment')
     returning ${BOOKING_SELECT}`,
    [id, phone],
  );
  return rows[0] ?? null;
}

/** Owner records the balance taken at the desk (cash/UPI/card at the hotel). */
export async function collectBalanceRow(id: string): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `update bookings
     set amount_paid = total_amount, payment_status = 'paid'
     where id = $1 and status = 'confirmed' and amount_paid < total_amount
     returning ${BOOKING_SELECT}`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findBookingByToken(id: string, token: string): Promise<BookingRow | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `select ${BOOKING_SELECT} from bookings where id = $1 and manage_token = $2`,
    [id, token],
  );
  return rows[0] ?? null;
}

export async function findBookingById(id: string): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(`select ${BOOKING_SELECT} from bookings where id = $1`, [id]);
  return rows[0] ?? null;
}

/** Marks a live booking cancelled with the refund it is owed. Null if it was not live. */
export async function markCancelled(id: string, refundAmount: number): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `update bookings
     set status = 'cancelled', cancelled_at = now(), refund_amount = $2,
         refund_status = case when $2 > 0 then 'pending' else null end
     where id = $1 and status in ('confirmed', 'pending_payment')
     returning ${BOOKING_SELECT}`,
    [id, refundAmount],
  );
  return rows[0] ?? null;
}

export async function recordRefund(
  id: string,
  refundId: string | null,
  status: "processed" | "pending" | "failed",
): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `update bookings
     set refund_id = coalesce($2, refund_id),
         refund_status = $3,
         payment_status = case
           when $3 = 'failed' then payment_status
           when refund_amount >= amount_paid then 'refunded'
           else 'partially_refunded' end
     where id = $1
     returning ${BOOKING_SELECT}`,
    [id, refundId, status],
  );
  return rows[0] ?? null;
}

export type DateBlock = {
  id: number;
  room_type: string;
  rooms: number;
  start_date: string;
  end_date: string;
  source: string;
  note: string;
};

export async function listDateBlocks(): Promise<DateBlock[]> {
  const sql = await getSql();
  const rows = await sql.query<DateBlock>(
    `select id::int as id, room_type, rooms, start_date::text as start_date, end_date::text as end_date, source, note
     from date_blocks where end_date >= current_date order by start_date, room_type`,
  );
  return rows;
}

export async function addDateBlock(input: Omit<DateBlock, "id">): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into date_blocks (room_type, rooms, start_date, end_date, source, note) values ($1, $2, $3::date, $4::date, $5, $6)`,
    [input.room_type, input.rooms, input.start_date, input.end_date, input.source, input.note],
  );
}

export async function deleteDateBlock(id: number): Promise<void> {
  const sql = await getSql();
  await sql.query(`delete from date_blocks where id = $1`, [id]);
}
