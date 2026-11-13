import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

type Id = string | number;

/** A page of an admin list as its query holds it: the rows and their count. */
type ListPage = Record<string, unknown> & { totalCount?: number };

const listsOf = (entity: string) => ({ queryKey: ["admin", entity, "list"] });

/**
 * Changes rows in every cached page of an admin list. `change` returns the
 * row as it should now look, or null to take it out.
 */
function changeRows<Row extends { id: Id }>(
  queryClient: QueryClient,
  entity: string,
  rowsKey: string,
  ids: Set<Id>,
  change: (row: Row) => Row | null,
) {
  queryClient.setQueriesData<ListPage>(listsOf(entity), (page) => {
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
  });
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

/**
 * A bulk action of an admin list that shows at once: the rows change on
 * screen before the server answers, and go back if it refuses any of them.
 *
 * `entity` is the middle of the list's query key (["admin", entity, "list"]),
 * `rowsKey` the name of the row array in the list's data. `alsoStale` names
 * other entities whose lists show the same records.
 */
export function useListAction<Row extends { id: Id }>(
  entity: string,
  rowsKey: string,
  alsoStale: string[] = [],
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rows, send }: ListAction<Row>) => {
      const answers = await Promise.all(rows.map(send));
      if (!answers.every((answer) => answer.ok)) throw new Error("refused");
    },
    onMutate: async ({ rows, apply }) => {
      await queryClient.cancelQueries(listsOf(entity));
      const before = queryClient.getQueriesData<ListPage>(listsOf(entity));
      changeRows<Row>(
        queryClient,
        entity,
        rowsKey,
        new Set(rows.map((row) => row.id)),
        apply,
      );
      return { before };
    },
    onError: (_error, action, context) => {
      for (const [key, page] of context?.before ?? []) {
        queryClient.setQueryData(key, page);
      }
      toast.error(action.failed);
    },
    onSuccess: (_data, action) => toast.success(action.done),
    // The server's version replaces the guess, also on other pages of the
    // list and on the detail pages of what changed.
    onSettled: () =>
      Promise.all(
        [entity, ...alsoStale].map((name) =>
          queryClient.invalidateQueries({ queryKey: ["admin", name] }),
        ),
      ),
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
