import { describe, expect, test } from "bun:test";

import { ViewDeduplicator } from "@waslaeuftin/api/internal/view-deduplicator";

describe("ViewDeduplicator", () => {
  test("suppresses repeated visits to the same resource inside the window", () => {
    const deduplicator = new ViewDeduplicator(5 * 60 * 1000);

    expect(deduplicator.shouldTrack("ip", "city", "berlin", 0)).toBe(true);
    expect(deduplicator.shouldTrack("ip", "city", "berlin", 60_000)).toBe(
      false,
    );
  });

  test("tracks the same resource again after the window", () => {
    const deduplicator = new ViewDeduplicator(5 * 60 * 1000);

    expect(deduplicator.shouldTrack("ip", "cinema", "kino", 0)).toBe(true);
    expect(
      deduplicator.shouldTrack("ip", "cinema", "kino", 5 * 60 * 1000),
    ).toBe(true);
  });

  test("tracks different resources independently", () => {
    const deduplicator = new ViewDeduplicator(5 * 60 * 1000);

    expect(deduplicator.shouldTrack("ip", "city", "berlin", 0)).toBe(true);
    expect(deduplicator.shouldTrack("ip", "city", "hamburg", 1)).toBe(true);
    expect(deduplicator.shouldTrack("ip", "cinema", "berlin", 2)).toBe(true);
  });
});
