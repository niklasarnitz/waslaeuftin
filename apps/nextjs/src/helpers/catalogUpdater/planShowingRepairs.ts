import type { Movie, Showing } from "@waslaeuftin/db";
import type { TmdbMatchEvaluation } from "@waslaeuftin/types/TmdbMatchEvaluation";
import type { MovieIdentityEvidence } from "@waslaeuftin/validators";
import { classifySneakTitle, extractYear } from "@waslaeuftin/core";

export type ShowingReviewInput = Pick<
  Showing,
  "id" | "cinemaId" | "movieId" | "rawMovieName" | "dateTime"
> & {
  sourceProvider?: string | null;
  providerFilmId?: string | null;
  evidence?: MovieIdentityEvidence;
};
export type ShowingReviewDecision =
  { evaluation: TmdbMatchEvaluation } | { error: string };

// Proposals are review material, not authorization to write. Never rewrite all
// showings of a Movie: their raw titles can establish different identities.
export const planShowingRepairs = (
  showings: ShowingReviewInput[],
  movies: Pick<Movie, "id" | "tmdbMovieId">[],
  decisions: Map<number, ShowingReviewDecision>,
  occupiedSlots: Pick<Showing, "cinemaId" | "movieId" | "dateTime">[],
) => {
  const moviesById = new Map(movies.map((movie) => [movie.id, movie]));
  const movieIdByTmdbId = new Map(
    movies
      .filter((movie) => movie.tmdbMovieId !== null)
      .map((movie) => [movie.tmdbMovieId, movie.id]),
  );
  const slotKey = (cinemaId: number, movieId: number, dateTime: Date) =>
    `${cinemaId}:${movieId}:${dateTime.toISOString()}`;
  const slots = new Set(
    occupiedSlots.map((row) =>
      slotKey(row.cinemaId, row.movieId, row.dateTime),
    ),
  );
  const rows = showings.map((showing) => {
    const decision = decisions.get(showing.id);
    const storedTmdbId = moviesById.get(showing.movieId)?.tmdbMovieId ?? null;
    const evaluation =
      decision && "evaluation" in decision ? decision.evaluation : null;
    const isUnannounced = classifySneakTitle(
      showing.rawMovieName,
    ).isUnannounced;
    const candidate = isUnannounced ? null : evaluation?.acceptedCandidate;
    const targetMovieId = candidate
      ? (movieIdByTmdbId.get(candidate.tmdbMovieId) ?? null)
      : null;
    let status = "unevaluated";
    let reason = "evaluation-limit";
    if (isUnannounced) {
      status = storedTmdbId === null ? "unchanged" : "proposed-detach";
      reason = "unannounced-screening";
    } else if (decision && "error" in decision) {
      status = "held";
      reason = decision.error;
    } else if (evaluation) {
      const years = [
        showing.evidence?.productionYear,
        extractYear(
          showing.rawMovieName.match(/\((?:19|20)\d{2}\)/)?.[0] ?? "",
        ),
      ].filter(Boolean);
      if (evaluation.requestedTitle !== showing.rawMovieName) {
        status = "held";
        reason = "source-title-conflict";
      } else if (
        candidate &&
        years.some((year) => extractYear(candidate.releaseDate ?? "") !== year)
      ) {
        status = "held";
        reason = "explicit-year-conflict";
      } else if (!candidate) {
        status =
          storedTmdbId === null
            ? "unchanged"
            : evaluation.decisionReason === "programme"
              ? "proposed-detach"
              : "held";
        reason = evaluation.decisionReason ?? "insufficient-evidence";
      } else if (candidate.tmdbMovieId === storedTmdbId) {
        status = "unchanged";
        reason = "same-identity";
      } else if (!targetMovieId) {
        status = "held";
        reason = "target-not-stored";
      } else if (
        slots.has(slotKey(showing.cinemaId, targetMovieId, showing.dateTime))
      ) {
        status = "held";
        reason = "duplicate-target-slot";
      } else {
        status = "proposed-remap";
        reason = "review-required";
      }
    }
    return {
      showingId: showing.id,
      cinemaId: showing.cinemaId,
      dateTime: showing.dateTime,
      rawMovieName: showing.rawMovieName,
      sourceProvider: showing.sourceProvider ?? null,
      providerFilmId: showing.providerFilmId ?? null,
      evidence: showing.evidence ?? {},
      sourceMovieId: showing.movieId,
      storedTmdbId,
      proposedTmdbId: candidate?.tmdbMovieId ?? null,
      targetMovieId,
      status,
      reason,
    };
  });
  const proposedSlots = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.status !== "proposed-remap" || !row.targetMovieId) continue;
    const key = slotKey(row.cinemaId, row.targetMovieId, row.dateTime);
    const group = proposedSlots.get(key) ?? [];
    group.push(row);
    proposedSlots.set(key, group);
  }
  for (const group of proposedSlots.values()) {
    if (group.length < 2) continue;
    for (const row of group) {
      row.status = "held";
      row.reason = "proposed-slot-collision";
    }
  }
  return rows;
};
