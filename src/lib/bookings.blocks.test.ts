import assert from "node:assert/strict";
import test from "node:test";
import { book, freshDb } from "./bookings.testdb.ts";

test("manual date blocks count toward availability", async () => {
  const pg = await freshDb();
  await pg.query("update room_inventory set rooms = 2 where room_type = 'suite'");
  await pg.query(
    "insert into date_blocks (room_type, rooms, start_date, end_date, source) values ('suite', 1, '2026-12-02', '2026-12-03', 'makemytrip')",
  );
  const taken = await pg.query<{ n: number }>("select rooms_taken('suite', '2026-12-01', '2026-12-04') as n");
  assert.equal(taken.rows[0]!.n, 1);
  await book(pg, "HSR-1", "suite", "2026-12-01", "2026-12-04");
  await assert.rejects(() => book(pg, "HSR-2", "suite", "2026-12-02", "2026-12-03"), /overlapping_booking/);
  await book(pg, "HSR-3", "suite", "2026-12-03", "2026-12-05");
  await pg.query("delete from date_blocks");
  await book(pg, "HSR-4", "suite", "2026-12-02", "2026-12-03");
});
