import { expect, test, describe } from "bun:test";
import { normalizePrefix } from "../../../src/helpers/titleNormalization/normalizePrefix";

describe("normalizePrefix", () => {
    test("removes leading slashes", () => {
        expect(normalizePrefix("/foo")).toBe("foo");
        expect(normalizePrefix("//foo")).toBe("foo");
    });

    test("removes trailing slashes", () => {
        expect(normalizePrefix("foo/")).toBe("foo");
        expect(normalizePrefix("foo//")).toBe("foo");
    });

    test("removes both leading and trailing slashes", () => {
        expect(normalizePrefix("/foo/")).toBe("foo");
        expect(normalizePrefix("//foo//")).toBe("foo");
    });

    test("handles strings without slashes", () => {
        expect(normalizePrefix("foo")).toBe("foo");
    });

    test("handles empty strings", () => {
        expect(normalizePrefix("")).toBe("");
    });

    test("handles strings containing only slashes", () => {
        expect(normalizePrefix("/")).toBe("");
        expect(normalizePrefix("//")).toBe("");
        expect(normalizePrefix("///")).toBe("");
    });

    test("preserves slashes in the middle of the string", () => {
        expect(normalizePrefix("foo/bar")).toBe("foo/bar");
        expect(normalizePrefix("/foo/bar/")).toBe("foo/bar");
        expect(normalizePrefix("//foo//bar//")).toBe("foo//bar");
    });
});
