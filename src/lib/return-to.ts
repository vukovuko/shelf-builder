export const SIGN_IN_PATH = "/prijava";

/**
 * Where to send someone after they sign in. Only paths on this site are
 * allowed: "//host" and "/\host" are read by browsers as another site, and
 * browsers drop tabs and newlines, so "/\t/host" would become one too.
 * Anything else, including the sign-in page itself, falls back to "/".
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || value.length > 2000) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting them is the point
  if (/[\\\s\x00-\x1f\x7f]/.test(value)) return "/";
  const path = value.split(/[?#]/)[0];
  if (path === SIGN_IN_PATH || path.startsWith("/api/")) return "/";
  return value;
}

export function signInUrl(returnTo: string | null | undefined): string {
  const target = safeReturnTo(returnTo);
  return target === "/"
    ? SIGN_IN_PATH
    : `${SIGN_IN_PATH}?return_to=${encodeURIComponent(target)}`;
}
