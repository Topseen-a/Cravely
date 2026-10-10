// Mirrors the API: VAT in kobo, rounded half up, on food only.
export function computeTotals(subtotal, deliveryFee, vatPercent) {
  const sub = Math.round(subtotal * 100);
  const fee = Math.round(deliveryFee * 100);
  const vat = Math.floor((sub * Math.round(vatPercent * 100) + 5000) / 10000);
  return { subtotal: sub / 100, delivery: fee / 100, vat: vat / 100, total: (sub + fee + vat) / 100 };
}
