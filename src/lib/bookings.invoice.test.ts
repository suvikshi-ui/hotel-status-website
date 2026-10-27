import assert from "node:assert/strict";
import test from "node:test";
import { freshDb } from "./bookings.testdb.ts";

async function placePending(pg: Awaited<ReturnType<typeof freshDb>>, id: string) {
  await pg.query(
    `select id from place_booking($1, 'G', '9076011515', 'g@example.com', 'suite',
       '2026-12-01'::date, '2026-12-03'::date, 2, 1, 10000, 'full', 10000, 30)`,
    [id],
  );
}

test("invoice numbers are sequential and assigned on first payment", async () => {
  const pg = await freshDb();
  await placePending(pg, "HSR-1");
  await placePending(pg, "HSR-2");
  const before = await pg.query<{ invoice_number: string | null; manage_token: string }>(
    "select invoice_number, manage_token from bookings where id = 'HSR-1'",
  );
  assert.equal(before.rows[0]!.invoice_number, null);
  assert.match(before.rows[0]!.manage_token, /^[0-9a-f]{32}$/);

  await pg.query("select id from record_payment('HSR-2', 10000, 'pay_2')");
  await pg.query("select id from record_payment('HSR-1', 10000, 'pay_1')");
  const rows = await pg.query<{ id: string; invoice_number: string }>(
    "select id, invoice_number from bookings order by id",
  );
  const fy = (await pg.query<{ fy: string }>("select financial_year(now()) as fy")).rows[0]!.fy;
  assert.match(fy, /^\d{4}-\d{2}$/);
  assert.equal(rows.rows[1]!.invoice_number, `HSR/${fy}/0001`);
  assert.equal(rows.rows[0]!.invoice_number, `HSR/${fy}/0002`);

  // A replayed payment keeps the same number.
  await pg.query("update bookings set amount_paid = amount_paid where id = 'HSR-1'");
  const again = await pg.query<{ invoice_number: string }>("select invoice_number from bookings where id = 'HSR-1'");
  assert.equal(again.rows[0]!.invoice_number, `HSR/${fy}/0002`);
});

test("financial year rolls over in April (IST)", async () => {
  const pg = await freshDb();
  const r = await pg.query<{ a: string; b: string }>(
    `select financial_year('2027-03-31T18:00:00Z') as a, financial_year('2027-03-31T19:00:00Z') as b`,
  );
  assert.equal(r.rows[0]!.a, "2026-27");
  assert.equal(r.rows[0]!.b, "2027-28");
});
