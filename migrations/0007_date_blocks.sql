-- Manual blocks (rooms sold on MakeMyTrip, FabHotels, Brevistay, walk-ins,
-- maintenance...). They count toward availability exactly like bookings.
create table if not exists date_blocks (
  id bigserial primary key,
  room_type text not null references room_inventory (room_type),
  rooms integer not null check (rooms > 0),
  start_date date not null,
  end_date date not null,
  source text not null default 'other',
  note text not null default '',
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create index if not exists date_blocks_room_dates on date_blocks (room_type, start_date, end_date);

create or replace function rooms_taken(p_room_type text, p_check_in date, p_check_out date)
returns integer
language sql
stable
as $$
  select coalesce(max(taken), 0)::integer from (
    select night,
      coalesce((select sum(b.rooms) from bookings b
                where b.room_type = p_room_type and booking_active(b)
                  and b.check_in <= night::date and b.check_out > night::date), 0)
      + coalesce((select sum(d.rooms) from date_blocks d
                  where d.room_type = p_room_type
                    and d.start_date <= night::date and d.end_date > night::date), 0) as taken
    from generate_series(p_check_in, p_check_out - 1, interval '1 day') as night
  ) per_night;
$$;
