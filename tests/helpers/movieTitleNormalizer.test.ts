import { expect, test, describe } from "bun:test";
import { normalizeMovieTitle } from "@waslaeuftin/helpers/titleNormalization/normalizeMovieTitle";

describe("normalizeMovieTitle", () => {
  test("Basic movie titles with no tags", () => {
    expect(normalizeMovieTitle("The Matrix")).toEqual({ baseTitle: "The Matrix", tags: [] });
    expect(normalizeMovieTitle("Blade Runner")).toEqual({ baseTitle: "Blade Runner", tags: [] });
  });

  test("Extracting single tags from brackets containing metadata markers", () => {
    expect(normalizeMovieTitle("The Matrix (OV)")).toEqual({ baseTitle: "The Matrix", tags: ["OV"] });
    expect(normalizeMovieTitle("Dune (3D)")).toEqual({ baseTitle: "Dune", tags: ["3D"] });
  });

  test("Extracting multiple tags from brackets separated by commas/slashes", () => {
    expect(normalizeMovieTitle("Dune (OV/3D)")).toEqual({ baseTitle: "Dune", tags: ["OV", "3D"] });
    expect(normalizeMovieTitle("Dune (IMAX, 2D)")).toEqual({ baseTitle: "Dune", tags: ["IMAX", "2D"] });
    expect(normalizeMovieTitle("Avatar (3D, OV, IMAX)")).toEqual({ baseTitle: "Avatar", tags: ["3D", "OV", "IMAX"] });
  });

  test("Extracting standalone tags matching TAG_PATTERN not in brackets", () => {
    expect(normalizeMovieTitle("Avatar 3D")).toEqual({ baseTitle: "Avatar", tags: ["3D"] });
    expect(normalizeMovieTitle("Oppenheimer 70mm")).toEqual({ baseTitle: "Oppenheimer", tags: ["70mm"] });
    expect(normalizeMovieTitle("Tenet IMAX")).toEqual({ baseTitle: "Tenet", tags: ["IMAX"] });
    expect(normalizeMovieTitle("Some Movie Preview")).toEqual({ baseTitle: "Some Movie", tags: ["Preview"] });
  });

  test("Extracting combination of bracket and standalone tags", () => {
    expect(normalizeMovieTitle("Avatar 3D (OV)")).toEqual({ baseTitle: "Avatar", tags: ["OV", "3D"] });
    expect(normalizeMovieTitle("Tenet IMAX (English)")).toEqual({ baseTitle: "Tenet", tags: ["English", "IMAX"] });
  });

  test("Removing TAG_PATTERN and specific trailing characters like dashes and extra spaces from the base title", () => {
    expect(normalizeMovieTitle("Deadpool - 3D")).toEqual({ baseTitle: "Deadpool", tags: ["3D"] });
    expect(normalizeMovieTitle("Movie Name – 2D")).toEqual({ baseTitle: "Movie Name", tags: ["2D"] });
    expect(normalizeMovieTitle("Movie Name — OV")).toEqual({ baseTitle: "Movie Name", tags: ["OV"] });
    expect(normalizeMovieTitle("Spider-Man: No Way Home - IMAX")).toEqual({ baseTitle: "Spider-Man: No Way Home", tags: ["IMAX"] });
  });

  test("Retaining brackets that don't contain metadata markers", () => {
    expect(normalizeMovieTitle("Blade Runner (Director's Cut)")).toEqual({ baseTitle: "Blade Runner (Director's Cut)", tags: [] });
    expect(normalizeMovieTitle("Star Wars (Episode IV)")).toEqual({ baseTitle: "Star Wars (Episode IV)", tags: [] });
    expect(normalizeMovieTitle("Some Movie (2024)")).toEqual({ baseTitle: "Some Movie (2024)", tags: [] });
  });

  test("Tag deduplication", () => {
    expect(normalizeMovieTitle("Avatar 3D (3D)")).toEqual({ baseTitle: "Avatar", tags: ["3D"] });
    expect(normalizeMovieTitle("Movie (OV) OV")).toEqual({ baseTitle: "Movie", tags: ["OV"] });
  });

  test("Tag canonicalization based on the canonicalizeTag function mapping", () => {
    expect(normalizeMovieTitle("Movie (omu)")).toEqual({ baseTitle: "Movie", tags: ["OmU"] });
    expect(normalizeMovieTitle("Movie (omeu)")).toEqual({ baseTitle: "Movie", tags: ["OmEU"] });
    expect(normalizeMovieTitle("Movie (dolby atmos)")).toEqual({ baseTitle: "Movie", tags: ["Dolby Atmos"] });
    expect(normalizeMovieTitle("Movie (sneak)")).toEqual({ baseTitle: "Movie", tags: ["Sneak"] });
    expect(normalizeMovieTitle("Movie (screenx)")).toEqual({ baseTitle: "Movie", tags: ["ScreenX"] });
    expect(normalizeMovieTitle("Movie (4dx)")).toEqual({ baseTitle: "Movie", tags: ["4DX"] });
    expect(normalizeMovieTitle("Movie (laser)")).toEqual({ baseTitle: "Movie", tags: ["Laser"] });
  });

  test("Empty brackets and whitespace handling", () => {
    expect(normalizeMovieTitle("Movie ()")).toEqual({ baseTitle: "Movie", tags: [] });
    expect(normalizeMovieTitle("Movie (  )")).toEqual({ baseTitle: "Movie", tags: [] });
    expect(normalizeMovieTitle("  Movie  (OV)  ")).toEqual({ baseTitle: "Movie", tags: ["OV"] });
  });
});
