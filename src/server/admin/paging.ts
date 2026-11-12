export const PAGE_SIZE = 20;

/** What an admin list is asked for: a page of results, optionally searched. */
export interface ListSearch {
  page?: number;
  search?: string;
}

export function paging(input: ListSearch) {
  const page = Math.max(Math.floor(Number(input.page)) || 1, 1);
  return {
    page,
    offset: (page - 1) * PAGE_SIZE,
    search: input.search?.trim() || "",
  };
}

/** Rows go to the admin components with dates as ISO strings. */
export function withIsoDates<T extends { createdAt: Date; updatedAt: Date }>(
  row: T,
) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
