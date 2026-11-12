import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { loadDesignerData } from "./designer.server";

const getDesignerData = createServerFn({ method: "GET" }).handler(() =>
  loadDesignerData(getRequestHeaders() as unknown as Headers),
);

// The answer depends on who is signed in (admins also get purchase prices),
// so signing in or out invalidates it; see `refresh` in compat/next/navigation.
export const designerDataQuery = queryOptions({
  queryKey: ["designer", "data"],
  queryFn: () => getDesignerData(),
  staleTime: 5 * 60_000,
});
