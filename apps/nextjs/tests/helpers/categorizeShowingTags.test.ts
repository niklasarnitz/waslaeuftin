import { describe, expect, test } from "bun:test";

import { categorizeShowingTags } from "@waslaeuftin/core";

describe("categorizeShowingTags", () => {
  test("categorizes 70mm and format tags correctly", () => {
    const result = categorizeShowingTags(
      ["70mm"],
      ["Saal 1", "Barrierefrei", "Rollstuhl"],
    );
    expect(result.prominentTags).toEqual(["70mm"]);
    expect(result.infoItems).toEqual(["Saal 1", "Barrierefrei", "Rollstuhl"]);
  });

  test("handles 70 mm with space in raw title tags or additional data", () => {
    const result = categorizeShowingTags([], ["70 mm", "Atmos", "Kino 2"]);
    expect(result.prominentTags).toEqual(["70mm", "Atmos"]);
    expect(result.infoItems).toEqual(["Kino 2"]);
  });

  test("categorizes OV, IMAX, Atmos, and 3D properly", () => {
    const result = categorizeShowingTags(
      ["IMAX"],
      ["OV", "Dolby Atmos", "FSK 12"],
    );
    expect(result.prominentTags).toEqual(["OV", "IMAX", "Atmos"]);
    expect(result.infoItems).toEqual(["FSK 12"]);
  });

  test("deduplicates redundant format tags and places remaining metadata in infoItems", () => {
    const result = categorizeShowingTags(
      ["OV"],
      [
        "Spanisch",
        "Sondervorstellung",
        "V-MAX",
        "OV (Originalversion)",
        "OmU",
        "2D",
        "FSK 6",
        "Barrierefrei",
        "Rollstuhl",
      ],
    );
    expect(result.prominentTags).toEqual(["OV", "OmU", "2D", "V-MAX"]);
    expect(result.infoItems).toEqual([
      "Spanisch",
      "Sondervorstellung",
      "FSK 6",
      "Barrierefrei",
      "Rollstuhl",
    ]);
  });

  test("returns empty arrays when no tags or additional data exist", () => {
    const result = categorizeShowingTags([], null);
    expect(result.prominentTags).toEqual([]);
    expect(result.infoItems).toEqual([]);
  });
});
