-- Payment modes: full online, advance (part online, rest at the hotel), or pay
-- at hotel. Online bookings start as pending_payment and hold their rooms for
-- a short window; unpaid holds expire and free the rooms.
alter table bookings add column if not exists payment_mode text not null default 'full';
alter table bookings add column if not exists amount_due_now integer not null default 0;
alter table bookings add column if not exists amount_paid integer not null default 0;
alter table bookings add column if not exists hold_expires_at timestamptz;

-- Existing paid rows: record what was paid.
update bookings set amount_due_now = total_amount where amount_due_now = 0;
update bookings set amount_paid = total_amount where payment_status = 'paid' and amount_paid = 0;

alter table bookings drop constraint if exists bookings_status;
alter table bookings add constraint bookings_status
  check (status in ('pending_payment', 'confirmed', 'cancelled', 'expired'));

alter table bookings drop constraint if exists bookings_payment_status;
alter table bookings add constraint bookings_payment_status
  check (payment_status in ('unpaid', 'partial', 'paid', 'pay_at_hotel', 'refunded', 'partially_refunded'));

alter table bookings drop constraint if exists bookings_payment_mode;
alter table bookings add constraint bookings_payment_mode
  check (payment_mode in ('full', 'advance', 'pay_at_hotel'));

-- A booking holds rooms while confirmed, or while its payment hold is open.
create or replace function booking_active(b bookings) returns boolean
language sql
stable
as $$
  select b.status = 'confirmed'
      or (b.status = 'pending_payment' and b.hold_expires_at > now());
$$;

create or replace function rooms_taken(p_room_type text, p_check_in date, p_check_out date)
returns integer
language sql
stable
as $$
  select coalesce(max(taken), 0)::integer from (
    select night, sum(b.rooms) as taken
    from generate_series(p_check_in, p_check_out - 1, interval '1 day') as night
    join bookings b
      on b.room_type = p_room_type
     and booking_active(b)
     and b.check_in <= night::date
     and b.check_out > night::date
    group by night
  ) per_night;
$$;

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
  p_total_amount integer,
  p_payment_mode text default 'full',
  p_amount_due_now integer default null,
  p_hold_minutes integer default 30
) returns setof bookings
language plpgsql
as $$
declare
  result bookings;
  capacity integer;
  pay_later boolean := p_payment_mode = 'pay_at_hotel';
begin
  perform pg_advisory_xact_lock(hashtext('booking:' || p_room_type)::bigint);

  update bookings set status = 'expired'
  where room_type = p_room_type and status = 'pending_payment' and hold_expires_at <= now();

  select rooms into capacity from room_inventory where room_type = p_room_type;
  if capacity is null then
    raise exception 'unknown_room_type' using errcode = 'P0002';
  end if;

  if rooms_taken(p_room_type, p_check_in, p_check_out) + p_rooms > capacity then
    raise exception 'overlapping_booking' using errcode = 'P0001';
  end if;

  insert into bookings (
    id, guest_name, phone, email, room_type,
    check_in, check_out, guests, rooms, total_amount, status,
    payment_status, payment_mode, amount_due_now, hold_expires_at
  ) values (
    p_id, p_guest_name, p_phone, p_email, p_room_type,
    p_check_in, p_check_out, p_guests, p_rooms, p_total_amount,
    case when pay_later then 'confirmed' else 'pending_payment' end,
    case when pay_later then 'pay_at_hotel' else 'unpaid' end,
    p_payment_mode,
    case when pay_later then 0 else coalesce(p_amount_due_now, p_total_amount) end,
    case when pay_later then null else now() + make_interval(mins => p_hold_minutes) end
  )
  returning * into result;

  return next result;
  return;
end;
$$;

-- Record an online payment. Confirms a pending (or just-expired) booking.
create or replace function record_payment(p_id text, p_amount integer, p_payment_id text)
returns setof bookings
language plpgsql
as $$
declare
  result bookings;
begin
  update bookings set
    amount_paid = amount_paid + p_amount,
    payment_id = coalesce(p_payment_id, payment_id),
    payment_status = case when amount_paid + p_amount >= total_amount then 'paid' else 'partial' end,
    status = case when status in ('pending_payment', 'expired') then 'confirmed' else status end,
    hold_expires_at = null
  where id = p_id
    and (p_payment_id is null or payment_id is distinct from p_payment_id)
    and payment_status in ('unpaid', 'pay_at_hotel')
  returning * into result;
  if found then return next result; end if;
  return;
end;
$$;
