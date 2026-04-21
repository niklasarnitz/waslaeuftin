import { expect, test, describe } from "bun:test";
import { getBigramSet } from "@waslaeuftin/helpers/similarity/getBigramSet";

describe("getBigramSet", () => {
  test("Basic word with more than 2 chars", () => {
    expect(getBigramSet("hello")).toEqual(new Set(["he", "el", "ll", "lo"]));
  });

  test("Word with exact 2 characters", () => {
    expect(getBigramSet("hi")).toEqual(new Set(["hi"]));
  });

  test("String shorter than 2 characters", () => {
    expect(getBigramSet("a")).toEqual(new Set(["a"]));
    expect(getBigramSet("")).toEqual(new Set([""]));
  });

  test("String with whitespaces", () => {
    expect(getBigramSet("he llo")).toEqual(new Set(["he", "el", "ll", "lo"]));
    expect(getBigramSet(" h i ")).toEqual(new Set(["hi"]));
    expect(getBigramSet("   ")).toEqual(new Set([""]));
  });

  test("Multiple duplicate bigrams", () => {
      // "aaaa" -> "aa", "aa", "aa", but set removes duplicates
      expect(getBigramSet("aaaa")).toEqual(new Set(["aa"]));
  });
});
