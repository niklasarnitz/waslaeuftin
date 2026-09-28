import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { getTmdbPosterUrl, getUrlPathJoin } from "@waslaeuftin/core";
import { env } from "@waslaeuftin/env";
import { buildStorageKey } from "@waslaeuftin/helpers/fileStorage/buildStorageKey";
import { encodeObjectKeyForPublicUrl } from "@waslaeuftin/helpers/fileStorage/encodeObjectKeyForPublicUrl";
import { TmdbScoredMatch } from "@waslaeuftin/types/TmdbScoredMatch";
import { UploadedCover } from "@waslaeuftin/types/UploadedCover";

export const uploadTmdbPosterToS3 = async (
  client: S3Client,
  movieName: string,
  match: TmdbScoredMatch,
  prefix: string,
  uploadedPosterCache: Map<string, UploadedCover>,
) => {
  if (!match.posterPath) {
    throw new Error("Cannot upload poster without TMDB poster path");
  }

  const cachedUpload = uploadedPosterCache.get(match.posterPath);
  if (cachedUpload) {
    return cachedUpload;
  }

  const posterUrl = getTmdbPosterUrl(
    match.posterPath,
    env.TMDB_IMAGE_BASE_URL,
    env.TMDB_POSTER_SIZE,
  );
  if (!posterUrl) {
    throw new Error("Invalid poster path");
  }
  const posterResponse = await fetch(posterUrl, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!posterResponse.ok) {
    throw new Error(
      `TMDB poster download failed (${posterResponse.status}) for ${posterUrl}`,
    );
  }

  const posterBuffer = new Uint8Array(await posterResponse.arrayBuffer());

  if (posterBuffer.byteLength === 0) {
    throw new Error(
      `TMDB poster download returned empty payload for ${posterUrl}`,
    );
  }

  const objectKey = buildStorageKey(prefix, movieName, match);

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: objectKey,
      Body: posterBuffer,
      ContentLength: posterBuffer.byteLength,
      ContentType: posterResponse.headers.get("content-type") ?? "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const publicUrl = getUrlPathJoin(
    env.S3_PUBLIC_BASE_URL,
    encodeObjectKeyForPublicUrl(objectKey),
  );

  const uploaded = { objectKey, publicUrl } satisfies UploadedCover;
  uploadedPosterCache.set(match.posterPath, uploaded);

  return uploaded;
};
