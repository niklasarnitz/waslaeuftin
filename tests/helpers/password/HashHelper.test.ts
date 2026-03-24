import { expect, test, describe } from "bun:test";
import { hashPassword, checkHashedPassword } from "../../../src/helpers/password/HashHelper";

describe("HashHelper", () => {
  describe("hashPassword", () => {
    test("should return a string", async () => {
      const password = "mySecretPassword123";
      const hash = await hashPassword(password);
      expect(typeof hash).toBe("string");
    });

    test("should return a string in the format salt.hashKey", async () => {
      const password = "mySecretPassword123";
      const hash = await hashPassword(password);

      const parts = hash.split(".");
      expect(parts.length).toBe(2);
      expect(parts[0]).toBeDefined();
      expect(parts[1]).toBeDefined();
    });

    test("should generate different hashes for the same password due to random salt", async () => {
      const password = "mySecretPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);

      const [salt1] = hash1.split(".");
      const [salt2] = hash2.split(".");
      expect(salt1).not.toBe(salt2);
    });
  });

  describe("checkHashedPassword", () => {
    test("should return true for a matching password and hash", async () => {
      const password = "mySecretPassword123";
      const hash = await hashPassword(password);

      const isMatch = await checkHashedPassword(password, hash);
      expect(isMatch).toBe(true);
    });

    test("should return false for an incorrect password", async () => {
      const password = "mySecretPassword123";
      const wrongPassword = "wrongPassword456";
      const hash = await hashPassword(password);

      const isMatch = await checkHashedPassword(wrongPassword, hash);
      expect(isMatch).toBe(false);
    });

    test("should reject with an error for an invalid hash format (missing salt or hashKey)", async () => {
      const password = "mySecretPassword123";
      const invalidHash = "justsomerandomstringwithoutdot";

      await expect(checkHashedPassword(password, invalidHash)).rejects.toThrow("Invalid hash");
    });
  });
});
