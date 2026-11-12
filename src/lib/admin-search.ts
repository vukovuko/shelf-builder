/** Search params of an admin list page: `?page=2&search=hrast`. */
export interface AdminListSearch {
  page?: number;
  search?: string;
}

// Defaults are left out so a plain list keeps a plain URL.
export function adminListSearch(raw: Record<string, unknown>): AdminListSearch {
  const page = Math.floor(Number(raw.page));
  // The router reads "?search=1035" as a number.
  const search = raw.search == null ? "" : String(raw.search).trim();
  return {
    ...(page > 1 && { page }),
    ...(search && { search: search.slice(0, 200) }),
  };
}
