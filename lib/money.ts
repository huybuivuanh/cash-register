/** All money is integer cents. These helpers convert to and from text. */

/**
 * Parses "10,105,881.28", "$12.5" or "7" into cents.
 * Returns null for anything that isn't a non-negative amount with at most 2 decimals.
 * Works on the string directly so no float rounding can creep in.
 */
export function parseMoney(input: string): number | null {
  const text = input.replace(/[$,\s]/g, "");
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(text);
  if (!match) return null;
  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const total = dollars * 100 + cents;
  return Number.isSafeInteger(total) ? total : null;
}

const formatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1010588128 → "10,105,881.28" */
export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}
