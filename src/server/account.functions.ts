import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  listMyOrders,
  listMyWardrobes,
  listSceneMaterials,
  loadAccountContact,
  loadAccountSettings,
  loadMyOrder,
} from "./account.server";

const requestHeaders = () => getRequestHeaders() as unknown as Headers;

export type MyWardrobe = NonNullable<
  Awaited<ReturnType<typeof listMyWardrobes>>
>[number];

// Query keys all start with "account", and everything about saved designs
// with ["account", "wardrobes"], so one invalidation covers the list and the
// contact form's dropdown.

const getMyWardrobes = createServerFn({ method: "GET" }).handler(() =>
  listMyWardrobes(requestHeaders()),
);

export const myWardrobesQuery = queryOptions({
  queryKey: ["account", "wardrobes", "list"],
  queryFn: () => getMyWardrobes(),
});

const getMyOrders = createServerFn({ method: "GET" }).handler(() =>
  listMyOrders(requestHeaders()),
);

export const myOrdersQuery = queryOptions({
  queryKey: ["account", "orders", "list"],
  queryFn: () => getMyOrders(),
});

const getMyOrder = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1).max(100) }))
  .handler(({ data }) => loadMyOrder(requestHeaders(), data.id));

export const myOrderQuery = (id: string) =>
  queryOptions({
    queryKey: ["account", "orders", "detail", id],
    queryFn: () => getMyOrder({ data: { id } }),
  });

const getSceneMaterials = createServerFn({ method: "GET" }).handler(() =>
  listSceneMaterials(requestHeaders()),
);

export const sceneMaterialsQuery = queryOptions({
  queryKey: ["account", "scene-materials"],
  queryFn: () => getSceneMaterials(),
  staleTime: 5 * 60_000,
});

const getAccountSettings = createServerFn({ method: "GET" }).handler(() =>
  loadAccountSettings(requestHeaders()),
);

export const accountSettingsQuery = queryOptions({
  queryKey: ["account", "settings"],
  queryFn: () => getAccountSettings(),
});

const getAccountContact = createServerFn({ method: "GET" }).handler(() =>
  loadAccountContact(requestHeaders()),
);

export const accountContactQuery = queryOptions({
  queryKey: ["account", "wardrobes", "contact"],
  queryFn: () => getAccountContact(),
});
