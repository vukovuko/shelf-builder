import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy } from "react";
import { type AdminListSearch, adminListSearch } from "@/lib/admin-search";
import { cn } from "@/lib/utils";
import {
  adminAccessoriesQuery,
  adminHandlesQuery,
} from "@/server/admin/admin.functions";

const AccessoriesClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/accessories/AccessoriesClient").then(
        (module) => ({ default: module.AccessoriesClient }),
      ),
    );

const HandlesClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/handles/HandlesClient").then((module) => ({
        default: module.HandlesClient,
      })),
    );

// "Okov" is one page with two lists: door handles, and everything else.
type OkovSearch = AdminListSearch & { tab?: "handles" };

export const Route = createFileRoute("/admin/accessories/")({
  validateSearch: (raw: Record<string, unknown>): OkovSearch => ({
    ...adminListSearch(raw),
    ...(raw.tab === "handles" && { tab: "handles" as const }),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps: { tab, ...list } }) =>
    tab === "handles"
      ? {
          tab: "handles" as const,
          list: await context.queryClient.fetchQuery(adminHandlesQuery(list)),
        }
      : {
          tab: "accessories" as const,
          list: await context.queryClient.fetchQuery(
            adminAccessoriesQuery(list),
          ),
        },
  component: OkovPage,
});

const tabClass =
  "inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium";
const activeTab = "border-primary bg-primary text-primary-foreground";
const idleTab = "border-border bg-background hover:bg-muted";

function OkovPage() {
  const data = Route.useLoaderData();
  const onHandles = data.tab === "handles";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Okov</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Ručke, šarke, klizači i ostali elementi na jednom mestu
          </p>
        </div>
        <Link
          to={onHandles ? "/admin/handles/new" : "/admin/accessories/new"}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {onHandles ? "Dodaj ručku" : "Dodaj okov"}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/admin/accessories"
          className={cn(tabClass, onHandles ? idleTab : activeTab)}
        >
          Ostali okov
        </Link>
        <Link
          to="/admin/accessories"
          search={{ tab: "handles" }}
          className={cn(tabClass, onHandles ? activeTab : idleTab)}
        >
          Ručke vrata
        </Link>
      </div>

      {data.tab === "handles"
        ? HandlesClient && <HandlesClient {...data.list} showHeader={false} />
        : AccessoriesClient && (
            <AccessoriesClient {...data.list} showHeader={false} />
          )}
    </div>
  );
}
