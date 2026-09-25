/**
 * Dates as shown on the site. Pages render on Vercel's servers (UTC) and
 * again in the browser; without a fixed time zone the two disagree around
 * midnight and React has to throw away the server HTML.
 */
export function formatDate(
  date: string | number | Date,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Date(date).toLocaleDateString("sr-RS", {
    timeZone: "Europe/Belgrade",
    ...options,
  });
}
