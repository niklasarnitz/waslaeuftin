import { expect, test, describe } from "bun:test";
import { getUrlPathJoin } from "../../../src/helpers/titleNormalization/getUrlPathJoin";

describe("getUrlPathJoin", () => {
    test("handles empty inputs", () => {
        expect(getUrlPathJoin()).toBe("");
        expect(getUrlPathJoin("")).toBe("");
        expect(getUrlPathJoin("", "")).toBe("");
    });

    test("joins simple paths without slashes", () => {
        expect(getUrlPathJoin("foo", "bar")).toBe("foo/bar");
        expect(getUrlPathJoin("foo", "bar", "baz")).toBe("foo/bar/baz");
    });

    test("removes redundant leading and trailing slashes", () => {
        expect(getUrlPathJoin("foo/", "/bar")).toBe("foo/bar");
        expect(getUrlPathJoin("/foo/", "/bar/")).toBe("/foo/bar");
        expect(getUrlPathJoin("foo//", "//bar")).toBe("foo/bar");
        expect(getUrlPathJoin("foo", "//bar", "baz//")).toBe("foo/bar/baz");
    });

    test("preserves protocol slashes at the start", () => {
        expect(getUrlPathJoin("http://example.com/", "/foo")).toBe("http://example.com/foo");
        expect(getUrlPathJoin("https://example.com", "foo/", "/bar")).toBe("https://example.com/foo/bar");
        expect(getUrlPathJoin("ftp://server.com/", "/path/")).toBe("ftp://server.com/path");
    });

    test("preserves absolute path at the start", () => {
        expect(getUrlPathJoin("/api", "/v1/", "/users/")).toBe("/api/v1/users");
        expect(getUrlPathJoin("/api/", "/v1/", "/users/")).toBe("/api/v1/users");
    });

    test("filters out empty values in between", () => {
        expect(getUrlPathJoin("foo", "", "bar")).toBe("foo/bar");
        expect(getUrlPathJoin("", "foo", "bar")).toBe("foo/bar");
    });
});
