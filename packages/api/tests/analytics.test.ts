import { describe, expect, test } from "bun:test";

import { MobileAnalyticsEventInputSchema } from "@waslaeuftin/validators";

describe("Mobile Analytics Event Schema", () => {
  test("validates app-opened event", () => {
    const input = MobileAnalyticsEventInputSchema.parse({
      name: "app-opened",
    });
    expect(input.name).toBe("app-opened");
  });

  test("validates cinema-view event with slug", () => {
    const input = MobileAnalyticsEventInputSchema.parse({
      name: "cinema-view",
      slug: "schauburg-karlsruhe",
    });
    expect(input.name).toBe("cinema-view");
    expect(input.slug).toBe("schauburg-karlsruhe");
  });

  test("validates city-view event with slug", () => {
    const input = MobileAnalyticsEventInputSchema.parse({
      name: "city-view",
      slug: "karlsruhe",
    });
    expect(input.name).toBe("city-view");
    expect(input.slug).toBe("karlsruhe");
  });

  test("backwards compatibility for mobile-app-opened", () => {
    const input = MobileAnalyticsEventInputSchema.parse({
      name: "mobile-app-opened",
    });
    expect(input.name).toBe("mobile-app-opened");
  });
});
