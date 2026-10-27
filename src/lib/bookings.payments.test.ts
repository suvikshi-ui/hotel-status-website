import assert from "node:assert/strict";
import test from "node:test";
import { freshDb } from "./bookings.testdb.ts";

async function place(pg: Awaited<ReturnType<typeof freshDb>>, id: string, mode: string, due: number | null, hold = 30) {
  const res = await pg.query<{ status: string; payment_status: string; amount_due_now: number }>(
    `select status, payment_status, amount_due_now from place_booking($1, 'G', '9076011515', 'g@example.com', 'suite',
       '2026-12-01'::date, '2026-12-03'::date, 2, 1, 10000, $2, $3, $4)`,
    [id, mode, due, hold],
  );
  return res.rows[0]!;
}

test("online bookings start pending and hold rooms; pay at hotel is confirmed", async () => {
  const pg = await freshDb();
  assert.deepEqual(await place(pg, "HSR-1", "full", 10000), {
    status: "pending_payment",
    payment_status: "unpaid",
    amount_due_now: 10000,
  });
  assert.deepEqual(await place(pg, "HSR-2", "pay_at_hotel", null), {
    status: "confirmed",
    payment_status: "pay_at_hotel",
    amount_due_now: 0,
  });
  const taken = await pg.query<{ n: number }>(`select rooms_taken('suite', '2026-12-01', '2026-12-03') as n`);
  assert.equal(taken.rows[0]!.n, 2);
});

test("expired holds free the rooms", async () => {
  const pg = await freshDb();
  await pg.query("update room_inventory set rooms = 1 where room_type = 'suite'");
  await place(pg, "HSR-1", "full", 10000);
  await assert.rejects(() => place(pg, "HSR-2", "full", 10000), /overlapping_booking/);
  await pg.query("update bookings set hold_expires_at = now() - interval '1 minute' where id = 'HSR-1'");
  await place(pg, "HSR-2", "full", 10000);
  const old = await pg.query<{ status: string }>("select status from bookings where id = 'HSR-1'");
  assert.equal(old.rows[0]!.status, "expired");
});

test("record_payment confirms and tracks advance vs balance", async () => {
  const pg = await freshDb();
  await place(pg, "HSR-1", "advance", 3000);
  const res = await pg.query<{ status: string; payment_status: string; amount_paid: number }>(
    "select status, payment_status, amount_paid from record_payment('HSR-1', 3000, 'pay_1')",
  );
  assert.deepEqual(res.rows[0], { status: "confirmed", payment_status: "partial", amount_paid: 3000 });
  // A replayed webhook is ignored.
  const again = await pg.query("select * from record_payment('HSR-1', 3000, 'pay_1')");
  assert.equal(again.rows.length, 0);
  await place(pg, "HSR-2", "full", 10000);
  const full = await pg.query<{ payment_status: string }>("select payment_status from record_payment('HSR-2', 10000, 'pay_2')");
  assert.equal(full.rows[0]!.payment_status, "paid");
});
