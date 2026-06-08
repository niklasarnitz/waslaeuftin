import { describe, expect, it, mock } from "bun:test";

mock.module("@waslaeuftin/env", () => ({
  env: { TRUSTED_PROXIES_COUNT: 1 },
}));

import { getClientIp } from "../../../src/server/api/trpc";
import { env } from "@waslaeuftin/env";

describe("getClientIp", () => {
  it("returns correct ip behind 1 proxy", () => {
    env.TRUSTED_PROXIES_COUNT = 1;
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("5.6.7.8");
  });
  it("returns correct ip behind 2 proxies", () => {
    env.TRUSTED_PROXIES_COUNT = 2;
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" });
    expect(getClientIp(headers)).toBe("5.6.7.8");
  });
  it("returns undefined if 0 trusted proxies", () => {
    env.TRUSTED_PROXIES_COUNT = 0;
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(headers)).toBeUndefined();
  });
  it("returns real-ip if x-forwarded-for is absent", () => {
    env.TRUSTED_PROXIES_COUNT = 1;
    const headers = new Headers({ "x-real-ip": "1.2.3.4" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });
});
