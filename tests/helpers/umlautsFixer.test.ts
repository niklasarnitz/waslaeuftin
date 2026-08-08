import { expect, test, describe } from "bun:test";
import { umlautsFixer, encodeUmlauts } from "../../src/helpers/umlautsFixer";

describe("umlautsFixer helpers", () => {
  describe("umlautsFixer", () => {
    test("decodes special characters properly", () => {
      expect(umlautsFixer("hello%20world")).toBe("hello world");
      expect(umlautsFixer("test%40example.com")).toBe("test@example.com");
    });

    test("decodes german umlauts", () => {
      expect(umlautsFixer("M%C3%BCnchen")).toBe("München");
      expect(umlautsFixer("%C3%84pfel")).toBe("Äpfel");
      expect(umlautsFixer("Gro%C3%9F")).toBe("Groß");
    });

    test("handles normal strings without encoded characters", () => {
      expect(umlautsFixer("normalstring")).toBe("normalstring");
    });
  });

  describe("encodeUmlauts", () => {
    test("encodes special characters properly", () => {
      expect(encodeUmlauts("hello world")).toBe("hello%20world");
      expect(encodeUmlauts("test@example.com")).toBe("test%40example.com");
    });

    test("encodes german umlauts", () => {
      expect(encodeUmlauts("München")).toBe("M%C3%BCnchen");
      expect(encodeUmlauts("Äpfel")).toBe("%C3%84pfel");
      expect(encodeUmlauts("Groß")).toBe("Gro%C3%9F");
    });

    test("does not encode allowed characters", () => {
      expect(encodeUmlauts("A-Za-z0-9_.-!~*'()")).toBe("A-Za-z0-9_.-!~*'()");
    });
  });
});
