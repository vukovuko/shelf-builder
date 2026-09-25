import { z } from "zod";

/**
 * The key a client is rate limited under. An IPv6 connection is usually
 * handed a whole /64, so anyone can rotate through billions of addresses
 * and never hit a per-address limit; the /64 is what identifies them.
 * IPv4 addresses and non-IP identifiers (account ids) pass through as is.
 */
export function rateLimitKey(identifier: string): string {
  const lower = identifier.trim().toLowerCase();
  const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped && z.ipv4().safeParse(mapped[1]).success) return mapped[1];
  if (!z.ipv6().safeParse(lower).success) return identifier;

  const [head, tail] = lower.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? left
      : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  const prefix = groups
    .slice(0, 4)
    .map((g) => g.padStart(4, "0"))
    .join(":");
  return `${prefix}::/64`;
}
