import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const sql = readFileSync(new URL("../../migrations/0002_bookings.sql", import.meta.url), "utf8");

async function book(
  pg: PGlite,
  id: string,
  room: string,
  checkIn: string,
  checkOut: string,
) {
  return pg.query(
    `select id from place_booking($1, 'Guest', '9076011515', 'guest@example.com', $2, $3::date, $4::date, 2, 1, 2499)`,
    [id, room, checkIn, checkOut],
  );
}

test("place_booking rejects an overlapping stay for the same room type", async () => {
  const pg = new PGlite();
  await pg.exec(sql);
  await book(pg, "HSR-1", "deluxe", "2026-11-01", "2026-11-04");

  await assert.rejects(
    () => book(pg, "HSR-2", "deluxe", "2026-11-03", "2026-11-06"),
    /overlapping_booking/,
  );

  await book(pg, "HSR-3", "suite", "2026-11-03", "2026-11-06");
  await book(pg, "HSR-4", "deluxe", "2026-11-04", "2026-11-05");

  await pg.query("update bookings set status = 'cancelled' where id = 'HSR-1'");
  await book(pg, "HSR-5", "deluxe", "2026-11-02", "2026-11-03");
});
