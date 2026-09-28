import { S3Client } from "@aws-sdk/client-s3";

import { getUrlPathJoin } from "@waslaeuftin/core";
import { env } from "@waslaeuftin/env";
import { buildStorageKey } from "@waslaeuftin/helpers/fileStorage/buildStorageKey";
import { encodeObjectKeyForPublicUrl } from "@waslaeuftin/helpers/fileStorage/encodeObjectKeyForPublicUrl";
import { storeTmdbPosterObject } from "@waslaeuftin/helpers/fileStorage/storeTmdbPosterObject";
import { TmdbScoredMatch } from "@waslaeuftin/types/TmdbScoredMatch";
import { UploadedCover } from "@waslaeuftin/types/UploadedCover";

export const uploadTmdbPosterToS3 = async (
  client: S3Client,
  movieName: string,
  match: TmdbScoredMatch,
  prefix: string,
  uploadedPosterCache: Map<string, Promise<UploadedCover>>,
): Promise<UploadedCover> => {
  const { posterPath } = match;
  if (!posterPath) {
    throw new Error("Cannot upload poster without TMDB poster path");
  }

  // Cache the promise so concurrent callers for the same poster share one upload.
  const cachedUpload = uploadedPosterCache.get(posterPath);
  if (cachedUpload) {
    return cachedUpload;
  }

  const objectKey = buildStorageKey(prefix, movieName, match);
  const upload = storeTmdbPosterObject(client, posterPath, objectKey).then(
    () =>
      ({
        objectKey,
        publicUrl: getUrlPathJoin(
          env.S3_PUBLIC_BASE_URL,
          encodeObjectKeyForPublicUrl(objectKey),
        ),
      }) satisfies UploadedCover,
  );

  uploadedPosterCache.set(posterPath, upload);
  upload.catch(() => uploadedPosterCache.delete(posterPath));

  return upload;
};
