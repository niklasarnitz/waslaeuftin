import { z } from "zod";

import type {
  ShowingReviewDecision,
  ShowingReviewInput,
} from "@waslaeuftin/helpers/catalogUpdater/planShowingRepairs";
import { db } from "@waslaeuftin/db/client";
import { planShowingRepairs } from "@waslaeuftin/helpers/catalogUpdater/planShowingRepairs";
import {
  MOVIE_MATCHER_VERSION,
  TmdbMovieMatcher,
} from "@waslaeuftin/helpers/tmdb/TmdbMovieMatcher";
import { MovieIdentityEvidenceSchema } from "@waslaeuftin/validators";

// Deliberately no --apply mode and no database writes. Existing bulk movie
// remappers are not safe substitutes for reviewing these per-showing proposals.
const [queuePath, outputPath, limitArgument = "200", ...extra] =
  process.argv.slice(2);
const limit = Number(limitArgument);
if (
  !queuePath ||
  !outputPath ||
  extra.length ||
  !Number.isInteger(limit) ||
  limit < 1
) {
  throw new Error(
    "Usage: plan-showing-repairs.ts <review-queue.json> <report.json> [evaluation-limit]",
  );
}
const queue = z
  .object({
    reviews: z.array(
      z.object({ movieId: z.number().int(), flags: z.array(z.string()) }),
    ),
  })
  .parse(await Bun.file(queuePath).json());
const flagsByMovieId = new Map(
  queue.reviews.map((row) => [row.movieId, row.flags]),
);
const capturedAt = new Date();
try {
  const columns = await db.$queryRaw<
    { column_name: string }[]
  >`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Showing' AND column_name IN ('sourceProvider', 'providerFilmId', 'sourceEvidence')`;
  const provenanceAvailable = columns.length === 3;
  const movies = await db.movie.findMany({
    select: { id: true, tmdbMovieId: true },
  });
  const moviesById = new Map(movies.map((movie) => [movie.id, movie]));
  const storedShowings = await db.showing.findMany({
    where: {
      dateTime: { gte: capturedAt },
      OR: [
        { movieId: { in: [...flagsByMovieId.keys()] } },
        { movie: { tmdbMovieId: null } },
      ],
    },
    select: {
      id: true,
      cinemaId: true,
      movieId: true,
      rawMovieName: true,
      dateTime: true,
      sourceProvider: provenanceAvailable,
      providerFilmId: provenanceAvailable,
      sourceEvidence: provenanceAvailable,
    },
    orderBy: { id: "asc" },
  });
  const occupiedSlots = await db.showing.findMany({
    where: { dateTime: { gte: capturedAt } },
    select: { cinemaId: true, movieId: true, dateTime: true },
  });
  const showings: ShowingReviewInput[] = [];
  const decisions = new Map<number, ShowingReviewDecision>();
  const groups = new Map<string, ShowingReviewInput[]>();
  for (const row of storedShowings) {
    const evidence = MovieIdentityEvidenceSchema.safeParse(
      row.sourceEvidence ?? {},
    );
    const showing = {
      id: row.id,
      cinemaId: row.cinemaId,
      movieId: row.movieId,
      rawMovieName: row.rawMovieName,
      dateTime: row.dateTime,
      sourceProvider: row.sourceProvider ?? null,
      providerFilmId: row.providerFilmId ?? null,
      evidence: evidence.success ? evidence.data : undefined,
    };
    showings.push(showing);
    if (!evidence.success) {
      decisions.set(row.id, { error: "invalid-provider-evidence" });
      continue;
    }
    // Share requests only for identical matching inputs, not movie identities.
    const key = JSON.stringify([showing.rawMovieName, showing.evidence]);
    const group = groups.get(key) ?? [];
    group.push(showing);
    groups.set(key, group);
  }
  const rankedGroups = [...groups.entries()].sort(([, a], [, b]) => {
    const priority = (rows: ShowingReviewInput[]) =>
      rows.some((row) => moviesById.get(row.movieId)?.tmdbMovieId !== null)
        ? 1
        : 0;
    return priority(b) - priority(a) || b.length - a.length;
  });
  const matcher = new TmdbMovieMatcher();
  const evaluations = [];
  for (const [key, group] of rankedGroups.slice(0, limit)) {
    const source = group[0]!;
    let decision: ShowingReviewDecision;
    try {
      decision = {
        evaluation: await matcher.evaluate(
          source.rawMovieName,
          source.evidence,
        ),
      };
    } catch (error) {
      decision = {
        error: error instanceof Error ? error.message : String(error),
      };
    }
    evaluations.push({ key, showingCount: group.length, ...decision });
    for (const showing of group) decisions.set(showing.id, decision);
    if (evaluations.length % 20 === 0)
      console.info(
        `Evaluated ${evaluations.length}/${Math.min(limit, rankedGroups.length)} matching inputs`,
      );
  }
  const rows = planShowingRepairs(
    showings,
    movies,
    decisions,
    occupiedSlots,
  ).map((row) => ({
    ...row,
    flags: flagsByMovieId.get(row.sourceMovieId) ?? ["unmatched"],
  }));
  const statusCounts: Record<string, number> = {};
  const reasonCounts: Record<string, number> = {};
  for (const row of rows) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
    reasonCounts[row.reason] = (reasonCounts[row.reason] ?? 0) + 1;
  }
  const summary = {
    showingCount: rows.length,
    matchingInputs: rankedGroups.length,
    evaluatedInputs: evaluations.length,
    evaluatedShowings: decisions.size,
    evaluationLimit: limit,
    statusCounts,
    reasonCounts,
  };
  await Bun.write(
    outputPath,
    JSON.stringify(
      {
        mode: "read-only-dry-run",
        capturedAt,
        matcherVersion: MOVIE_MATCHER_VERSION,
        provenanceAvailable,
        scope:
          "Future showings of flagged movies plus all currently unmatched movies; historical rows are excluded",
        summary,
        evaluations,
        rows,
      },
      null,
      2,
    ),
  );
  console.info(JSON.stringify(summary, null, 2));
} finally {
  await db.$disconnect();
}
