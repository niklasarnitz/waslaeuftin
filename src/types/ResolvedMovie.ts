
export type ResolvedMovie = {
    canonicalKey: string;
    name: string;
    normalizedTitle: string;
    tmdbMovieId: number | null;
    coverUrl: string | null;
    coverStorageKey: string | null;
    coverConfidence: number | null;
};
