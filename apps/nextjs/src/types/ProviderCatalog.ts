import { RawProviderMovie } from "./RawProviderMovie";
import { RawProviderShowing } from "./RawProviderShowing";

export type ProviderCatalog = {
    movies: RawProviderMovie[];
    showings: RawProviderShowing[];
};
