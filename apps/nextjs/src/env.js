import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string()
      .pipe(z.url())
      .refine(
        (str) => !str.includes("YOUR_MYSQL_URL_HERE"),
        "You forgot to change the default URL",
      ),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    GITHUB_TOKEN: z.string().optional(),
    TMDB_API_KEY: z.string().min(1),
    TMDB_IMAGE_BASE_URL: z.url().default("https://image.tmdb.org/t/p"),
    TMDB_POSTER_SIZE: z.string().min(2).default("w780"),
    TMDB_MIN_CONFIDENCE_SCORE: z.coerce.number().min(0).max(1).default(0.68),
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1).default("us-east-1"),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    // versitygw and most self-hosted gateways need path-style addressing.
    S3_FORCE_PATH_STYLE: z.stringbool().default(true),
    S3_BUCKET: z.string().min(1),
    S3_MOVIE_COVERS_PREFIX: z
      .string()
      .min(1)
      .default("waslaeuftin/tmdb-covers"),
    S3_PUBLIC_BASE_URL: z.url(),
    UMAMI_URL: z.url().optional(),
    UMAMI_WEBSITE_ID: z.string().optional(),
    UMAMI_VIEW_DEDUPLICATION_SECONDS: z.coerce.number().positive().optional(),
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
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_MOVIE_COVERS_PREFIX: process.env.S3_MOVIE_COVERS_PREFIX,
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
    UMAMI_URL: process.env.UMAMI_URL,
    UMAMI_WEBSITE_ID: process.env.UMAMI_WEBSITE_ID,
    UMAMI_VIEW_DEDUPLICATION_SECONDS:
      process.env.UMAMI_VIEW_DEDUPLICATION_SECONDS,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
