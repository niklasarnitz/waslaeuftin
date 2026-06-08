import { describe, expect, it } from "bun:test";
import { buildStorageKey } from "../../../src/helpers/fileStorage/buildStorageKey";

describe("buildStorageKey", () => {
    it("should build a valid storage key", () => {
        const result = buildStorageKey("posters", "The Matrix", {
            tmdbMovieId: 603,
            posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
            score: 1.0
        } as any);
        expect(result).toBeString();
        expect(result).toInclude("posters/the-matrix-603-");
        expect(result).toInclude(".jpg");
    });
});
