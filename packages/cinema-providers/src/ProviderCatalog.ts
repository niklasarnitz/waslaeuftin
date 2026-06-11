import type { RawProviderMovie } from "@waslaeuftin/cinema-providers/internal/RawProviderMovie";
import type { RawProviderShowing } from "@waslaeuftin/cinema-providers/internal/RawProviderShowing";

export interface ProviderCatalog {
  movies: RawProviderMovie[];
  showings: RawProviderShowing[];
}
