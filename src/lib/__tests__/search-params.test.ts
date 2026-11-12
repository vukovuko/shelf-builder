import { describe, expect, it } from "vitest";
import { parseSearch, stringifySearch } from "../search-params";

describe("search params", () => {
  it("keeps a numeric search as plain text both ways", () => {
    expect(parseSearch("?search=1035&page=2")).toEqual({
      search: "1035",
      page: "2",
    });
    expect(stringifySearch({ search: "1035", page: 2 })).toBe(
      "?search=1035&page=2",
    );
  });

  it("leaves out empty values and writes nothing for an empty search", () => {
    expect(stringifySearch({ search: "", page: undefined, tab: null })).toBe(
      "",
    );
  });

  it("round-trips a repeated key and text that needs encoding", () => {
    const search = { tag: ["a", "b"], return_to: "/account/orders?x=1" };
    expect(parseSearch(stringifySearch(search))).toEqual(search);
  });
});
