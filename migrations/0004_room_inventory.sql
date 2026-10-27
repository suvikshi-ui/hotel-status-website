-- Per-room availability. The hotel has 18 rooms split across three types.
-- A booking takes `rooms` rooms of a type for each night of the stay; a new
-- booking is accepted while every night still has enough rooms left.
-- Owner: confirm the split below (8 + 6 + 4 = 18) and update it if different:
--   update room_inventory set rooms = <n> where room_type = '<type>';
create table if not exists room_inventory (
  room_type text primary key,
  rooms integer not null check (rooms >= 0)
);

insert into room_inventory (room_type, rooms) values
  ('deluxe', 8),
  ('super-deluxe', 6),
  ('suite', 4)
on conflict (room_type) do nothing;

-- Rooms of a type already taken on each night of [p_check_in, p_check_out).
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
     and b.status = 'confirmed'
     and b.check_in <= night::date
     and b.check_out > night::date
    group by night
  ) per_night;
$$;

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
  capacity integer;
begin
  -- One lock per room type keeps the count and insert race-free.
  perform pg_advisory_xact_lock(hashtext('booking:' || p_room_type)::bigint);

  select rooms into capacity from room_inventory where room_type = p_room_type;
  if capacity is null then
    raise exception 'unknown_room_type' using errcode = 'P0002';
  end if;

  if rooms_taken(p_room_type, p_check_in, p_check_out) + p_rooms > capacity then
    raise exception 'overlapping_booking' using errcode = 'P0001';
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
