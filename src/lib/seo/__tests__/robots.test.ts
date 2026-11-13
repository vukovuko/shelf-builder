import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/seo/site", () => ({
  INDEXABLE: true,
  SITE_URL: "https://ormanipomeri.com",
}));

const { buildRobotsTxt } = await import("../robots");

describe("robots.txt of the production site", () => {
  const robots = buildRobotsTxt();
  const groups = robots.split("\n\n");

  it("states what the content may be used for, inside the open groups", () => {
    const signal = "Content-Signal: ai-train=yes, search=yes, ai-input=yes";
    const everyone = groups.find((group) => group.startsWith("User-Agent: *"));
    const assistants = groups.find((group) => group.includes("GPTBot"));
    expect(everyone).toContain(signal);
    expect(assistants).toContain(signal);
    // The policy text that defines the signals comes first, as comments.
    expect(
      robots.startsWith("# As a condition of accessing this website"),
    ).toBe(true);
  });

  it("still keeps private areas closed and names the sitemap", () => {
    expect(robots).toContain("Disallow: /admin/");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Sitemap: https://ormanipomeri.com/sitemap.xml");
  });

  it("gives the bulk harvesters no signal, only the closed door", () => {
    const harvesters = groups.find((group) => group.includes("img2dataset"));
    expect(harvesters).toContain("Disallow: /");
    expect(harvesters).not.toContain("Content-Signal");
  });
});
