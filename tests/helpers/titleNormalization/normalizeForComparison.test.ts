import { expect, test, describe } from "bun:test";
import { normalizeForComparison } from "../../../src/helpers/titleNormalization/normalizeForComparison";

describe("normalizeForComparison", () => {
    test("lowercases all characters", () => {
        expect(normalizeForComparison("HELLO WORLD")).toBe("hello world");
        expect(normalizeForComparison("The Matrix")).toBe("the matrix");
    });

    test("removes accents and diacritics", () => {
        expect(normalizeForComparison("Amélie")).toBe("amelie");
        expect(normalizeForComparison("Léon: The Professional")).toBe("leon the professional");
        expect(normalizeForComparison("Māori")).toBe("maori");
        expect(normalizeForComparison("Pokémon")).toBe("pokemon");
    });

    test("replaces ampersands with ' und '", () => {
        expect(normalizeForComparison("Tom & Jerry")).toBe("tom und jerry");
        expect(normalizeForComparison("Fast & Furious")).toBe("fast und furious");
        expect(normalizeForComparison("Beauty & The Beast")).toBe("beauty und the beast");
    });

    test("replaces non-alphanumeric characters with spaces", () => {
        expect(normalizeForComparison("Spider-Man: No Way Home")).toBe("spider man no way home");
        expect(normalizeForComparison("Star Wars, Episode IV - A New Hope")).toBe("star wars episode iv a new hope");
        expect(normalizeForComparison("X-Men 2")).toBe("x men 2");
        expect(normalizeForComparison("Mission: Impossible - Fallout")).toBe("mission impossible fallout");
    });

    test("sanitizes whitespace", () => {
        expect(normalizeForComparison("  Space   Jam  ")).toBe("space jam");
        expect(normalizeForComparison("The\nDark\tKnight")).toBe("the dark knight");
    });

    test("handles complex titles combining all elements", () => {
        expect(normalizeForComparison("  Léon: The Professional & The Matrix (1999) - Édition Spéciale  ")).toBe("leon the professional und the matrix 1999 edition speciale");
        expect(normalizeForComparison("Spider-Man: Across the Spider-Verse (Part One)")).toBe("spider man across the spider verse part one");
    });
});
