import assert from "node:assert/strict";
import test from "node:test";
import { book, freshDb } from "./bookings.testdb.ts";

test("place_booking fills a room type up to its inventory, then rejects", async () => {
  const pg = await freshDb();
  await pg.query("update room_inventory set rooms = 2 where room_type = 'deluxe'");
  await book(pg, "HSR-1", "deluxe", "2026-11-01", "2026-11-04");
  await book(pg, "HSR-2", "deluxe", "2026-11-03", "2026-11-06");
  await assert.rejects(() => book(pg, "HSR-3", "deluxe", "2026-11-03", "2026-11-04"), /overlapping_booking/);
  // Other types and checkout mornings stay free.
  await book(pg, "HSR-4", "suite", "2026-11-03", "2026-11-06");
  await book(pg, "HSR-5", "deluxe", "2026-11-04", "2026-11-05");
  // Multi-room requests count every room.
  await assert.rejects(() => book(pg, "HSR-6", "deluxe", "2026-11-10", "2026-11-11", 3), /overlapping_booking/);
  await pg.query("update bookings set status = 'cancelled' where id = 'HSR-1'");
  await book(pg, "HSR-7", "deluxe", "2026-11-02", "2026-11-03");
});

test("default inventory is 25 deluxe, 3 super-deluxe, 4 suite (32 rooms)", async () => {
  const pg = await freshDb();
  const res = await pg.query<{ total: number }>("select sum(rooms)::int as total from room_inventory");
  assert.equal(res.rows[0]?.total, 32);
  const split = await pg.query<{ room_type: string; rooms: number }>("select room_type, rooms from room_inventory order by room_type");
  assert.deepEqual(split.rows.map((r) => [r.room_type, r.rooms]), [["deluxe", 25], ["suite", 4], ["super-deluxe", 3]]);
});
