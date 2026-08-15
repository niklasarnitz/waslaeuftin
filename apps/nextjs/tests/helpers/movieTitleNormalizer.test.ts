import { describe, expect, test } from "bun:test";

import { normalizeMovieTitle } from "@waslaeuftin/core";

describe("normalizeMovieTitle", () => {
  test("Basic movie titles with no tags", () => {
    expect(normalizeMovieTitle("The Matrix")).toEqual({
      normalizedTitle: "The Matrix",
      tags: [],
    });
    expect(normalizeMovieTitle("Blade Runner")).toEqual({
      normalizedTitle: "Blade Runner",
      tags: [],
    });
  });

  test("Extracting single tags from brackets containing metadata markers", () => {
    expect(normalizeMovieTitle("The Matrix (OV)")).toEqual({
      normalizedTitle: "The Matrix",
      tags: ["OV"],
    });
    expect(normalizeMovieTitle("Dune (3D)")).toEqual({
      normalizedTitle: "Dune",
      tags: ["3D"],
    });
  });

  test("Extracting multiple tags from brackets separated by commas/slashes", () => {
    expect(normalizeMovieTitle("Dune (OV/3D)")).toEqual({
      normalizedTitle: "Dune",
      tags: ["OV", "3D"],
    });
    expect(normalizeMovieTitle("Dune (IMAX, 2D)")).toEqual({
      normalizedTitle: "Dune",
      tags: ["IMAX", "2D"],
    });
    expect(normalizeMovieTitle("Avatar (3D, OV, IMAX)")).toEqual({
      normalizedTitle: "Avatar",
      tags: ["3D", "OV", "IMAX"],
    });
  });

  test("Extracting standalone tags matching TAG_PATTERN not in brackets", () => {
    expect(normalizeMovieTitle("Avatar 3D")).toEqual({
      normalizedTitle: "Avatar",
      tags: ["3D"],
    });
    expect(normalizeMovieTitle("Oppenheimer 70mm")).toEqual({
      normalizedTitle: "Oppenheimer",
      tags: ["70mm"],
    });
    expect(normalizeMovieTitle("Die Odyssee 70 mm")).toEqual({
      normalizedTitle: "Die Odyssee",
      tags: ["70mm"],
    });
    expect(normalizeMovieTitle("Tenet IMAX")).toEqual({
      normalizedTitle: "Tenet",
      tags: ["IMAX"],
    });
    expect(normalizeMovieTitle("Some Movie Preview")).toEqual({
      normalizedTitle: "Some Movie",
      tags: ["Preview"],
    });
  });

  test("Extracting combination of bracket and standalone tags", () => {
    expect(normalizeMovieTitle("Avatar 3D (OV)")).toEqual({
      normalizedTitle: "Avatar",
      tags: ["OV", "3D"],
    });
    expect(normalizeMovieTitle("Tenet IMAX (English)")).toEqual({
      normalizedTitle: "Tenet",
      tags: ["English", "IMAX"],
    });
  });

  test("Removing TAG_PATTERN and specific trailing characters like dashes and extra spaces from the base title", () => {
    expect(normalizeMovieTitle("Deadpool - 3D")).toEqual({
      normalizedTitle: "Deadpool",
      tags: ["3D"],
    });
    expect(normalizeMovieTitle("Movie Name – 2D")).toEqual({
      normalizedTitle: "Movie Name",
      tags: ["2D"],
    });
    expect(normalizeMovieTitle("Movie Name — OV")).toEqual({
      normalizedTitle: "Movie Name",
      tags: ["OV"],
    });
    expect(normalizeMovieTitle("Spider-Man: No Way Home - IMAX")).toEqual({
      normalizedTitle: "Spider-Man: No Way Home",
      tags: ["IMAX"],
    });
  });

  test("Retaining brackets that don't contain metadata markers", () => {
    expect(normalizeMovieTitle("Blade Runner (Director's Cut)")).toEqual({
      normalizedTitle: "Blade Runner (Director's Cut)",
      tags: [],
    });
    expect(normalizeMovieTitle("Star Wars (Episode IV)")).toEqual({
      normalizedTitle: "Star Wars (Episode IV)",
      tags: [],
    });
    expect(normalizeMovieTitle("Some Movie (2024)")).toEqual({
      normalizedTitle: "Some Movie",
      tags: [],
    });
  });

  test("Tag deduplication", () => {
    expect(normalizeMovieTitle("Avatar 3D (3D)")).toEqual({
      normalizedTitle: "Avatar",
      tags: ["3D"],
    });
    expect(normalizeMovieTitle("Movie (OV) OV")).toEqual({
      normalizedTitle: "Movie",
      tags: ["OV"],
    });
  });

  test("Tag canonicalization based on the canonicalizeTag function mapping", () => {
    expect(normalizeMovieTitle("Movie (omu)")).toEqual({
      normalizedTitle: "Movie",
      tags: ["OmU"],
    });
    expect(normalizeMovieTitle("Movie (omeu)")).toEqual({
      normalizedTitle: "Movie",
      tags: ["OmEU"],
    });
    expect(normalizeMovieTitle("Movie (dolby atmos)")).toEqual({
      normalizedTitle: "Movie",
      tags: ["Dolby Atmos"],
    });
    expect(normalizeMovieTitle("Movie (sneak)")).toEqual({
      normalizedTitle: "Movie",
      tags: ["Sneak"],
    });
    expect(normalizeMovieTitle("Movie (screenx)")).toEqual({
      normalizedTitle: "Movie",
      tags: ["ScreenX"],
    });
    expect(normalizeMovieTitle("Movie (4dx)")).toEqual({
      normalizedTitle: "Movie",
      tags: ["4DX"],
    });
    expect(normalizeMovieTitle("Movie (laser)")).toEqual({
      normalizedTitle: "Movie",
      tags: ["Laser"],
    });
  });

  test("Empty brackets and whitespace handling", () => {
    expect(normalizeMovieTitle("Movie ()")).toEqual({
      normalizedTitle: "Movie",
      tags: [],
    });
    expect(normalizeMovieTitle("Movie (  )")).toEqual({
      normalizedTitle: "Movie",
      tags: [],
    });
    expect(normalizeMovieTitle("  Movie  (OV)  ")).toEqual({
      normalizedTitle: "Movie",
      tags: ["OV"],
    });
  });

  test("Removing trailing commas, dashes and extra spaces from the base title", () => {
    expect(normalizeMovieTitle("Some Movie - ")).toEqual({
      normalizedTitle: "Some Movie",
      tags: [],
    });
    expect(normalizeMovieTitle("Another Movie , ")).toEqual({
      normalizedTitle: "Another Movie",
      tags: [],
    });
    expect(normalizeMovieTitle("Movie (IMAX) - ")).toEqual({
      normalizedTitle: "Movie",
      tags: ["IMAX"],
    });
  });

  test("HTML entity decoding and smart quote normalization", () => {
    expect(normalizeMovieTitle("Minions &amp; Monster")).toEqual({
      normalizedTitle: "Minions & Monster",
      tags: [],
    });
    expect(normalizeMovieTitle("Mel Brook´s Spaceballs")).toEqual({
      normalizedTitle: "Mel Brook's Spaceballs",
      tags: [],
    });
    expect(normalizeMovieTitle("Virgina Woolf’s Night & Day")).toEqual({
      normalizedTitle: "Virgina Woolf's Night & Day",
      tags: [],
    });
  });

  test("Extracting extended metadata tags (Live Action, Extended Version, englische Fassung, years)", () => {
    expect(normalizeMovieTitle("Vaiana (Live Action)")).toEqual({
      normalizedTitle: "Vaiana",
      tags: ["Live Action"],
    });
    expect(normalizeMovieTitle("Backrooms (Extended Version)")).toEqual({
      normalizedTitle: "Backrooms",
      tags: ["Extended Version"],
    });
    expect(normalizeMovieTitle("Paw Patrol 3 (englische Fassung)")).toEqual({
      normalizedTitle: "Paw Patrol 3",
      tags: ["English"],
    });
    expect(
      normalizeMovieTitle(
        "Lustiges Pettersson und Findus Mitmachkino 2 (2026)",
      ),
    ).toEqual({
      normalizedTitle: "Lustiges Pettersson und Findus Mitmachkino 2",
      tags: [],
    });
  });

  test("Extracting opera and event cinema affixes", () => {
    expect(
      normalizeMovieTitle("MET 2026/27 Giuseppe Verdi: OTELLO"),
    ).toEqual({
      normalizedTitle: "OTELLO",
      tags: ["MET Opera", "Giuseppe Verdi"],
    });
    expect(
      normalizeMovieTitle("Lotte und Totte - Mein erster Kinobesuch"),
    ).toEqual({
      normalizedTitle: "Lotte und Totte",
      tags: ["Mein erster Kinobesuch"],
    });
  });

  test("Extracting extended edition, open air, eberhofer krimi, and 70mm affixes", () => {
    expect(
      normalizeMovieTitle("Backrooms Everything Must Go (Extended Version)"),
    ).toEqual({
      normalizedTitle: "Backrooms",
      tags: ["Extended Version", "Everything Must Go"],
    });
    expect(normalizeMovieTitle("Die Odyssee 70 mm")).toEqual({
      normalizedTitle: "Die Odyssee",
      tags: ["70mm"],
    });
    expect(
      normalizeMovieTitle("Steckerlfischfiasko - Ein Eberhofer Krimi"),
    ).toEqual({
      normalizedTitle: "Steckerlfischfiasko",
      tags: ["Eberhofer-Krimi"],
    });
    expect(normalizeMovieTitle("Steckerlfischfiasko - Open Air")).toEqual({
      normalizedTitle: "Steckerlfischfiasko",
      tags: ["Open Air"],
    });
  });
});

