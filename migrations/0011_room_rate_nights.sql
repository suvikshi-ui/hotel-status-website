-- A special nightly rate for one room type on one night.
-- Nights with no row use room_inventory.price.
create table if not exists room_rate_nights (
  room_type text not null references room_inventory (room_type),
  night date not null,
  price integer not null check (price >= 1),
  primary key (room_type, night)
);
