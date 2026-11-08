/** All money is integer cents. These helpers turn it into text. */

const formatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1010588128 → "10,105,881.28" */
export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}

/** Receipt / X / Z number as printed: 6 → "000006" */
export function formatSeq(seq: number): string {
  return String(seq).padStart(6, "0");
}
