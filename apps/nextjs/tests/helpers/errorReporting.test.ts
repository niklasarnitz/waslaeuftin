import { describe, expect, test } from "bun:test";

import { sanitizeErrorEvent } from "@waslaeuftin/core/errorReporting";

describe("diagnostic wire privacy", () => {
  test("only error categories and reduced code positions leave the app", () => {
    const event = {
      event_id: "1234567890abcdef1234567890abcdef",
      timestamp: 1793960000,
      level: "error",
      user: {
        id: "private-user",
        email: "person@example.com",
        ip_address: "203.0.113.20",
      },
      request: {
        url: "https://example.com/?token=secret",
        headers: { Authorization: "secret" },
      },
      breadcrumbs: [{ message: "private search" }],
      contexts: { device: { id: "private-device" } },
      extra: { location: { latitude: 48.1 }, nested: { password: "secret" } },
      transaction: "/city/private-route",
      debug_meta: { images: [{ code_file: "/Users/private/index.ts" }] },
      exception: {
        values: [
          {
            type: "TypeError",
            value: "private error person@example.com secret",
            stacktrace: {
              frames: [
                {
                  filename:
                    "https://waslaeuft.in/_next/static/chunks/app.js?token=secret#private",
                  function: "privateUserFunction",
                  lineno: 17,
                  colno: 9,
                  in_app: true,
                  vars: { password: "secret" },
                  context_line: "secret source contents",
                },
                { filename: "/Users/private/no-code.txt", lineno: 1 },
              ],
            },
          },
        ],
      },
    };
    expect(sanitizeErrorEvent(event, "browser", "waslaeuftin@1.0.1")).toEqual({
      type: undefined,
      event_id: event.event_id,
      timestamp: event.timestamp,
      level: "error",
      platform: "javascript",
      environment: "production",
      release: "waslaeuftin@1.0.1",
      tags: { surface: "browser" },
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Error details removed for privacy",
            stacktrace: {
              frames: [
                {
                  filename: "app:///app.js",
                  lineno: 17,
                  colno: 9,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
    });
    expect(event.exception.values[0]?.value).toContain("private error");
  });

  test("rejects non-errors and normalizes custom messages/classes and mobile bundle URLs", () => {
    expect(sanitizeErrorEvent({ type: "transaction" }, "server")).toBeNull();
    expect(sanitizeErrorEvent({}, "mobile")).toBeNull();
    const result = sanitizeErrorEvent(
      {
        event_id: "person@example.com",
        exception: {
          values: [
            {
              type: "person@example.com",
              stacktrace: {
                frames: [
                  {
                    filename:
                      "https://example.com/index.bundle?deviceId=private",
                    lineno: -1,
                    colno: Infinity,
                  },
                ],
              },
            },
          ],
        },
      },
      "mobile",
      "private/release",
    );
    expect(result?.event_id).toBeUndefined();
    expect(result?.release).toBeUndefined();
    expect(result?.exception.values).toEqual([
      {
        type: "Error",
        value: "Error details removed for privacy",
        stacktrace: {
          frames: [
            {
              filename: "app:///index.bundle",
              lineno: undefined,
              colno: undefined,
              in_app: false,
            },
          ],
        },
      },
    ]);
  });
});
