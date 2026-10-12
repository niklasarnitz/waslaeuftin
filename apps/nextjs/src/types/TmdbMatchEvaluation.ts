import { z } from "zod";

const ScoredMatchSchema = z.object({
  tmdbMovieId: z.number().int().positive(),
  title: z.string(),
  originalTitle: z.string(),
  posterPath: z.string().nullable(),
  releaseDate: z.string().nullable(),
  popularity: z.number(),
  confidence: z.number().min(0).max(1),
  sourceQuery: z.string(),
});
export const TmdbMatchEvaluationSchema = z.object({
  requestedTitle: z.string(),
  normalizedTitle: z.string(),
  threshold: z.number(),
  bestCandidate: ScoredMatchSchema.nullable(),
  acceptedCandidate: ScoredMatchSchema.nullable(),
  decisionReason: z
    .enum([
      "matched",
      "ambiguous",
      "missing-poster",
      "insufficient-evidence",
      "identity-evidence-conflict",
      "conflicting-year",
      "programme",
      "unannounced-screening",
      "missing-production-context",
    ])
    .optional(),
  candidates: z.array(ScoredMatchSchema).optional(),
  rejectedCandidates: z
    .array(
      z.object({
        tmdbMovieId: z.number().int().positive(),
        titleConflict: z.boolean().optional(),
        directorConflict: z.boolean(),
        runtimeConflict: z.boolean(),
        observedDirectors: z.array(z.string()),
        observedRuntime: z.number().nullable(),
      }),
    )
    .optional(),
});

export type TmdbMatchEvaluation = z.infer<typeof TmdbMatchEvaluationSchema>;
