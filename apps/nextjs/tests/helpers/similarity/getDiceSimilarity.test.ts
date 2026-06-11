import { expect, test, describe } from "bun:test";
import { getDiceSimilarity } from "../../../src/helpers/similarity/getDiceSimilarity";

describe("getDiceSimilarity", () => {
    test("returns 0 if either string is empty", () => {
        expect(getDiceSimilarity("", "test")).toBe(0);
        expect(getDiceSimilarity("test", "")).toBe(0);
        expect(getDiceSimilarity("", "")).toBe(0);
    });

    test("returns 1 if strings are identical", () => {
        expect(getDiceSimilarity("hello", "hello")).toBe(1);
        expect(getDiceSimilarity("foo bar", "foo bar")).toBe(1);
    });

    test("returns 0 if strings have no bigram overlap", () => {
        expect(getDiceSimilarity("abc", "xyz")).toBe(0);
        expect(getDiceSimilarity("hello", "world")).toBe(0);
    });

    test("returns correct dice similarity for partially matching strings", () => {
        // "night" -> "ni", "ig", "gh", "ht" (4 bigrams)
        // "nacht" -> "na", "ac", "ch", "ht" (4 bigrams)
        // Overlap: "ht" (1 bigram)
        // Similarity: (2 * 1) / (4 + 4) = 2 / 8 = 0.25
        expect(getDiceSimilarity("night", "nacht")).toBe(0.25);

        // "context" -> "co", "on", "nt", "te", "ex", "xt" (6 bigrams)
        // "contact" -> "co", "on", "nt", "ta", "ac", "ct" (6 bigrams)
        // Overlap: "co", "on", "nt" (3 bigrams)
        // Similarity: (2 * 3) / (6 + 6) = 6 / 12 = 0.5
        expect(getDiceSimilarity("context", "contact")).toBe(0.5);
    });

    test("handles strings with spaces correctly", () => {
        // Spaces are stripped in getBigramSet:
        // "a b c" -> "abc" -> "ab", "bc"
        // "ab c" -> "abc" -> "ab", "bc"
        expect(getDiceSimilarity("a b c", "ab c")).toBe(1);

        // "foo bar" -> "foobar" -> "fo", "oo", "ob", "ba", "ar" (5 bigrams)
        // "foo baz" -> "foobaz" -> "fo", "oo", "ob", "ba", "az" (5 bigrams)
        // Overlap: "fo", "oo", "ob", "ba" (4 bigrams)
        // Similarity: (2 * 4) / (5 + 5) = 8 / 10 = 0.8
        expect(getDiceSimilarity("foo bar", "foo baz")).toBe(0.8);
    });

    test("handles short strings correctly", () => {
        // "a" -> "a" (1 bigram)
        // "a" -> "a" (1 bigram)
        expect(getDiceSimilarity("a", "a")).toBe(1);

        // "a" -> "a" (1 bigram)
        // "b" -> "b" (1 bigram)
        expect(getDiceSimilarity("a", "b")).toBe(0);
    });
});
