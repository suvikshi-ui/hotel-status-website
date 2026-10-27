/**
 * GST on room tariff: one flat rate (default 5%), no slab or price threshold.
 * Pure helper shared by the invoice page and tests.
 */
export type GstBreakdown = {
  taxable: number;
  gstPercent: number;
  cgst: number;
  sgst: number;
  gst: number;
  total: number;
};

const paise = (n: number) => Math.round(n * 100) / 100;

export function gstBreakdown(amount: number, gstPercent: number, pricesIncludeGst: boolean): GstBreakdown {
  const rate = gstPercent / 100;
  const taxable = pricesIncludeGst ? paise(amount / (1 + rate)) : paise(amount);
  const total = pricesIncludeGst ? paise(amount) : paise(amount * (1 + rate));
  const gst = paise(total - taxable);
  const cgst = paise(gst / 2);
  return { taxable, gstPercent, cgst, sgst: paise(gst - cgst), gst, total };
}
