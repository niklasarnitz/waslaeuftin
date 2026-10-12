import { afterEach, describe, expect, mock, test } from "bun:test";

interface UpcomingFilter {
  isListed?: boolean;
  dateTime: { gte: Date };
}

// Model retained rows as well as a live programme; selection happens at the
// database boundary, before sitemap entries are built.
const schedules = [
  {
    city: "güglingen",
    cinema: "kino_&_café_am_ufer",
    isListed: true,
    dateTime: new Date("2099-01-01"),
  },
  {
    city: "withdrawn-city",
    cinema: "withdrawn-cinema",
    isListed: false,
    dateTime: new Date("2099-01-01"),
  },
  {
    city: "past-city",
    cinema: "past-cinema",
    isListed: true,
    dateTime: new Date("2000-01-01"),
  },
];
const selectSchedules = (filter: UpcomingFilter) =>
  schedules.filter(
    (schedule) =>
      (filter.isListed === undefined ||
        schedule.isListed === filter.isListed) &&
      schedule.dateTime >= filter.dateTime.gte,
  );
const cities = mock(
  async (args: {
    where: { cinemas: { some: { showings: { some: UpcomingFilter } } } };
  }) =>
    selectSchedules(args.where.cinemas.some.showings.some).map((schedule) => ({
      slug: schedule.city,
    })),
);
const cinemas = mock(
  async (args: { where: { showings: { some: UpcomingFilter } } }) =>
    selectSchedules(args.where.showings.some).map((schedule) => ({
      slug: schedule.cinema,
    })),
);
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
    expect(entries.map((entry) => entry.url)).not.toContain(
      "https://waslaeuft.in/cinema/withdrawn-cinema",
    );
    expect(entries.map((entry) => entry.url)).not.toContain(
      "https://waslaeuft.in/city/withdrawn-city",
    );
    expect(entries.map((entry) => entry.url)).not.toContain(
      "https://waslaeuft.in/cinema/past-cinema",
    );
    expect(entries.map((entry) => entry.url)).not.toContain(
      "https://waslaeuft.in/city/past-city",
    );
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
