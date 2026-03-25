import { env } from "@waslaeuftin/env";
import { Client as MinioClient } from "minio";

export const ensureMinioFolder = async (client: MinioClient, prefix: string) => {
    const bucketExists = await client.bucketExists(env.MINIO_BUCKET);

    if (!bucketExists) {
        throw new Error(
            `MinIO bucket "${env.MINIO_BUCKET}" does not exist. Please create it first.`
        );
    }

    const keepFileKey = `${prefix}/.keep`;

    try {
        await client.statObject(env.MINIO_BUCKET, keepFileKey);
    } catch {
        await client.putObject(
            env.MINIO_BUCKET,
            keepFileKey,
            Buffer.from("waslaeuftin movie covers\n"),
            undefined,
            {
                "Content-Type": "text/plain; charset=utf-8",
            }
        );
    }
};
