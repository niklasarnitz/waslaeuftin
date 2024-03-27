import { Cities } from "@waslaeuftin/helpers/cities";
import { type api } from "@waslaeuftin/trpc/server";
import { type CinemaSlugs, Cinemas } from "@waslaeuftin/types/Movie";
import moment from "moment";
import Link from "next/link";

export const MoviesByCinemaList = ({
  moviesByCinema,
  showFilterByToday,
  showRemoveFilter,
  city,
}: {
  moviesByCinema: Record<
    CinemaSlugs,
    Awaited<ReturnType<typeof api.movies.getMovies>>
  >;
  showFilterByToday?: boolean;
  showRemoveFilter?: boolean;
  city: string;
}) => {
  const cityObject = Cities[city ?? ""];

  return (
    <>
      <div className="flex flex-row items-center justify-between gap-x-2 px-4 pt-4">
        <h1 className="flex flex-1 text-2xl font-bold">
          Diese Filme laufen {showRemoveFilter ? "heute" : "nächster Zeit"} in{" "}
          {cityObject?.name}
        </h1>
        {showFilterByToday && (
          <div>
            <Link
              href={`/city/${city}/today`}
              className="rounded-lg border px-4 py-2 underline shadow-sm"
            >
              Heute
            </Link>
          </div>
        )}
        {showRemoveFilter && (
          <div>
            <Link
              href={`/city/${city}`}
              className="rounded-lg border px-4 py-2 underline shadow-sm"
            >
              X Heute
            </Link>
          </div>
        )}
      </div>
      {Object.keys(moviesByCinema).map((cinemaSlug) => {
        const moviesInCinema = (
          moviesByCinema[cinemaSlug as CinemaSlugs] ?? []
        ).sort((a, b) => a.name.localeCompare(b.name));
        const cinema = Cinemas[cinemaSlug as CinemaSlugs];

        if (!cinema) {
          return null;
        }

        return (
          <div key={cinema.slug} className="p-4">
            <h1 className="text-xl font-bold">{cinema.name}</h1>
            <div className="flex flex-col gap-y-4">
              {moviesInCinema.map((movie) => (
                <div key={movie.name}>
                  <h2 className="text-lg font-semibold">{movie.name}</h2>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                    {movie.showings.map((showing) => {
                      return (
                        <Link
                          href={showing.bookingUrl ?? "#"}
                          key={`${cinema.slug}-${showing.dateTime.toISOString()}-${movie.name}`}
                          className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md hover:border-gray-300"
                        >
                          {moment(showing.dateTime).format(
                            "DD.MM.YYYY - HH:mm",
                          )}
                          {showing.showingAdditionalData && (
                            <div className="text-xs text-gray-500">
                              {showing.showingAdditionalData}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
};
