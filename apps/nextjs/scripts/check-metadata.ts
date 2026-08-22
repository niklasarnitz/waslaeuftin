import { db } from "@waslaeuftin/db/client";

function replacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

async function main() {
  const totalMovies = await db.movie.count();
  const moviesWithTmdbId = await db.movie.count({
    where: { tmdbMovieId: { not: null } },
  });
  const totalTmdbMetadata = await db.tmdbMetadata.count();
  const sampleMetadata = await db.tmdbMetadata.findFirst();
  const sampleMoviesWithMeta = await db.movie.findMany({
    where: { tmdbMovieId: { not: null } },
    include: { tmdbMetadata: true },
    take: 3,
  });

  console.log("=== DB METADATA CHECK ===");
  console.log("Total Movies:", totalMovies);
  console.log("Movies with tmdbMovieId:", moviesWithTmdbId);
  console.log("Total TmdbMetadata rows:", totalTmdbMetadata);
  console.log(
    "Sample TmdbMetadata:",
    JSON.stringify(sampleMetadata, replacer, 2),
  );
  console.log(
    "Sample Movies with Metadata:",
    JSON.stringify(sampleMoviesWithMeta, replacer, 2),
  );

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
