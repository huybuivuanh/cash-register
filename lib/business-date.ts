/**
 * The business date a moment belongs to. Anything before the cutoff counts as
 * the previous day, so a sale at 1:15 AM lands on the same day as the Z
 * closed that night. Returns "YYYY-MM-DD".
 */
export function businessDate(
  when: Date,
  timezone: string,
  cutoff: string, // "HH:MM"
): string {
  const [h, m] = cutoff.split(":").map(Number);
  const shifted = new Date(when.getTime() - (h * 60 + m) * 60_000);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}
