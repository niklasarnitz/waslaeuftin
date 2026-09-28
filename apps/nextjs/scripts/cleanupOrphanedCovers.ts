import {
  DeleteObjectsCommand,
  paginateListObjectsV2,
} from "@aws-sdk/client-s3";

import { normalizePrefix } from "@waslaeuftin/core";
import { db } from "@waslaeuftin/db/client";
import { env } from "@waslaeuftin/env";
import { assertBucketAccessible } from "@waslaeuftin/helpers/fileStorage/assertBucketAccessible";
import { createS3Client } from "@waslaeuftin/helpers/fileStorage/createS3Client";

// Removes cover objects under S3_MOVIE_COVERS_PREFIX that no movie references
// any more (replaced covers, merged or deleted movies).
// Dry run by default; pass --delete to actually remove objects.

const shouldDelete = process.argv.includes("--delete");
// Skip recent objects so a concurrently running catalog update that has
// uploaded but not yet persisted a cover doesn't lose it.
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

const getKeyFromPublicUrl = (url: string) => {
  const baseUrl = env.S3_PUBLIC_BASE_URL.replace(/\/+$/, "") + "/";
  if (!url.startsWith(baseUrl)) {
    return null;
  }

  return url
    .slice(baseUrl.length)
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
};

const client = createS3Client();

try {
  await assertBucketAccessible(client);

  const prefix = `${normalizePrefix(env.S3_MOVIE_COVERS_PREFIX)}/`;

  const movies = await db.movie.findMany({
    where: {
      OR: [{ coverStorageKey: { not: null } }, { coverUrl: { not: null } }],
    },
    select: { coverStorageKey: true, coverUrl: true },
  });

  const referencedKeys = new Set<string>();
  for (const movie of movies) {
    if (movie.coverStorageKey) {
      referencedKeys.add(movie.coverStorageKey);
    }
    const keyFromUrl = movie.coverUrl
      ? getKeyFromPublicUrl(movie.coverUrl)
      : null;
    if (keyFromUrl) {
      referencedKeys.add(keyFromUrl);
    }
  }

  const cutoff = Date.now() - MIN_AGE_MS;
  const orphanedKeys: string[] = [];
  let totalObjects = 0;

  for await (const page of paginateListObjectsV2(
    { client },
    { Bucket: env.S3_BUCKET, Prefix: prefix },
  )) {
    for (const object of page.Contents ?? []) {
      if (!object.Key) continue;
      totalObjects += 1;

      if (
        referencedKeys.has(object.Key) ||
        object.Key === `${prefix}.keep` ||
        (object.LastModified?.getTime() ?? 0) > cutoff
      ) {
        continue;
      }

      orphanedKeys.push(object.Key);
    }
  }

  console.info(
    `[Cover Cleanup] ${totalObjects} objects under "${prefix}", ${referencedKeys.size} referenced keys, ${orphanedKeys.length} orphaned`,
  );

  if (!shouldDelete) {
    for (const key of orphanedKeys) {
      console.info(`[Cover Cleanup] Would delete: ${key}`);
    }
    console.info("[Cover Cleanup] Dry run; pass --delete to remove them.");
  } else {
    let deletedCount = 0;
    // DeleteObjects accepts at most 1000 keys per request.
    for (let i = 0; i < orphanedKeys.length; i += 1000) {
      const response = await client.send(
        new DeleteObjectsCommand({
          Bucket: env.S3_BUCKET,
          Delete: {
            Objects: orphanedKeys.slice(i, i + 1000).map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );

      for (const error of response.Errors ?? []) {
        console.warn(
          `[Cover Cleanup] Failed to delete ${error.Key}: ${error.Code} ${error.Message}`,
        );
      }
      deletedCount +=
        Math.min(1000, orphanedKeys.length - i) -
        (response.Errors?.length ?? 0);
    }
    console.info(`[Cover Cleanup] Deleted ${deletedCount} objects.`);
  }
} finally {
  client.destroy();
  await db.$disconnect();
}
