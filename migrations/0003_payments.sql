-- Payment state for a stay. The guest pays the booking total on a Razorpay
-- link (UPI, QR, net banking, cards). This site never takes the card number.
alter table bookings add column if not exists payment_status text not null default 'unpaid';
alter table bookings add column if not exists payment_url text;
alter table bookings add column if not exists payment_link_id text;
alter table bookings add column if not exists payment_id text;

alter table bookings drop constraint if exists bookings_payment_status;
alter table bookings add constraint bookings_payment_status
  check (payment_status in ('unpaid', 'paid'));

-- The row type of place_booking changed when columns were added.
drop function if exists place_booking(text, text, text, text, text, date, date, integer, integer, integer);

create function place_booking(
  p_id text,
  p_guest_name text,
  p_phone text,
  p_email text,
  p_room_type text,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_rooms integer,
  p_total_amount integer
) returns setof bookings
language plpgsql
as $$
declare
  result bookings;
begin
  perform pg_advisory_xact_lock(hashtext('booking:' || p_room_type)::bigint);

  if exists (
    select 1
    from bookings
    where room_type = p_room_type
      and status = 'confirmed'
      and check_in < p_check_out
      and check_out > p_check_in
  ) then
    raise exception 'overlapping_booking'
      using errcode = 'P0001';
  end if;

  insert into bookings (
    id, guest_name, phone, email, room_type,
    check_in, check_out, guests, rooms, total_amount, status
  ) values (
    p_id, p_guest_name, p_phone, p_email, p_room_type,
    p_check_in, p_check_out, p_guests, p_rooms, p_total_amount, 'confirmed'
  )
  returning * into result;

  return next result;
  return;
end;
$$;
