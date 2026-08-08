import { expect, test, describe } from "bun:test";
import { sanitizeWhitespace } from "../../../src/helpers/titleNormalization/sanitizeWhitespace";

describe("sanitizeWhitespace", () => {
    test("does not change correctly formatted strings", () => {
        expect(sanitizeWhitespace("Hello World")).toBe("Hello World");
        expect(sanitizeWhitespace("The Matrix")).toBe("The Matrix");
    });

    test("replaces multiple spaces with a single space", () => {
        expect(sanitizeWhitespace("Hello  World")).toBe("Hello World");
        expect(sanitizeWhitespace("The   Matrix   Reloaded")).toBe("The Matrix Reloaded");
    });

    test("trims leading and trailing spaces", () => {
        expect(sanitizeWhitespace(" Hello World ")).toBe("Hello World");
        expect(sanitizeWhitespace("  The Matrix  ")).toBe("The Matrix");
    });

    test("handles newlines, tabs, and mixed whitespace characters", () => {
        expect(sanitizeWhitespace("Hello\tWorld")).toBe("Hello World");
        expect(sanitizeWhitespace("The\nMatrix")).toBe("The Matrix");
        expect(sanitizeWhitespace("  Hello \t \n World  \r\n ")).toBe("Hello World");
    });

    test("handles empty strings or strings with only whitespace", () => {
        expect(sanitizeWhitespace("")).toBe("");
        expect(sanitizeWhitespace(" ")).toBe("");
        expect(sanitizeWhitespace("   ")).toBe("");
        expect(sanitizeWhitespace("\t\n\r")).toBe("");
    });
});
