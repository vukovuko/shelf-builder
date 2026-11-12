/**
 * Dates as shown on the site. Pages render on the server (UTC) and again in
 * the browser; without a fixed time zone the two disagree around midnight
 * and React has to throw away the server HTML.
 *
 * "sr-Latn-RS", not "sr-RS": plain Serbian spells month names in Cyrillic
 * ("новембар"), and the site is written in Latin script.
 */
export function formatDate(
  date: string | number | Date,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Date(date).toLocaleDateString("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    ...options,
  });
}
