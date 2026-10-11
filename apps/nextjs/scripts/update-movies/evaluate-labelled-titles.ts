import { createHash } from "node:crypto";
import { z } from "zod";

import {
  MOVIE_MATCHER_VERSION,
  TmdbMovieMatcher,
} from "@waslaeuftin/helpers/tmdb/TmdbMovieMatcher";

// Labels must be independently verified before running this command. Evaluate
// raw titles only: target-derived metadata is not observed provider evidence.
const [labelsPath, outputPath, ...extra] = process.argv.slice(2);
if (!labelsPath || !outputPath || extra.length) {
  throw new Error(
    "Usage: evaluate-labelled-titles.ts <labels.json> <report.json>",
  );
}
const input = await Bun.file(labelsPath).text();
const labels = z
  .object({
    cases: z
      .array(
        z.object({
          title: z.string(),
          expectedTmdbId: z.number().int().positive().nullable(),
          stratum: z.string(),
        }),
      )
      .min(1),
  })
  .parse(JSON.parse(input));
const matcher = new TmdbMovieMatcher();
const results = [];
for (const label of labels.cases) {
  const started = performance.now();
  try {
    const evaluation = await matcher.evaluate(label.title);
    const acceptedId = evaluation.acceptedCandidate?.tmdbMovieId ?? null;
    results.push({
      ...label,
      acceptedId,
      correct: acceptedId === label.expectedTmdbId,
      elapsedMs: performance.now() - started,
      evaluation,
    });
  } catch (error) {
    results.push({
      ...label,
      acceptedId: null,
      correct: false,
      elapsedMs: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
const accepted = results.filter((result) => result.acceptedId !== null);
const correctAccepted = accepted.filter((result) => result.correct).length;
const summary = {
  total: results.length,
  labelledPositive: labels.cases.filter(
    (label) => label.expectedTmdbId !== null,
  ).length,
  correctOutcomes: results.filter((result) => result.correct).length,
  accepted: accepted.length,
  correctAccepted,
  wrongAccepts: accepted.length - correctAccepted,
  abstentions: results.filter(
    (result) => !("error" in result) && result.acceptedId === null,
  ).length,
  errors: results.filter((result) => "error" in result).length,
  acceptedPrecision: accepted.length ? correctAccepted / accepted.length : null,
  acceptanceCoverage: accepted.length / results.length,
  elapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
};
await Bun.write(
  outputPath,
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      matcherVersion: MOVIE_MATCHER_VERSION,
      labelsSha256: createHash("sha256").update(input).digest("hex"),
      inputMode: "raw titles, no target-derived evidence",
      summary,
      results,
    },
    null,
    2,
  ),
);
console.info(JSON.stringify(summary, null, 2));
