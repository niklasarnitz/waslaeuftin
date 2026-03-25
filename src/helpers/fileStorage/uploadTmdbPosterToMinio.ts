import { env } from "@waslaeuftin/env";
import { Client as MinioClient } from "minio";
import { buildStorageKey } from "./buildStorageKey";
import { encodeObjectKeyForPublicUrl } from "./encodeObjectKeyForPublicUrl";
import { getTmdbPosterUrl } from "../tmdb/getTmdbPosterUrl";
import { getUrlPathJoin } from "../titleNormalization/getUrlPathJoin";
import { UploadedCover } from "../../types/UploadedCover";
import { TmdbScoredMatch } from "@waslaeuftin/types/TmdbScoredMatch";

export const uploadTmdbPosterToMinio = async (
    client: MinioClient,
    movieName: string,
    match: TmdbScoredMatch,
    prefix: string,
    uploadedPosterCache: Map<string, UploadedCover>
) => {
    if (!match.posterPath) {
        throw new Error("Cannot upload poster without TMDB poster path");
    }

    const cachedUpload = uploadedPosterCache.get(match.posterPath);
    if (cachedUpload) {
        return cachedUpload;
    }

    const posterUrl = getTmdbPosterUrl(match.posterPath);
    const posterResponse = await fetch(posterUrl);

    if (!posterResponse.ok) {
        throw new Error(
            `TMDB poster download failed (${posterResponse.status}) for ${posterUrl}`
        );
    }

    const posterArrayBuffer = await posterResponse.arrayBuffer();
    const posterBuffer = Buffer.from(posterArrayBuffer);

    if (posterBuffer.length === 0) {
        throw new Error(
            `TMDB poster download returned empty payload for ${posterUrl}`
        );
    }

    const objectKey = buildStorageKey(prefix, movieName, match);

    await client.putObject(
        env.MINIO_BUCKET,
        objectKey,
        posterBuffer,
        posterBuffer.length,
        {
            "Content-Type": posterResponse.headers.get("content-type") ?? "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
        }
    );

    const publicUrl = getUrlPathJoin(
        env.MINIO_PUBLIC_BASE_URL,
        encodeObjectKeyForPublicUrl(objectKey)
    );

    const uploaded = { objectKey, publicUrl } satisfies UploadedCover;
    uploadedPosterCache.set(match.posterPath, uploaded);

    return uploaded;
};
