import { expect, test, describe } from "bun:test";
import { getTokenOverlapScore } from "@waslaeuftin/helpers/similarity/getTokenOverlapScore";

describe("getTokenOverlapScore", () => {
  test("returns 0 for empty strings", () => {
    expect(getTokenOverlapScore("", "")).toBe(0);
    expect(getTokenOverlapScore("   ", "   ")).toBe(0);
  });

  test("returns 1 for exactly identical strings", () => {
    expect(getTokenOverlapScore("hello world", "hello world")).toBe(1);
    expect(getTokenOverlapScore("a b c", "a b c")).toBe(1);
  });

  test("returns 0 for completely disjoint strings", () => {
    expect(getTokenOverlapScore("hello world", "foo bar")).toBe(0);
    expect(getTokenOverlapScore("apples oranges", "bananas pears")).toBe(0);
  });

  test("returns correct score for partial overlap", () => {
    // left: "hello", "world" (size 2)
    // right: "hello", "there" (size 2)
    // overlap: "hello" (size 1)
    // result: 1 / 2 = 0.5
    expect(getTokenOverlapScore("hello world", "hello there")).toBe(0.5);

    // left: "the", "quick", "brown", "fox" (size 4)
    // right: "the", "fox" (size 2)
    // overlap: "the", "fox" (size 2)
    // result: 2 / 4 = 0.5
    expect(getTokenOverlapScore("the quick brown fox", "the fox")).toBe(0.5);

    // left: "a", "b", "c" (size 3)
    // right: "b", "c" (size 2)
    // overlap: "b", "c" (size 2)
    // result: 2 / 3
    expect(getTokenOverlapScore("a b c", "b c")).toBe(2 / 3);
  });

  test("handles extra whitespace gracefully", () => {
    expect(getTokenOverlapScore("hello   world", "hello world")).toBe(1);
    expect(getTokenOverlapScore("  hello  world  ", "hello world")).toBe(1);
  });

  test("deduplicates repeated tokens", () => {
    // left: "hello" (deduplicated to 1)
    // right: "hello", "world" (size 2)
    // overlap: "hello" (size 1)
    // result: 1 / 2 = 0.5
    expect(getTokenOverlapScore("hello hello hello", "hello world")).toBe(0.5);

    // left: "a", "b", "c" (size 3)
    // right: "a", "b" (size 2, "b" is deduplicated)
    // overlap: "a", "b" (size 2)
    // result: 2 / 3
    expect(getTokenOverlapScore("a b b c", "a b b b")).toBe(2 / 3);
  });
});
