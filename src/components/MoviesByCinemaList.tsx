import {
  type CinemaSlugs,
  Cinemas,
  type Movie,
} from "@waslaeuftin/types/Movie";
import moment from "moment";
import Link from "next/link";

export const MoviesByCinemaList = ({
  moviesByCinema,
}: {
  moviesByCinema: Record<CinemaSlugs, Movie[]>;
}) => {
  return Object.keys(moviesByCinema).map((cinemaSlug) => {
    const moviesInCinema = moviesByCinema[cinemaSlug as CinemaSlugs];
    const cinema = Cinemas[cinemaSlug as CinemaSlugs];

    if (!cinema) {
      return null;
    }

    return (
      <div key={cinema.slug} className="space-y-4 p-4">
        <h1 className="text-2xl font-bold">{cinema.name}</h1>
        {moviesInCinema.map((movie) => (
          <div key={movie.name}>
            <h2 className="text-lg font-semibold">{movie.name}</h2>
            <div className="grid grid-cols-6 gap-4">
              {movie.showings.map((showing) => {
                return (
                  <Link
                    href={showing.bookingUrl ?? "#"}
                    key={`${cinema.slug}-${showing.dateTime.toISOString()}-${movie.name}`}
                    className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md hover:border-gray-300"
                  >
                    {moment(showing.dateTime).format("DD.MM.YYYY - HH:mm")}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  });
};
