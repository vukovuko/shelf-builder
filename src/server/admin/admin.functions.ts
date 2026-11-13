import {
  type FetchQueryOptions,
  type QueryClient,
  type QueryKey,
  queryOptions,
} from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type AdminEntity, adminListKey } from "@/components/admin/admin-cache";
import {
  loadAccessories,
  loadAccessory,
  loadHandle,
  loadHandles,
  loadMaterial,
  loadMaterials,
  loadPriceSync,
} from "./catalog.server";
import { loadDashboard } from "./dashboard.server";
import {
  loadAdminAccess,
  loadCompanySettings,
  loadTodoBoard,
  todoHostSignInUrl,
} from "./misc.server";
import { loadNewOrderOptions, loadOrder, loadOrders } from "./orders.server";
import {
  loadAccessoryRule,
  loadAccessoryRules,
  loadRule,
  loadRules,
} from "./rules.server";
import { loadUser, loadUsers } from "./users.server";
import { loadModels, loadWardrobe, loadWardrobes } from "./wardrobes.server";

// Every loader behind these functions checks for the admin role itself, so a
// function is safe to call whatever page asks.
//
// Lists and the dashboard are shown from the cache at once and refetched
// behind it, and list bulk actions change the cache before the server answers
// (src/components/admin/list-actions.ts).
//
// Detail pages are different: their forms copy the record into their own
// state once, so they must never open on a copy that might be old. Their
// loaders fetch a fresh one every time and the page reads loader data; the
// router waits for it (defaultStaleReloadMode in src/router.tsx). The forms
// save through the old /api handlers (adminFetch), which marks all cached
// admin data as out of date.

const listSearch = z.object({
  page: z.number().int().min(1).optional(),
  search: z.string().max(200).optional(),
});
type ListSearch = z.infer<typeof listSearch>;
const textId = z.object({ id: z.string().min(1).max(100) });
const numericId = z.object({ id: z.number().int().positive() });

function list<T>(
  name: AdminEntity,
  fetchList: (input: { data: ListSearch }) => Promise<T>,
) {
  return (search: ListSearch) =>
    queryOptions({
      queryKey: [...adminListKey(name), search],
      queryFn: () => fetchList({ data: search }),
      staleTime: 0,
    });
}

function detail<Id extends string | number, T>(
  name: string,
  fetchOne: (input: { data: { id: Id } }) => Promise<T>,
) {
  return (id: Id) =>
    queryOptions({
      queryKey: ["admin", name, "detail", id],
      queryFn: () => fetchOne({ data: { id } }),
      staleTime: 0,
    });
}

function single<T>(name: string, fetchIt: () => Promise<T>) {
  return queryOptions({
    queryKey: ["admin", name],
    queryFn: () => fetchIt(),
    staleTime: 0,
  });
}

/**
 * For the loader of a page that only shows data (a list, the dashboard): the
 * cached copy when nothing was saved since it was read, otherwise a fresh
 * one. A copy that a save made out of date is never shown, even for a
 * moment: a list would flash the row as it was before.
 */
export function cachedUnlessChanged<Data, Key extends QueryKey>(
  queryClient: QueryClient,
  query: FetchQueryOptions<Data, Error, Data, Key>,
) {
  return queryClient.fetchQuery({
    ...query,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// --- access -----------------------------------------------------------------

const getAdminAccess = createServerFn({ method: "GET" }).handler(() =>
  loadAdminAccess(),
);

export const adminAccessQuery = queryOptions({
  queryKey: ["admin", "access"],
  queryFn: () => getAdminAccess(),
  staleTime: 60_000,
});

/**
 * For a route that lets only admins in. Only a cached "ok" is reused:
 * someone refused a moment ago may have signed in since.
 */
export function freshAdminAccess(queryClient: QueryClient) {
  const cached = queryClient.getQueryData(adminAccessQuery.queryKey);
  return queryClient.fetchQuery(
    cached === "ok" ? adminAccessQuery : { ...adminAccessQuery, staleTime: 0 },
  );
}

// --- dashboard --------------------------------------------------------------

const dashboardRange = z.object({
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  preset: z.string().max(40).optional(),
});
export type DashboardSearch = z.infer<typeof dashboardRange>;

const getDashboard = createServerFn({ method: "GET" })
  .validator(dashboardRange)
  .handler(({ data }) => loadDashboard(data));

export const adminDashboardQuery = (range: DashboardSearch) =>
  queryOptions({
    queryKey: ["admin", "dashboard", range],
    queryFn: () => getDashboard({ data: range }),
    staleTime: 0,
  });

// --- catalog ----------------------------------------------------------------

const getMaterials = createServerFn({ method: "GET" })
  .validator(listSearch)
  .handler(({ data }) => loadMaterials(data));
export const adminMaterialsQuery = list("materials", getMaterials);

const getMaterial = createServerFn({ method: "GET" })
  .validator(numericId)
  .handler(({ data }) => loadMaterial(data.id));
export const adminMaterialQuery = detail("materials", getMaterial);

const getPriceSync = createServerFn({ method: "GET" }).handler(() =>
  loadPriceSync(),
);
export const adminPriceSyncQuery = single("price-sync", getPriceSync);

const getHandles = createServerFn({ method: "GET" })
  .validator(listSearch)
  .handler(({ data }) => loadHandles(data));
export const adminHandlesQuery = list("handles", getHandles);

const getHandle = createServerFn({ method: "GET" })
  .validator(numericId)
  .handler(({ data }) => loadHandle(data.id));
export const adminHandleQuery = detail("handles", getHandle);

const getAccessories = createServerFn({ method: "GET" })
  .validator(listSearch)
  .handler(({ data }) => loadAccessories(data));
export const adminAccessoriesQuery = list("accessories", getAccessories);

const getAccessory = createServerFn({ method: "GET" })
  .validator(numericId)
  .handler(({ data }) => loadAccessory(data.id));
export const adminAccessoryQuery = detail("accessories", getAccessory);

// --- rules ------------------------------------------------------------------

const getRules = createServerFn({ method: "GET" })
  .validator(listSearch)
  .handler(({ data }) => loadRules(data));
export const adminRulesQuery = list("rules", getRules);

const getRule = createServerFn({ method: "GET" })
  .validator(textId)
  .handler(({ data }) => loadRule(data.id));
export const adminRuleQuery = detail("rules", getRule);

const getAccessoryRules = createServerFn({ method: "GET" })
  .validator(listSearch)
  .handler(({ data }) => loadAccessoryRules(data));
export const adminAccessoryRulesQuery = list(
  "accessory-rules",
  getAccessoryRules,
);

const getAccessoryRule = createServerFn({ method: "GET" })
  .validator(textId)
  .handler(({ data }) => loadAccessoryRule(data.id));
export const adminAccessoryRuleQuery = detail(
  "accessory-rules",
  getAccessoryRule,
);

// --- orders -----------------------------------------------------------------

const getOrders = createServerFn({ method: "GET" })
  .validator(listSearch)
  .handler(({ data }) => loadOrders(data));
export const adminOrdersQuery = list("orders", getOrders);

const getOrder = createServerFn({ method: "GET" })
  .validator(textId)
  .handler(({ data }) => loadOrder(data.id));
export const adminOrderQuery = detail("orders", getOrder);

const getNewOrderOptions = createServerFn({ method: "GET" }).handler(() =>
  loadNewOrderOptions(),
);
export const adminNewOrderOptionsQuery = single(
  "new-order-options",
  getNewOrderOptions,
);

// --- users ------------------------------------------------------------------

const getUsers = createServerFn({ method: "GET" })
  .validator(listSearch)
  .handler(({ data }) => loadUsers(data));
export const adminUsersQuery = list("users", getUsers);

const getUser = createServerFn({ method: "GET" })
  .validator(textId)
  .handler(({ data }) => loadUser(data.id));
export const adminUserQuery = detail("users", getUser);

// --- saved designs ----------------------------------------------------------

const getWardrobes = createServerFn({ method: "GET" })
  .validator(listSearch)
  .handler(({ data }) => loadWardrobes(data));
export const adminWardrobesQuery = list("wardrobes", getWardrobes);

const getWardrobe = createServerFn({ method: "GET" })
  .validator(textId)
  .handler(({ data }) => loadWardrobe(data.id));
export const adminWardrobeQuery = detail("wardrobes", getWardrobe);

const getModels = createServerFn({ method: "GET" })
  .validator(listSearch)
  .handler(({ data }) => loadModels(data));
export const adminModelsQuery = list("models", getModels);

// --- settings, to-do board --------------------------------------------------

const getCompanySettings = createServerFn({ method: "GET" }).handler(() =>
  loadCompanySettings(),
);
export const adminSettingsQuery = single("settings", getCompanySettings);

const getTodoBoard = createServerFn({ method: "GET" }).handler(() =>
  loadTodoBoard(),
);
export const adminTodoBoardQuery = single("todo-board", getTodoBoard);

// POST: it creates a one-time sign-in token, so nothing may call it as a
// side effect of preloading or prefetching.
export const getTodoHostSignInUrl = createServerFn({ method: "POST" }).handler(
  () => todoHostSignInUrl(),
);
