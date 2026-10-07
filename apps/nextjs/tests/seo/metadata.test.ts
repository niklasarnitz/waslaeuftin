import { describe, expect, test } from "bun:test";

import { listingMetadata, listingPath } from "@waslaeuftin/helpers/seo";

describe("listing SEO", () => {
  test("encodes one slug segment, including umlauts and reserved characters", () => {
    expect(listingPath("cinema", "kino_&_café_am_ufer")).toBe(
      "/cinema/kino_%26_caf%C3%A9_am_ufer",
    );
  });

  test("empty schedules remain accessible but are not indexed", () => {
    const metadata = listingMetadata("/city/berlin", false, {});
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe("/city/berlin");
  });

  test("a future schedule makes the base page indexable even on a day off", () => {
    expect(listingMetadata("/city/berlin", true, {}).robots).toEqual({
      index: true,
      follow: true,
    });
  });

  test("date and search variants point to the base URL and stay out of the index", () => {
    for (const query of [{ date: "2026-10-08" }, { searchQuery: "film" }]) {
      const metadata = listingMetadata("/cinema/babylon", true, query);
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.alternates?.canonical).toBe("/cinema/babylon");
    }
  });
});
