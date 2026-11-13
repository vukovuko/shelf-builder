import type { QueryClient } from "@tanstack/react-query";

/** The admin's lists. The name is the middle of each list's query key. */
export type AdminEntity =
  | "materials"
  | "handles"
  | "accessories"
  | "rules"
  | "accessory-rules"
  | "orders"
  | "users"
  | "wardrobes"
  | "models";

/** Matches every cached page of one list, whatever its search and page. */
export const adminListKey = (entity: AdminEntity) =>
  ["admin", entity, "list"] as const;

/**
 * After any admin write. One record shows up in many places (an order on the
 * dashboard, a user's designs in the designs list, a material's price in the
 * admin's own configurator), so everything the admin has cached is marked out
 * of date instead of each write naming its lists: what is on screen is
 * refetched, the rest when it is next opened. The access check is left
 * alone, a save does not change who is signed in.
 */
export function invalidateAdminData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey: [area, name] }) =>
      (area === "admin" && name !== "access") ||
      area === "catalog" ||
      area === "designer",
  });
}
