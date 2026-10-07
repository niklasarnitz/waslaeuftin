import type { TmdbMetadata } from "@waslaeuftin/core";
import type { api } from "@waslaeuftin/trpc/server";

type Cinema = NonNullable<
  Awaited<ReturnType<typeof api.cinemas.getCinemaBySlug>>
>;
type Movie = Cinema["movies"][number];

function compactPeople(value: unknown) {
  if (!Array.isArray(value)) return null;
  return value.flatMap((person: unknown) => {
    if (
      !person ||
      typeof person !== "object" ||
      !("id" in person) ||
      !("name" in person) ||
      typeof person.id !== "number" ||
      typeof person.name !== "string"
    )
      return [];
    return [
      {
        id: person.id,
        name: person.name,
        ...("character" in person && typeof person.character === "string"
          ? { character: person.character }
          : {}),
      },
    ];
  });
}

// Only fields actually used by cards, sorting and filters cross the RSC boundary.
export function compactMovieMetadata(
  metadata: Movie["tmdbMetadata"],
): TmdbMetadata | null {
  if (!metadata) return null;
  return {
    tmdbId: metadata.tmdbId,
    overview: metadata.overview,
    runtime: metadata.runtime,
    popularity: metadata.popularity,
    voteAverage: metadata.voteAverage,
    certification: metadata.certification,
    trailerUrl: metadata.trailerUrl,
    directors: compactPeople(metadata.directors),
    cast: compactPeople(metadata.cast)?.slice(0, 5),
    productionCompanies: compactPeople(metadata.productionCompanies),
  };
}

export function compactMovie(movie: Movie) {
  return {
    name: movie.name,
    coverUrl: movie.coverUrl,
    showings: movie.showings.map((showing) => ({
      id: showing.id,
      dateTime: showing.dateTime,
      bookingUrl: showing.bookingUrl,
      rawMovieName: showing.rawMovieName,
      showingAdditionalData: showing.showingAdditionalData,
      timeZone: showing.timeZone,
    })),
  };
}

export function compactCinemaProgramme(cinema: Cinema) {
  return {
    id: cinema.id,
    slug: cinema.slug,
    name: cinema.name,
    city: { name: cinema.city.name, slug: cinema.city.slug },
    movies: cinema.movies.map((movie) => ({
      ...compactMovie(movie),
      tmdbMetadata: compactMovieMetadata(movie.tmdbMetadata),
    })),
  };
}
