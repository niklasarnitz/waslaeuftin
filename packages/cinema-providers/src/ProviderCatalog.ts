import type { RawProviderMovie } from "@waslaeuftin/cinema-providers/internal/RawProviderMovie";
import type { RawProviderShowing } from "@waslaeuftin/cinema-providers/internal/RawProviderShowing";

export interface ProviderCatalog {
  /** Successfully fetched cinemas; stamp freshness only after persistence succeeds. */
  fetchedCinemaIds?: number[];
  movies: RawProviderMovie[];
  showings: RawProviderShowing[];
}
