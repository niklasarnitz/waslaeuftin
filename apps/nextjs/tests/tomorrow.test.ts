import { NextRequest } from "next/server";
import { afterEach, describe, expect, setSystemTime, test } from "bun:test";

import { proxy } from "@waslaeuftin/proxy";

afterEach(() => setSystemTime());

describe("/tomorrow", () => {
  test.each([
    ["2026-10-10T22:30:00Z", "2026-10-12"],
    ["2026-10-24T22:30:00Z", "2026-10-26"],
    ["2026-12-31T22:30:00Z", "2027-01-01"],
  ])("redirects from %s to the next Berlin calendar day", (now, date) => {
    setSystemTime(new Date(now));
    const response = proxy(
      new NextRequest(
        "https://waslaeuft.in/tomorrow?searchQuery=Berlin&date=2020-01-01",
      ),
    );

    expect(response.status).toBe(307);
    const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe("/");
    expect(destination.searchParams.get("date")).toBe(date);
    expect(destination.searchParams.get("searchQuery")).toBe("Berlin");
  });

  test("leaves the regular homepage unchanged", () => {
    const response = proxy(new NextRequest("https://waslaeuft.in/"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-current-path")).toBe(
      "/",
    );
  });
});
