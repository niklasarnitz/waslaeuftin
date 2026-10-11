import {
  extractYear,
  normalizeForComparison,
  normalizeMovieTitle,
} from "@waslaeuftin/core";
import { db } from "@waslaeuftin/db/client";

// These mappings correct verified title collisions, not all showings of the
// source films. Explicit source release years and other titles are preserved.
const repairs = [
  {
    title: "Terminator 2",
    sourceTmdbId: 66664,
    targetTmdbId: 280,
    targetYear: 1991,
  },
  {
    title: "Vaterland",
    sourceTmdbId: 11248,
    targetTmdbId: 1437696,
    targetYear: 2026,
  },
];
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--apply")) {
  throw new Error("Usage: repair-ambiguous-tmdb-matches.ts [--apply]");
}
const apply = args.includes("--apply");

async function repair(client: Pick<typeof db, "movie" | "showing">) {
  for (const mapping of repairs) {
    const movies = await client.movie.findMany({
      where: {
        tmdbMovieId: { in: [mapping.sourceTmdbId, mapping.targetTmdbId] },
      },
      include: { tmdbMetadata: true, showings: true },
    });
    const source = movies.find(
      (movie) => movie.tmdbMovieId === mapping.sourceTmdbId,
    );
    const target = movies.find(
      (movie) => movie.tmdbMovieId === mapping.targetTmdbId,
    );
    const sourceYear = extractYear(source?.tmdbMetadata?.releaseDate ?? "");
    if (
      !source ||
      !sourceYear ||
      !target?.tmdbMetadata ||
      !target.coverUrl ||
      extractYear(target.tmdbMetadata.releaseDate ?? "") !== mapping.targetYear
    ) {
      throw new Error(
        `Missing or unexpected stored metadata for ${mapping.title}`,
      );
    }

    const showings = source.showings.filter((showing) => {
      const title = normalizeForComparison(
        normalizeMovieTitle(showing.rawMovieName).normalizedTitle,
      );
      const year = extractYear(
        showing.rawMovieName.match(/\((?:19|20)\d{2}\)/)?.[0] ?? "",
      );
      return (
        title === normalizeForComparison(mapping.title) &&
        (!year || year === mapping.targetYear)
      );
    });
    const targetSlots = new Set(
      target.showings.map(
        (showing) => `${showing.cinemaId}:${showing.dateTime.toISOString()}`,
      ),
    );
    if (
      showings.some((showing) =>
        targetSlots.has(
          `${showing.cinemaId}:${showing.dateTime.toISOString()}`,
        ),
      )
    ) {
      throw new Error(
        `Duplicate target showings for ${mapping.title}; refusing to delete or merge records`,
      );
    }

    // Remove the incorrect title-only alias so future imports use the repaired
    // target. The old film remains available through its explicit release year.
    const sourceNormalizedTitle = `${source.tmdbMetadata?.title ?? source.name} (${sourceYear})`;
    console.info(
      JSON.stringify({
        mode: apply ? "apply" : "dry-run",
        title: mapping.title,
        sourceMovieId: source.id,
        targetMovieId: target.id,
        showingsToMove: showings.length,
        sourceNormalizedTitle,
        targetNormalizedTitle: mapping.title,
      }),
    );

    if (apply) {
      await client.showing.updateMany({
        where: {
          movieId: source.id,
          id: { in: showings.map((showing) => showing.id) },
        },
        data: { movieId: target.id },
      });
      await client.movie.update({
        where: { id: source.id },
        data: {
          name: sourceNormalizedTitle,
          normalizedTitle: sourceNormalizedTitle,
        },
      });
      await client.movie.update({
        where: { id: target.id },
        data: {
          name: target.tmdbMetadata.title,
          normalizedTitle: mapping.title,
        },
      });
    }
  }
}

try {
  if (apply) {
    await db.$transaction(repair, { isolationLevel: "Serializable" });
  } else {
    await repair(db);
    console.info(
      "No writes performed. Run with --apply after reviewing the mappings.",
    );
  }
} finally {
  await db.$disconnect();
}
