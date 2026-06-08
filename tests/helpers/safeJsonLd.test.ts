import { expect, test, describe } from "bun:test";
import { safeJsonLd } from "../../src/helpers/safeJsonLd";

describe("safeJsonLd", () => {
  test("escapes HTML-sensitive characters", () => {
    const input = {
      tagOpen: "<",
      tagClose: ">",
      ampersand: "&",
    };
    const expected = '{"tagOpen":"\\u003c","tagClose":"\\u003e","ampersand":"\\u0026"}';
    expect(safeJsonLd(input)).toBe(expected);
  });

  test("escapes line terminators", () => {
    const input = {
      lineSeparator: "\u2028",
      paragraphSeparator: "\u2029",
    };
    const expected = '{"lineSeparator":"\\u2028","paragraphSeparator":"\\u2029"}';
    expect(safeJsonLd(input)).toBe(expected);
  });

  test("escapes characters in strings correctly", () => {
    const input = "An <example> string & containing \u2028 and \u2029";
    const expected = '"An \\u003cexample\\u003e string \\u0026 containing \\u2028 and \\u2029"';
    expect(safeJsonLd(input)).toBe(expected);
  });

  test("handles arrays and nested objects", () => {
    const input = {
      list: ["<script>", "</script>"],
      nested: {
        text: "Tom & Jerry",
      },
    };
    const expected = '{"list":["\\u003cscript\\u003e","\\u003c/script\\u003e"],"nested":{"text":"Tom \\u0026 Jerry"}}';
    expect(safeJsonLd(input)).toBe(expected);
  });

  test("handles empty and primitive values without modification", () => {
    expect(safeJsonLd(null)).toBe("null");
    expect(safeJsonLd(123)).toBe("123");
    expect(safeJsonLd(true)).toBe("true");
    expect(safeJsonLd("plain text")).toBe('"plain text"');
  });

  test("escapes characters efficiently multiple times in the same string", () => {
    const input = "<<>>&&";
    const expected = '"\\u003c\\u003c\\u003e\\u003e\\u0026\\u0026"';
    expect(safeJsonLd(input)).toBe(expected);
  });
});
