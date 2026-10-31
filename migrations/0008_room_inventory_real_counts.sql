-- Real room split confirmed by the owner (27 Oct 2026): 25 + 3 + 4 = 32 rooms.
-- Supersedes the placeholder 8 + 6 + 4 seeded by 0004.
insert into room_inventory (room_type, rooms) values
  ('deluxe', 25),
  ('super-deluxe', 3),
  ('suite', 4)
on conflict (room_type) do update set rooms = excluded.rooms;
