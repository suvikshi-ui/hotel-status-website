-- Shared hotel bookings. Rows are not scoped to a user account.
create table if not exists bookings (
  id text primary key,
  guest_name text not null,
  phone text not null,
  email text not null,
  room_type text not null,
  check_in date not null,
  check_out date not null,
  guests integer not null,
  rooms integer not null,
  total_amount integer not null,
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  constraint bookings_dates check (check_out > check_in),
  constraint bookings_counts check (guests >= 1 and rooms >= 1),
  constraint bookings_status check (status in ('confirmed', 'cancelled'))
);

create index if not exists bookings_room_type_dates_idx
  on bookings (room_type, check_in, check_out);

-- One statement so the overlap check and insert share a transaction,
-- even on a pooled Neon connection. Confirmed stays of the same room
-- type cannot overlap. A checkout morning is free for the next arrival.
create or replace function place_booking(
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
