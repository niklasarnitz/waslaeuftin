import { TmdbScoredMatch } from "@waslaeuftin/types/TmdbScoredMatch";

export type TmdbMatchEvaluation = {
  requestedTitle: string;
  normalizedTitle: string;
  threshold: number;
  bestCandidate: TmdbScoredMatch | null;
  acceptedCandidate: TmdbScoredMatch | null;
};
