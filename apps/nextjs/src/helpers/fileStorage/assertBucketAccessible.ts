import {
  HeadBucketCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

import { env } from "@waslaeuftin/env";

export const assertBucketAccessible = async (client: S3Client) => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  } catch (error) {
    const status =
      error instanceof S3ServiceException
        ? error.$metadata.httpStatusCode
        : undefined;
    const reason =
      status === 404
        ? "does not exist. Please create it first."
        : status === 403
          ? "is not accessible with the configured credentials."
          : "could not be reached.";

    throw new Error(`S3 bucket "${env.S3_BUCKET}" ${reason}`, {
      cause: error,
    });
  }
};
