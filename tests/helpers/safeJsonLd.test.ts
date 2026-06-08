import { expect, test, describe } from "bun:test";
import { safeJsonLd } from "../../src/helpers/safeJsonLd";

describe("safeJsonLd", () => {
  test("escapes HTML sensitive characters correctly", () => {
    const maliciousData = {
      text: "<script>alert('XSS & more /')</script>",
    };

    const result = safeJsonLd(maliciousData);

    // Should not contain raw unescaped characters
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).not.toContain("&");
    expect(result).not.toContain("'");
    expect(result).not.toContain("/");

    // Should contain unicode escaped versions
    expect(result).toContain("\\u003c"); // <
    expect(result).toContain("\\u003e"); // >
    expect(result).toContain("\\u0026"); // &
    expect(result).toContain("\\u0027"); // '
    expect(result).toContain("\\u002f"); // /
  });

  test("escapes line terminators", () => {
    const dataWithTerminators = {
      text: "Line 1\u2028Line 2\u2029Line 3",
    };

    const result = safeJsonLd(dataWithTerminators);

    // It is safe to just search for the strings representation
    expect(result).toContain("\\u2028");
    expect(result).toContain("\\u2029");
  });

  test("preserves valid JSON structure", () => {
    const safeData = {
      name: "My Cinema",
      url: "https://example.com/cinema",
    };

    const result = safeJsonLd(safeData);

    // Result should still be valid JSON and identical to stringified data
    // except for the escaped / in the url
    expect(JSON.parse(result)).toEqual(safeData);
  });
});
