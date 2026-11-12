import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  loadHandleModels,
  loadHandlePage,
  loadMaterialBrowserItems,
  loadMaterialPage,
} from "./catalog.server";

const slugInput = z.object({ slug: z.string().min(1).max(200) });

const getMaterialBrowserItems = createServerFn({ method: "GET" }).handler(() =>
  loadMaterialBrowserItems(),
);

const getMaterialPage = createServerFn({ method: "GET" })
  .validator(slugInput)
  .handler(({ data }) => loadMaterialPage(data.slug));

const getHandleModels = createServerFn({ method: "GET" }).handler(() =>
  loadHandleModels(),
);

const getHandlePage = createServerFn({ method: "GET" })
  .validator(slugInput)
  .handler(({ data }) => loadHandlePage(data.slug));

// Materials, handles and their prices change from the admin a few times a
// month. Five minutes keeps moving between catalog pages instant.
const staleTime = 5 * 60_000;

export const materialBrowserQuery = queryOptions({
  queryKey: ["catalog", "materials"],
  queryFn: () => getMaterialBrowserItems(),
  staleTime,
});

export const materialPageQuery = (slug: string) =>
  queryOptions({
    queryKey: ["catalog", "material", slug],
    queryFn: () => getMaterialPage({ data: { slug } }),
    staleTime,
  });

export const handleModelsQuery = queryOptions({
  queryKey: ["catalog", "handles"],
  queryFn: () => getHandleModels(),
  staleTime,
});

export const handlePageQuery = (slug: string) =>
  queryOptions({
    queryKey: ["catalog", "handle", slug],
    queryFn: () => getHandlePage({ data: { slug } }),
    staleTime,
  });
