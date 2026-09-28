import { S3Client } from "@aws-sdk/client-s3";

import { env } from "@waslaeuftin/env";

export const createS3Client = () =>
  new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    // Only send/validate the newer flexible checksums when an operation
    // requires them; S3-compatible gateways don't all support them.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
