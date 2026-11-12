import { describe, expect, it } from "vitest";
import { isCachedPage } from "../cached-pages";

const get = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { headers });
const site = "https://ormanipomeri.com";

describe("pages answered from the catalog cache", () => {
  it("are the catalog pages and the files built from the catalog", () => {
    for (const path of [
      "/materijali",
      "/materijali/aida-orah-a811ps11",
      "/rucke",
      "/rucke/rucka-md",
      "/sitemap.xml",
      "/llms-full.txt",
    ]) {
      expect(isCachedPage(get(site + path)), path).toBe(true);
    }
  });

  it("are never pages that depend on who is asking", () => {
    for (const path of [
      "/",
      "/design",
      "/contact",
      "/account/orders",
      "/admin/materials",
      "/api/wardrobes",
      "/materijali/a/b",
    ]) {
      expect(isCachedPage(get(site + path)), path).toBe(false);
    }
  });

  it("skip a signed-in visitor, whatever the cookie is called", () => {
    for (const cookie of [
      "better-auth.session_token=abc",
      "theme=dark; __Secure-better-auth.session_token=abc",
    ]) {
      expect(isCachedPage(get(`${site}/materijali`, { cookie }))).toBe(false);
    }
    expect(
      isCachedPage(get(`${site}/materijali`, { cookie: "theme=dark" })),
    ).toBe(true);
  });

  it("skip query strings, other methods and the to-do board's host", () => {
    expect(isCachedPage(get(`${site}/materijali?utm_source=x`))).toBe(false);
    expect(
      isCachedPage(new Request(`${site}/materijali`, { method: "POST" })),
    ).toBe(false);
    expect(isCachedPage(get("https://todo.ormanipomeri.com/materijali"))).toBe(
      false,
    );
  });
});
