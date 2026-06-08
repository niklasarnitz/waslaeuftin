import { expect, test } from "bun:test";
import { safeJsonLd } from "@waslaeuftin/helpers/safeJsonLd";

test("safeJsonLd safely escapes HTML characters", () => {
  const dangerousPayload = {
    test: "</script><script>alert(1)</script>",
    amp: "&",
    line1: "\u2028",
    line2: "\u2029",
  };

  const escaped = safeJsonLd(dangerousPayload);

  // Check that no raw <, >, &, or / remain
  expect(escaped).not.toContain("<");
  expect(escaped).not.toContain(">");
  expect(escaped).not.toContain("&");
  expect(escaped).not.toContain("/");

  // Check that the specific strings were properly escaped
  expect(escaped).toContain("\\u003c");
  expect(escaped).toContain("\\u003e");
  expect(escaped).toContain("\\u0026");
  expect(escaped).toContain("\\u002f");
  expect(escaped).toContain("\\u2028");
  expect(escaped).toContain("\\u2029");
});
