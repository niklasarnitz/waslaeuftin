import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";

const getDateString = (date?: string) => {
  if (!date) {
    return "in nächster Zeit";
  }

  const now = moment();
  const dateMoment = moment(date);

  if (now.isSame(dateMoment, "day")) {
    return "heute";
  }

  if (now.clone().add(1, "days").isSame(dateMoment, "day")) {
    return "morgen";
  }

  return `am ${dateMoment.format("DD.MM.YYYY")}`;
};

export default async function MoviesInCity({
  params: { citySlug },
  searchParams: { date },
}: {
  params: { citySlug?: string };
  searchParams: { date?: string };
}) {
  if (!citySlug) {
    return <div>Not found</div>;
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: citySlug,
    date: date ? moment(date).toDate() : undefined,
  });

  if (!city) {
    return <div>Not found</div>;
  }

  return (
    <>
      <div className="flex flex-row items-center justify-between gap-x-2 px-4 pt-4">
        <h1 className="flex flex-1 text-2xl font-bold">
          Diese Filme laufen {getDateString(date)} in {city.name}
        </h1>
        <UrlDatePicker />
      </div>
      <MoviesByCinemaList city={city} />
    </>
  );
}
