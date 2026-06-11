import { expect, test, describe } from "bun:test";
import { clampScore } from "../../../src/helpers/similarity/clampScore";

describe("clampScore", () => {
  test("returns the value if it is strictly between 0 and 1", () => {
    expect(clampScore(0.5)).toBe(0.5);
    expect(clampScore(0.99)).toBe(0.99);
    expect(clampScore(0.01)).toBe(0.01);
  });

  test("returns 0 if the value is exactly 0", () => {
    expect(clampScore(0)).toBe(0);
  });

  test("returns 1 if the value is exactly 1", () => {
    expect(clampScore(1)).toBe(1);
  });

  test("returns 0 if the value is less than 0", () => {
    expect(clampScore(-0.1)).toBe(0);
    expect(clampScore(-1)).toBe(0);
    expect(clampScore(-100)).toBe(0);
  });

  test("returns 1 if the value is greater than 1", () => {
    expect(clampScore(1.1)).toBe(1);
    expect(clampScore(2)).toBe(1);
    expect(clampScore(100)).toBe(1);
  });
});
