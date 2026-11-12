import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
// The admin's forms still save through the old /api handlers and then call
// router.refresh(), which refetches. Until they become mutations that update
// this cache, nothing here may be shown from cache: a form opened on stale
// values would save them back. Hence staleTime 0 and loaders that fetch.

const listSearch = z.object({
  page: z.number().int().min(1).optional(),
  search: z.string().max(200).optional(),
});
type ListSearch = z.infer<typeof listSearch>;
const textId = z.object({ id: z.string().min(1).max(100) });
const numericId = z.object({ id: z.number().int().positive() });

function list<T>(
  name: string,
  fetchList: (input: { data: ListSearch }) => Promise<T>,
) {
  return (search: ListSearch) =>
    queryOptions({
      queryKey: ["admin", name, "list", search],
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

// --- access -----------------------------------------------------------------

const getAdminAccess = createServerFn({ method: "GET" }).handler(() =>
  loadAdminAccess(),
);

export const adminAccessQuery = queryOptions({
  queryKey: ["admin", "access"],
  queryFn: () => getAdminAccess(),
  staleTime: 60_000,
});

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

export const getTodoHostSignInUrl = createServerFn({ method: "GET" }).handler(
  () => todoHostSignInUrl(),
);
