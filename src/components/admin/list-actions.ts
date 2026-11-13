import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type AdminEntity,
  adminListKey,
  invalidateAdminData,
} from "./admin-cache";

type Id = string | number;

/** A page of an admin list as its query holds it: the rows and their count. */
type ListPage = Record<string, unknown> & { totalCount?: number };

/**
 * Changes rows in every cached page of an admin list. `change` returns the
 * row as it should now look, or null to take it out.
 */
function changeRows<Row extends { id: Id }>(
  queryClient: QueryClient,
  entity: AdminEntity,
  rowsKey: string,
  ids: Set<Id>,
  change: (row: Row) => Row | null,
) {
  queryClient.setQueriesData<ListPage>(
    { queryKey: adminListKey(entity) },
    (page) => {
      const rows = page?.[rowsKey];
      if (!page || !Array.isArray(rows)) return page;
      const kept = (rows as Row[]).flatMap((row) =>
        ids.has(row.id) ? (change(row) ?? []) : [row],
      );
      const removed = rows.length - kept.length;
      return {
        ...page,
        [rowsKey]: kept,
        ...(typeof page.totalCount === "number" && {
          totalCount: page.totalCount - removed,
        }),
      };
    },
  );
}

export interface ListAction<Row> {
  rows: Row[];
  /** The request that makes the change for one row. */
  send: (row: Row) => Promise<Response>;
  /** The row as it will look afterwards; null when it is being deleted. */
  apply: (row: Row) => Row | null;
  done: string;
  failed: string;
}

/** Some of the rows were refused or never reached the server. */
class RowsFailed extends Error {
  constructor(
    readonly failed: number,
    readonly total: number,
  ) {
    super("refused");
  }
}

/**
 * A bulk action of an admin list that shows at once: the rows change on
 * screen before the server answers, and go back if it refuses any of them.
 *
 * `rowsKey` is the name of the row array in the list's data.
 */
export function useListAction<Row extends { id: Id }>(
  entity: AdminEntity,
  rowsKey: string,
) {
  const queryClient = useQueryClient();
  const lists = { queryKey: adminListKey(entity) };
  const mutationKey = ["admin", entity, "list-action"];
  const lastOneRunning = () => queryClient.isMutating({ mutationKey }) === 1;

  return useMutation({
    mutationKey,
    // Actions on one list reach the server one after another, in the order
    // they were clicked. Two quick flips of the same switch would otherwise
    // race and the first click could win.
    scope: { id: mutationKey.join("/") },
    mutationFn: async ({ rows, send }: ListAction<Row>) => {
      // Every request is waited for, also after one failed: the refetch that
      // follows must not run while others are still changing rows.
      const answers = await Promise.allSettled(rows.map(send));
      const failed = answers.filter(
        (answer) => answer.status === "rejected" || !answer.value.ok,
      ).length;
      if (failed > 0) throw new RowsFailed(failed, rows.length);
    },
    onMutate: async ({ rows, apply }) => {
      // Stops refetches that would overwrite the change. Only of pages that
      // already have rows: a page loading for the first time has nothing to
      // fall back on, and cancelling it would turn its navigation into an
      // error.
      await queryClient.cancelQueries({
        ...lists,
        predicate: (query) => query.state.data !== undefined,
      });
      const before = queryClient.getQueriesData<ListPage>(lists);
      changeRows<Row>(
        queryClient,
        entity,
        rowsKey,
        new Set(rows.map((row) => row.id)),
        apply,
      );
      return { before };
    },
    onError: (error, action, context) => {
      // With another action on this list still running, putting the old
      // pages back would also undo that action's rows. The refetch after
      // the last one corrects everything.
      if (lastOneRunning()) {
        for (const [key, page] of context?.before ?? []) {
          queryClient.setQueryData(key, page);
        }
      }
      const some =
        error instanceof RowsFailed && error.failed < error.total
          ? ` (${error.failed} od ${error.total})`
          : "";
      toast.error(action.failed + some);
    },
    onSuccess: (_data, action) => toast.success(action.done),
    // The server's version replaces the guess. Awaited, so the action counts
    // as running until the list is back in step.
    onSettled: () =>
      lastOneRunning() ? invalidateAdminData(queryClient) : undefined,
  });
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export const patchJson = (url: string, body: unknown) =>
  fetch(url, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });

export const deleteRequest = (url: string) => fetch(url, { method: "DELETE" });
