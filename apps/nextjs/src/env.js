import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    server: {
        DATABASE_URL: z
            .string()
            .url()
            .refine(
                (str) => !str.includes("YOUR_MYSQL_URL_HERE"),
                "You forgot to change the default URL",
            ),
        NODE_ENV: z
            .enum(["development", "test", "production"])
            .default("development"),
        GITHUB_TOKEN: z.string().optional(),
        TMDB_API_KEY: z.string().min(1),
        TMDB_IMAGE_BASE_URL: z.string().url().default("https://image.tmdb.org/t/p"),
        TMDB_POSTER_SIZE: z.string().min(2).default("w780"),
        TMDB_MIN_CONFIDENCE_SCORE: z.coerce.number().min(0).max(1).default(0.68),
        MINIO_ENDPOINT: z.string().url(),
        MINIO_REGION: z.string().min(1),
        MINIO_ACCESS_KEY: z.string().min(1),
        MINIO_SECRET_KEY: z.string().min(1),
        MINIO_USE_SSL: z
            .string()
            .trim()
            .toLowerCase()
            .transform((value) => value === "true"),
        MINIO_BUCKET: z.string().min(1),
        MINIO_MOVIE_COVERS_PREFIX: z.string().min(1).default("waslaeuftin/tmdb-covers"),
        MINIO_PUBLIC_BASE_URL: z.string().url(),
        UMAMI_URL: z.url(),
        UMAMI_WEBSITE_ID: z.string(),
    },
    client: {},
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        TMDB_API_KEY: process.env.TMDB_API_KEY,
        TMDB_IMAGE_BASE_URL: process.env.TMDB_IMAGE_BASE_URL,
        TMDB_POSTER_SIZE: process.env.TMDB_POSTER_SIZE,
        TMDB_MIN_CONFIDENCE_SCORE: process.env.TMDB_MIN_CONFIDENCE_SCORE,
        MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
        MINIO_REGION: process.env.MINIO_REGION,
        MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
        MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
        MINIO_USE_SSL: process.env.MINIO_USE_SSL,
        MINIO_BUCKET: process.env.MINIO_BUCKET,
        MINIO_MOVIE_COVERS_PREFIX: process.env.MINIO_MOVIE_COVERS_PREFIX,
        MINIO_PUBLIC_BASE_URL: process.env.MINIO_PUBLIC_BASE_URL,
        UMAMI_URL: process.env.UMAMI_URL,
        UMAMI_WEBSITE_ID: process.env.UMAMI_WEBSITE_ID
    },
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    emptyStringAsUndefined: true,
});
