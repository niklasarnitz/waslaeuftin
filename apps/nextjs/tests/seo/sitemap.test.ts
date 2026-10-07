import { afterEach, describe, expect, mock, test } from "bun:test";

const cities = mock(async () => [{ slug: "güglingen" }]);
const cinemas = mock(async () => [{ slug: "kino_&_café_am_ufer" }]);
mock.module("@waslaeuftin/db/client", () => ({
  db: { city: { findMany: cities }, cinema: { findMany: cinemas } },
}));

const { default: sitemap } = await import("@waslaeuftin/app/sitemap");
const { default: robots } = await import("@waslaeuftin/app/robots");

afterEach(() => {
  cities.mockClear();
  cinemas.mockClear();
});

describe("sitemap and crawler access", () => {
  test("lists encoded URLs and selects only schedules with future showings", async () => {
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toContain(
      "https://waslaeuft.in/cinema/kino_%26_caf%C3%A9_am_ufer",
    );
    expect(entries.map((entry) => entry.url)).toContain(
      "https://waslaeuft.in/city/g%C3%BCglingen",
    );
    expect(cities).toHaveBeenCalledWith({
      where: {
        cinemas: {
          some: { showings: { some: { dateTime: { gte: expect.any(Date) } } } },
        },
      },
      select: { slug: true },
    });
    expect(cinemas).toHaveBeenCalledWith({
      where: { showings: { some: { dateTime: { gte: expect.any(Date) } } } },
      select: { slug: true },
    });
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(
      true,
    );
  });

  test("database failure does not publish a silently truncated sitemap", async () => {
    cities.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(sitemap()).rejects.toThrow("database unavailable");
  });

  test("crawlers can see noindex on empty pages and discover the sitemap", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] },
      sitemap: "https://waslaeuft.in/sitemap.xml",
    });
  });
});
