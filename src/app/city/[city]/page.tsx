import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { Cities } from "@waslaeuftin/helpers/cities";
import { type CinemaSlugs, type Movie } from "@waslaeuftin/types/Movie";

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
      acc[movie.cinema.slug] = acc[movie.cinema.slug] ?? [];
      acc[movie.cinema.slug]?.push(movie);
      return acc;
    },
    {} as Record<CinemaSlugs, Movie[]>,
  );

  return (
    <MoviesByCinemaList
      moviesByCinema={moviesByCinema}
      showFilterByToday
      city={params.city}
    />
  );
}
