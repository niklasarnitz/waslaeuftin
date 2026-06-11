import { createHash } from "node:crypto";
import { slugifyForObjectKey } from "./slugifyForObjectKey";
import { TmdbScoredMatch } from "@waslaeuftin/types/TmdbScoredMatch";

export const buildStorageKey = (
    prefix: string,
    movieName: string,
    match: TmdbScoredMatch
) => {
    const extension = (match.posterPath?.split(".").pop() ?? "jpg").replace(
        /[^a-z0-9]/gi,
        ""
    );
    const posterHash = createHash("sha1")
        .update(match.posterPath ?? `${match.tmdbMovieId}`)
        .digest("hex")
        .slice(0, 12);
    const titleSlug = slugifyForObjectKey(movieName);

    return `${prefix}/${titleSlug}-${match.tmdbMovieId}-${posterHash}.${extension || "jpg"}`;
};
