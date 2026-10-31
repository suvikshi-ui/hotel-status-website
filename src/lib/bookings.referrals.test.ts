import assert from "node:assert/strict";
import test from "node:test";
import { book, freshDb } from "./bookings.testdb.ts";

test("room prices: deluxe 2500, suite 6000, super deluxe hidden but kept", async () => {
  const pg = await freshDb();
  const { rows } = await pg.query<{ room_type: string; price: number; is_active: boolean; rooms: number }>(
    "select room_type, price, is_active, rooms from room_inventory order by sort_order",
  );
  assert.deepEqual(
    rows.map((r) => [r.room_type, r.price, r.is_active]),
    [
      ["deluxe", 2500, true],
      ["super-deluxe", 3499, false],
      ["suite", 6000, true],
    ],
  );
  assert.equal(rows.find((r) => r.room_type === "super-deluxe")?.rooms, 3);
});

test("referral codes: case-insensitive unique, percentages 0-100 with a capped total", async () => {
  const pg = await freshDb();
  const insert = (code: string, g: number, a: number) =>
    pg.query(
      `insert into referral_codes (label, code, agent_name, agent_phone, guest_discount_percent, agent_percent)
       values ('Test', $1, 'Agent', '9000000000', $2, $3) returning id`,
      [code, g, a],
    );
  await insert("RAVI10", 7, 12);
  await assert.rejects(() => insert("ravi10", 5, 5), /unique|duplicate/i);
  await assert.rejects(() => insert("BAD1", 101, 0), /check/i);
  await assert.rejects(() => insert("BAD2", 60, 50), /check/i);
  await assert.rejects(() => insert("BAD3", -1, 0), /check/i);
});

test("bookings carry the referral, discount and agent commission", async () => {
  const pg = await freshDb();
  const { rows } = await pg.query<{ id: number }>(
    `insert into referral_codes (label, code, agent_name, agent_phone, guest_discount_percent, agent_percent)
     values ('Test', 'AG1', 'Agent', '9000000000', 8, 12) returning id`,
  );
  await book(pg, "HSR-R1", "deluxe", "2026-12-01", "2026-12-03");
  await pg.query(
    `update bookings set referral_code_id = $1, list_amount = 5000, guest_discount_amount = 400,
       agent_commission_amount = 600, total_amount = 4600 where id = 'HSR-R1'`,
    [rows[0].id],
  );
  const saved = await pg.query<{ agent_commission_amount: number; agent_commission_paid_at: string | null }>(
    "select agent_commission_amount, agent_commission_paid_at from bookings where id = 'HSR-R1'",
  );
  assert.equal(Number(saved.rows[0].agent_commission_amount), 600);
  assert.equal(saved.rows[0].agent_commission_paid_at, null);
});
