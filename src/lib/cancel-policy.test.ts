import assert from "node:assert/strict";
import test from "node:test";
import { refundFor, checkInMoment } from "./cancel-policy.ts";
import { gstBreakdown } from "./gst.ts";

const policy = { fullRefundHours: 24, lateRefundPercent: 0, checkInHour: 12 };
const paid = { check_in: "2026-12-10", amount_paid: 3000, payment_status: "paid" };

test("full refund more than 24h before check-in, none after", () => {
  const checkIn = checkInMoment("2026-12-10", 12);
  assert.equal(new Date(checkIn).toISOString(), "2026-12-10T06:30:00.000Z");
  assert.equal(refundFor(paid, policy, checkIn - 25 * 3_600_000), 3000);
  assert.equal(refundFor(paid, policy, checkIn - 23 * 3_600_000), 0);
  assert.equal(refundFor(paid, { ...policy, lateRefundPercent: 50 }, checkIn - 1 * 3_600_000), 1500);
  assert.equal(refundFor({ ...paid, amount_paid: 0, payment_status: "pay_at_hotel" }, policy, 0), 0);
});

test("GST is a flat 5% with no threshold", () => {
  assert.deepEqual(gstBreakdown(2100, 5, true), { taxable: 2000, gstPercent: 5, cgst: 50, sgst: 50, gst: 100, total: 2100 });
  // Above the old Rs 7,500/night slab the rate is still 5%.
  assert.equal(gstBreakdown(21000, 5, true).gst, 1000);
  assert.equal(gstBreakdown(10000, 5, false).total, 10500);
});
