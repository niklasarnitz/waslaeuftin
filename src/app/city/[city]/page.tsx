import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { Cities } from "@waslaeuftin/helpers/cities";
import { type api } from "@waslaeuftin/trpc/server";
import { type CinemaSlugs } from "@waslaeuftin/types/Movie";

export default async function MoviesInCity({
  params,
}: {
  params: { city?: string };
}) {
  const moviesObject = Cities[params.city ?? ""];

  if (!moviesObject || !params.city) {
    return <div>Not found</div>;
  }

  const movies = await moviesObject.fetchMovies();

  const moviesByCinema = movies.reduce(
    (acc, movie) => {
      acc[movie.cinemaSlug] = acc[movie.cinemaSlug] ?? [];
      acc[movie.cinemaSlug]?.push(movie);
      return acc;
    },
    {} as Record<CinemaSlugs, Awaited<ReturnType<typeof api.movies.getMovies>>>,
  );

  return (
    <MoviesByCinemaList
      moviesByCinema={moviesByCinema}
      showFilterByToday
      city={params.city}
    />
  );
}
