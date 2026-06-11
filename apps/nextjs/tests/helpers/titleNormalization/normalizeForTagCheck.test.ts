import { describe, expect, test } from "bun:test";

import { normalizeForTagCheck } from "@waslaeuftin/helpers/titleNormalization/normalizeForTagCheck";

describe("normalizeForTagCheck", () => {
  test("handles empty inputs", () => {
    expect(normalizeForTagCheck("")).toBe("");
    expect(normalizeForTagCheck("   ")).toBe("");
  });

  test("converts to lowercase", () => {
    expect(normalizeForTagCheck("Hello WORLD")).toBe("hello world");
    expect(normalizeForTagCheck("TITLE")).toBe("title");
  });

  test("removes accents", () => {
    expect(normalizeForTagCheck("Café")).toBe("cafe");
    expect(normalizeForTagCheck("Märchen")).toBe("marchen");
    expect(normalizeForTagCheck("Amélie")).toBe("amelie");
    expect(normalizeForTagCheck("über")).toBe("uber");
    expect(normalizeForTagCheck("façade")).toBe("facade");
    expect(normalizeForTagCheck("niño")).toBe("nino");
  });

  test("sanitizes whitespace", () => {
    expect(normalizeForTagCheck("  hello   world  ")).toBe("hello world");
    expect(normalizeForTagCheck("hello\tworld\n")).toBe("hello world");
  });

  test("handles mixed cases with accents, uppercase, and irregular whitespace", () => {
    expect(normalizeForTagCheck("  L'Amélie \t POULAIN  ")).toBe(
      "l'amelie poulain",
    );
    expect(normalizeForTagCheck("Das   Märchen von \n O")).toBe(
      "das marchen von o",
    );
    expect(normalizeForTagCheck("   Cinépolis \n  VIP   ")).toBe(
      "cinepolis vip",
    );
  });
});
