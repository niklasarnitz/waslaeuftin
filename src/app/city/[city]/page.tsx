import { Cities } from "@waslaeuftin/helpers/cities";
import {
  type CinemaSlugs,
  Cinemas,
  type Movie,
} from "@waslaeuftin/types/Movie";

export default async function WhatsShowingInCity({
  params,
}: {
  params: { city?: string };
}) {
  const moviesObject = Cities[params.city ?? ""];

  if (!moviesObject) {
    return <div>Not found</div>;
  }

  const movies = await moviesObject.fetchMoviesOfToday();

  const moviesByCinema = movies.reduce(
    (acc, movie) => {
      acc[movie.cinema.slug] = acc[movie.cinema.slug] ?? [];
      acc[movie.cinema.slug]?.push(movie);
      return acc;
    },
    {} as Record<CinemaSlugs, Movie[]>,
  );

  return (
    <>
      {Object.keys(moviesByCinema).map((cinemaSlug) => {
        const moviesInCinema = moviesByCinema[cinemaSlug as CinemaSlugs];
        const cinema = Cinemas[cinemaSlug as CinemaSlugs];

        if (!cinema) {
          return null;
        }

        return (
          <div key={cinema.slug}>
            <h1 className="text-xl">{cinema.name}</h1>
            {moviesInCinema.map((movie) => (
              <div key={movie.name}>
                <h2>{movie.name}</h2>
                {movie.showings.map((showing) => {
                  return (
                    <div key={showing.dateTime.toISOString()}>
                      {showing.dateTime.toLocaleDateString()}
                      {showing.bookingUrl && (
                        <a href={showing.bookingUrl}>Book</a>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
