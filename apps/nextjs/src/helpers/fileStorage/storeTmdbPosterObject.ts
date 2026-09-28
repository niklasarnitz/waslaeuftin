import {
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import { getTmdbPosterUrl } from "@waslaeuftin/core";
import { env } from "@waslaeuftin/env";

const objectExists = async (client: S3Client, key: string) => {
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
    return true;
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      error.$metadata.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
  }
};

export const storeTmdbPosterObject = async (
  client: S3Client,
  posterPath: string,
  objectKey: string,
) => {
  // Keys are derived from the TMDB poster path, so an existing object already
  // holds this exact poster and neither download nor upload is needed.
  if (await objectExists(client, objectKey)) {
    return;
  }

  const posterUrl = getTmdbPosterUrl(
    posterPath,
    env.TMDB_IMAGE_BASE_URL,
    env.TMDB_POSTER_SIZE,
  );
  if (!posterUrl) {
    throw new Error("Invalid poster path");
  }
  const posterResponse = await fetch(posterUrl, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!posterResponse.ok || !posterResponse.body) {
    throw new Error(
      `TMDB poster download failed (${posterResponse.status}) for ${posterUrl}`,
    );
  }

  const contentType = posterResponse.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();

  if (!contentType?.startsWith("image/")) {
    await posterResponse.body.cancel();
    throw new Error(
      `TMDB poster download returned non-image content type "${contentType ?? "none"}" for ${posterUrl}`,
    );
  }

  if (posterResponse.headers.get("content-length") === "0") {
    await posterResponse.body.cancel();
    throw new Error(
      `TMDB poster download returned empty payload for ${posterUrl}`,
    );
  }

  let byteCount = 0;
  const countingStream = posterResponse.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        byteCount += chunk.byteLength;
        controller.enqueue(chunk);
      },
    }),
  );

  await new Upload({
    client,
    params: {
      Bucket: env.S3_BUCKET,
      Key: objectKey,
      Body: countingStream,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    },
  }).done();

  if (byteCount === 0) {
    await client.send(
      new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: objectKey }),
    );
    throw new Error(
      `TMDB poster download returned empty payload for ${posterUrl}`,
    );
  }
};
