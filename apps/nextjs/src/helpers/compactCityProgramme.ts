import type { api } from "@waslaeuftin/trpc/server";
import {
  compactMovie,
  compactMovieMetadata,
} from "@waslaeuftin/helpers/compactMovieProgramme";

type City = NonNullable<
  Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>
>;
type Metadata = ReturnType<typeof compactMovieMetadata>;

// Send each film's metadata once, rather than once per cinema showing it.
export function compactCityProgramme(
  city: Pick<City, "name" | "slug"> & {
    cinemas: Pick<City["cinemas"][number], "id" | "name" | "slug" | "movies">[];
  },
) {
  const metadata = new Map<string, Metadata>();
  const cinemas = city.cinemas.map((cinema) => ({
    id: cinema.id,
    name: cinema.name,
    slug: cinema.slug,
    movies: cinema.movies.map((movie) => {
      if (!metadata.get(movie.name))
        metadata.set(movie.name, compactMovieMetadata(movie.tmdbMetadata));
      return compactMovie(movie);
    }),
  }));
  return {
    name: city.name,
    slug: city.slug,
    cinemas,
    movieMetadata: Object.fromEntries(metadata),
  };
}
