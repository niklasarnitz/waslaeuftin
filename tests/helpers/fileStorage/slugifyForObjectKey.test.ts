import { expect, test, describe } from "bun:test";
import { slugifyForObjectKey } from "../../../src/helpers/fileStorage/slugifyForObjectKey";

describe("slugifyForObjectKey", () => {
    test("replaces whitespace with hyphens", () => {
        expect(slugifyForObjectKey("hello world")).toBe("hello-world");
        expect(slugifyForObjectKey("hello   world")).toBe("hello-world");
    });

    test("removes non-alphanumeric characters but keeps valid replacements", () => {
        expect(slugifyForObjectKey("spider-man: no way home")).toBe("spider-man-no-way-home");
    });

    test("handles multiple hyphens", () => {
        expect(slugifyForObjectKey("hello--world")).toBe("hello-world");
    });

    test("removes leading and trailing hyphens", () => {
        expect(slugifyForObjectKey("  hello world  ")).toBe("hello-world");
        expect(slugifyForObjectKey("-hello world-")).toBe("hello-world");
    });

    test("limits length to 70 characters", () => {
        const longString = "a".repeat(100);
        expect(slugifyForObjectKey(longString).length).toBe(70);
    });

    test("returns 'movie' if the result is empty", () => {
        expect(slugifyForObjectKey("")).toBe("movie");
        expect(slugifyForObjectKey("!!!")).toBe("movie");
        expect(slugifyForObjectKey(" - ")).toBe("movie");
    });

    test("normalizes accents and special characters via normalizeForComparison", () => {
        // Assuming normalizeForComparison converts these to a-z0-9 or spaces
        expect(slugifyForObjectKey("Amélie")).toBe("amelie");
        expect(slugifyForObjectKey("Pokémon")).toBe("pokemon");
    });
});
