import type { RawProviderMovie } from "@waslaeuftin/cinema-providers/internal/RawProviderMovie";
import type { RawProviderShowing } from "@waslaeuftin/cinema-providers/internal/RawProviderShowing";

export interface ProviderCatalog {
  provider?: string;
  /** Successfully fetched cinemas; stamp freshness only after persistence succeeds. */
  fetchedCinemaIds?: number[];
  /** Source configuration observed at fetch time, checked before a native refresh. */
  cinemaSourceKeys?: Record<number, string>;
  movies: RawProviderMovie[];
  showings: RawProviderShowing[];
}
