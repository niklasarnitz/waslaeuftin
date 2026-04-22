import { expect, test, describe } from "bun:test";
import { safeJsonLd } from "../../src/helpers/safeJsonLd";

describe("safeJsonLd", () => {
  test("escapes HTML characters", () => {
    const data = {
      text: "<script>alert('XSS')</script>",
      amp: "A & B",
    };
    const result = safeJsonLd(data);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).not.toContain("&");
    expect(result).toContain("\\u003cscript\\u003e");
    expect(result).toContain("A \\u0026 B");
  });

  test("handles line terminators", () => {
    const data = {
      text: "Line 1\u2028Line 2\u2029Line 3",
    };
    const result = safeJsonLd(data);
    expect(result).not.toContain("\u2028");
    expect(result).not.toContain("\u2029");
    expect(result).toContain("\\u2028");
    expect(result).toContain("\\u2029");
  });

  test("serializes normal data safely", () => {
    const data = { name: "Normal Movie", year: 2024 };
    const result = safeJsonLd(data);
    expect(result).toBe('{"name":"Normal Movie","year":2024}');
  });
});
