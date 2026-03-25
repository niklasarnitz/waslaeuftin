import { expect, test, describe } from "bun:test";
import { normalizeMovieTitle } from "@waslaeuftin/helpers/titleNormalization/normalizeMovieTitle";

describe("normalizeMovieTitle", () => {
  test("Basic movie titles with no tags", () => {
    expect(normalizeMovieTitle("The Matrix")).toEqual({ normalizedTitle: "The Matrix", tags: [] });
    expect(normalizeMovieTitle("Blade Runner")).toEqual({ normalizedTitle: "Blade Runner", tags: [] });
  });

  test("Extracting single tags from brackets containing metadata markers", () => {
    expect(normalizeMovieTitle("The Matrix (OV)")).toEqual({ normalizedTitle: "The Matrix", tags: ["OV"] });
    expect(normalizeMovieTitle("Dune (3D)")).toEqual({ normalizedTitle: "Dune", tags: ["3D"] });
  });

  test("Extracting multiple tags from brackets separated by commas/slashes", () => {
    expect(normalizeMovieTitle("Dune (OV/3D)")).toEqual({ normalizedTitle: "Dune", tags: ["OV", "3D"] });
    expect(normalizeMovieTitle("Dune (IMAX, 2D)")).toEqual({ normalizedTitle: "Dune", tags: ["IMAX", "2D"] });
    expect(normalizeMovieTitle("Avatar (3D, OV, IMAX)")).toEqual({ normalizedTitle: "Avatar", tags: ["3D", "OV", "IMAX"] });
  });

  test("Extracting standalone tags matching TAG_PATTERN not in brackets", () => {
    expect(normalizeMovieTitle("Avatar 3D")).toEqual({ normalizedTitle: "Avatar", tags: ["3D"] });
    expect(normalizeMovieTitle("Oppenheimer 70mm")).toEqual({ normalizedTitle: "Oppenheimer", tags: ["70mm"] });
    expect(normalizeMovieTitle("Tenet IMAX")).toEqual({ normalizedTitle: "Tenet", tags: ["IMAX"] });
    expect(normalizeMovieTitle("Some Movie Preview")).toEqual({ normalizedTitle: "Some Movie", tags: ["Preview"] });
  });

  test("Extracting combination of bracket and standalone tags", () => {
    expect(normalizeMovieTitle("Avatar 3D (OV)")).toEqual({ normalizedTitle: "Avatar", tags: ["OV", "3D"] });
    expect(normalizeMovieTitle("Tenet IMAX (English)")).toEqual({ normalizedTitle: "Tenet", tags: ["English", "IMAX"] });
  });

  test("Removing TAG_PATTERN and specific trailing characters like dashes and extra spaces from the base title", () => {
    expect(normalizeMovieTitle("Deadpool - 3D")).toEqual({ normalizedTitle: "Deadpool", tags: ["3D"] });
    expect(normalizeMovieTitle("Movie Name – 2D")).toEqual({ normalizedTitle: "Movie Name", tags: ["2D"] });
    expect(normalizeMovieTitle("Movie Name — OV")).toEqual({ normalizedTitle: "Movie Name", tags: ["OV"] });
    expect(normalizeMovieTitle("Spider-Man: No Way Home - IMAX")).toEqual({ normalizedTitle: "Spider-Man: No Way Home", tags: ["IMAX"] });
  });

  test("Retaining brackets that don't contain metadata markers", () => {
    expect(normalizeMovieTitle("Blade Runner (Director's Cut)")).toEqual({ normalizedTitle: "Blade Runner (Director's Cut)", tags: [] });
    expect(normalizeMovieTitle("Star Wars (Episode IV)")).toEqual({ normalizedTitle: "Star Wars (Episode IV)", tags: [] });
    expect(normalizeMovieTitle("Some Movie (2024)")).toEqual({ normalizedTitle: "Some Movie (2024)", tags: [] });
  });

  test("Tag deduplication", () => {
    expect(normalizeMovieTitle("Avatar 3D (3D)")).toEqual({ normalizedTitle: "Avatar", tags: ["3D"] });
    expect(normalizeMovieTitle("Movie (OV) OV")).toEqual({ normalizedTitle: "Movie", tags: ["OV"] });
  });

  test("Tag canonicalization based on the canonicalizeTag function mapping", () => {
    expect(normalizeMovieTitle("Movie (omu)")).toEqual({ normalizedTitle: "Movie", tags: ["OmU"] });
    expect(normalizeMovieTitle("Movie (omeu)")).toEqual({ normalizedTitle: "Movie", tags: ["OmEU"] });
    expect(normalizeMovieTitle("Movie (dolby atmos)")).toEqual({ normalizedTitle: "Movie", tags: ["Dolby Atmos"] });
    expect(normalizeMovieTitle("Movie (sneak)")).toEqual({ normalizedTitle: "Movie", tags: ["Sneak"] });
    expect(normalizeMovieTitle("Movie (screenx)")).toEqual({ normalizedTitle: "Movie", tags: ["ScreenX"] });
    expect(normalizeMovieTitle("Movie (4dx)")).toEqual({ normalizedTitle: "Movie", tags: ["4DX"] });
    expect(normalizeMovieTitle("Movie (laser)")).toEqual({ normalizedTitle: "Movie", tags: ["Laser"] });
  });

  test("Empty brackets and whitespace handling", () => {
    expect(normalizeMovieTitle("Movie ()")).toEqual({ normalizedTitle: "Movie", tags: [] });
    expect(normalizeMovieTitle("Movie (  )")).toEqual({ normalizedTitle: "Movie", tags: [] });
    expect(normalizeMovieTitle("  Movie  (OV)  ")).toEqual({ normalizedTitle: "Movie", tags: ["OV"] });
  });

    test("Removing trailing commas, dashes and extra spaces from the base title", () => {
        expect(normalizeMovieTitle("Some Movie - ")).toEqual({ normalizedTitle: "Some Movie", tags: [] });
        expect(normalizeMovieTitle("Another Movie , ")).toEqual({ normalizedTitle: "Another Movie", tags: [] });
        expect(normalizeMovieTitle("Movie (IMAX) - ")).toEqual({ normalizedTitle: "Movie", tags: ["IMAX"] });
    });
});
