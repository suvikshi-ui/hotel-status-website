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
  status: "confirmed" | "cancelled";
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
};

const SELECT_BOOKINGS = `
  select
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
    to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
  from bookings
  order by created_at desc
`;

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
        `
          select
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
            to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
          from place_booking($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10)
        `,
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
        throw new Error("Those dates are already booked for this room type.");
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
    `
      update bookings
      set status = 'cancelled'
      where id = $1 and status = 'confirmed'
      returning
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
        to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
    `,
    [id],
  );
  return rows[0] ?? null;
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
      where status = 'confirmed'
    `,
  );
}

export async function findBookingRow(id: string, phone: string): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `
      select
        id, guest_name, phone, email, room_type,
        check_in::text as check_in,
        check_out::text as check_out,
        guests, rooms, total_amount, status,
        to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
      from bookings
      where id = $1 and phone = $2
    `,
    [id, phone],
  );
  return rows[0] ?? null;
}

export async function cancelBookingForPhone(id: string, phone: string): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `
      update bookings
      set status = 'cancelled'
      where id = $1 and phone = $2 and status = 'confirmed'
      returning
        id, guest_name, phone, email, room_type,
        check_in::text as check_in,
        check_out::text as check_out,
        guests, rooms, total_amount, status,
        to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
    `,
    [id, phone],
  );
  return rows[0] ?? null;
}
