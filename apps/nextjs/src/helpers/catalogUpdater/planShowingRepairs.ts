import type {
  ProviderCatalog,
  RawProviderShowing,
} from "@waslaeuftin/cinema-providers/server";
import type { Movie, Showing } from "@waslaeuftin/db";
import type { TmdbMatchEvaluation } from "@waslaeuftin/types/TmdbMatchEvaluation";
import type { MovieIdentityEvidence } from "@waslaeuftin/validators";
import { classifySneakTitle, extractYear } from "@waslaeuftin/core";
import { MovieIdentityEvidenceSchema } from "@waslaeuftin/validators";

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

export type ShowingRepairRequest = {
  showingId: number;
  sourceMovieId: number;
  targetTmdbId: number;
  updatedAt: Date;
};

// This path only proposes null-to-TMDB corrections. It has no persistence API.
// Callers must supply freshly fetched catalogs, never stored fallback evidence.
export const planBoundShowingRepairs = async ({
  requests,
  showings,
  movies,
  catalogs,
  occupiedSlots,
  capturedAt,
  evaluate,
}: {
  requests: ShowingRepairRequest[];
  showings: (ShowingReviewInput &
    Pick<
      Showing,
      | "bookingUrl"
      | "providerSessionId"
      | "updatedAt"
      | "isListed"
      | "showingAdditionalData"
    >)[];
  movies: Pick<Movie, "id" | "tmdbMovieId" | "coverUrl">[];
  catalogs: ProviderCatalog[];
  occupiedSlots: Pick<Showing, "cinemaId" | "movieId" | "dateTime">[];
  capturedAt: Date;
  evaluate: (
    title: string,
    evidence: MovieIdentityEvidence,
  ) => Promise<TmdbMatchEvaluation>;
}) => {
  if (new Set(requests.map((row) => row.showingId)).size !== requests.length)
    throw new Error("Duplicate repair showing IDs");
  const bound: {
    request: ShowingRepairRequest;
    before: (typeof showings)[number] | null;
    source: RawProviderShowing | null;
    evaluation: TmdbMatchEvaluation | null;
    error: string | null;
  }[] = [];
  const inputs: ShowingReviewInput[] = [];
  const decisions = new Map<number, ShowingReviewDecision>();
  for (const request of requests) {
    const before = showings.find((row) => row.id === request.showingId) ?? null;
    const candidates = before?.bookingUrl
      ? catalogs
          .flatMap((catalog) => catalog.showings)
          .filter(
            (row) =>
              row.cinemaId === before.cinemaId &&
              row.dateTime.getTime() === before.dateTime.getTime() &&
              row.bookingUrl === before.bookingUrl,
          )
      : [];
    const source = candidates.length === 1 ? candidates[0]! : null;
    const storedMovie = movies.find((row) => row.id === before?.movieId);
    let error: string | null = null;
    let evaluation: TmdbMatchEvaluation | null = null;
    if (!before) error = "showing-not-found";
    else if (
      before.movieId !== request.sourceMovieId ||
      before.updatedAt.getTime() !== request.updatedAt.getTime()
    )
      error = "stored-state-changed";
    else if (!before.isListed || before.dateTime <= capturedAt)
      error = "showing-not-current";
    else if (!storedMovie || storedMovie.tmdbMovieId !== null)
      error = "source-not-unmatched";
    else if (!source) error = "source-booking-not-unique";
    else if (
      source.provider !== "KinoTicketsExpress" ||
      (before.sourceProvider != null &&
        before.sourceProvider !== source.provider) ||
      !source.providerFilmId ||
      (before.providerFilmId != null &&
        before.providerFilmId !== source.providerFilmId) ||
      (before.providerSessionId &&
        before.providerSessionId !== source.providerSessionId) ||
      source.movieName !== before.rawMovieName
    )
      error = "source-identity-conflict";
    if (!error && source && before) {
      try {
        const evidence = MovieIdentityEvidenceSchema.parse(
          source.evidence ?? {},
        );
        if (!Object.keys(evidence).length) {
          error = "missing-fresh-evidence";
        } else {
          evaluation = await evaluate(before.rawMovieName, evidence);
          const candidate = evaluation.acceptedCandidate;
          if (evaluation.requestedTitle !== before.rawMovieName)
            error = "source-title-conflict";
          else if (!candidate || evaluation.decisionReason !== "matched")
            error = evaluation.decisionReason ?? "insufficient-evidence";
          else if (candidate.tmdbMovieId !== request.targetTmdbId)
            error = "expected-target-conflict";
          else if (
            !candidate.posterPath ||
            !movies.find((row) => row.tmdbMovieId === request.targetTmdbId)
              ?.coverUrl
          )
            error = "target-cover-missing";
          else {
            inputs.push({
              ...before,
              sourceProvider: source.provider,
              providerFilmId: source.providerFilmId,
              evidence,
            });
            decisions.set(before.id, { evaluation });
          }
        }
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
      }
    }
    bound.push({ request, before, source, evaluation, error });
  }
  const proposals = planShowingRepairs(
    inputs,
    movies,
    decisions,
    occupiedSlots,
  );
  return bound.map((row) => {
    const proposal = proposals.find(
      (item) => item.showingId === row.request.showingId,
    );
    return {
      ...row,
      status: proposal?.status ?? "held",
      reason: row.error ?? proposal?.reason ?? "insufficient-evidence",
      proposedTmdbId: row.evaluation?.acceptedCandidate?.tmdbMovieId ?? null,
      targetMovieId: proposal?.targetMovieId ?? null,
    };
  });
};
