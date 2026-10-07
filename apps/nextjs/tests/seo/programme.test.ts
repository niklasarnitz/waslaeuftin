import { describe, expect, test } from "bun:test";

import {
  buildHighlights,
  freshness,
  programmeTitle,
} from "@waslaeuftin/helpers/programme";

const now = new Date("2026-10-07T10:00:00Z");
const screening = (
  date: string,
  rawMovieName = "Film",
  tags: string[] = [],
) => ({
  dateTime: new Date(date),
  rawMovieName,
  showingAdditionalData: tags,
  movie: { name: "Film" },
  cinema: { name: "Kino", slug: "kino", country: "GERMANY" as const },
});

describe("programme highlights", () => {
  test("separates tonight, original versions and upcoming days in local time", () => {
    const result = buildHighlights(
      [
        screening("2026-10-07T09:00:00Z", "Film OV"),
        screening("2026-10-07T15:59:00Z"),
        screening("2026-10-07T16:00:00Z", "Film", ["OmU"]),
        screening("2026-10-07T22:30:00Z"),
      ],
      now,
    );
    expect(result.evening.count).toBe(1);
    expect(result.original.count).toBe(1);
    expect(result.upcoming.count).toBe(1);
    expect(result.upcoming.items[0]?.dateTime.toISOString()).toBe(
      "2026-10-07T22:30:00.000Z",
    );
  });
  test("keeps total counts while showing a bounded selection", () => {
    const result = buildHighlights(
      Array.from({ length: 9 }, (_, i) => ({
        ...screening("2026-10-08T16:00:00Z"),
        movie: { name: `Film ${i}` },
      })),
      now,
    );
    expect(result.upcoming.count).toBe(9);
    expect(result.upcoming.items).toHaveLength(4);
  });
  test("unknown and old imports are flagged without inventing freshness", () => {
    expect(freshness(null, now)).toBe("unknown");
    expect(freshness(new Date("2026-10-05T10:00:00Z"), now)).toBe("stale");
    expect(freshness(new Date("2026-10-07T03:00:00Z"), now)).toBe("current");
  });
  test("titles describe the selected day accurately", () => {
    expect(programmeTitle("Berlin", undefined, now)).toBe(
      "Kinoprogramm Berlin – Filme & Spielzeiten heute | wasläuft.in",
    );
    expect(programmeTitle("Babylon in Berlin", "2026-10-08", now)).toContain(
      "08.10.2026",
    );
  });
});
