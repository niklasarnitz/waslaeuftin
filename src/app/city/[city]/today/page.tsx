import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { Cities } from "@waslaeuftin/helpers/cities";
import { type api } from "@waslaeuftin/trpc/server";
import { type CinemaSlugs } from "@waslaeuftin/types/CinemaSlugsSchema";

export default async function WhatsShowingInCity({
  params,
}: {
  params: { city?: string };
}) {
  const moviesObject = Cities[params.city ?? ""];

  if (!moviesObject || !params.city) {
    return <div>Not found</div>;
  }

  const movies = await moviesObject.fetchMoviesOfToday();

  const moviesByCinema = movies.reduce(
    (acc, movie) => {
      acc[movie.cinemaSlug as CinemaSlugs] =
        acc[movie.cinemaSlug as CinemaSlugs] ?? [];
      acc[movie.cinemaSlug as CinemaSlugs]?.push(movie);
      return acc;
    },
    {} as Record<CinemaSlugs, Awaited<ReturnType<typeof api.movies.getMovies>>>,
  );

  return (
    <MoviesByCinemaList
      moviesByCinema={moviesByCinema}
      showRemoveFilter
      city={params.city}
    />
  );
}
