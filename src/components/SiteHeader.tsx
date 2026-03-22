import { FavoriteButton } from "@waslaeuftin/components/FavoriteButton";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { Constants } from "@waslaeuftin/globals/Constants";
import { getDateString } from "@waslaeuftin/helpers/getDateString";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { cookies } from "next/headers";
import { Film } from "lucide-react";

const CityHeader = async ({
  date,
  pathname,
}: {
  date: string | null | undefined;
  pathname: string;
}) => {
  const awaitedCookies = await cookies();
  const favoriteCitiesSlugsSet = new Set(
    awaitedCookies.get("waslaeuftin-favorite-cities")?.value.split(",") ?? [],
  );

  const citySlug = pathname.split("/")[2] ?? "";

  const city = await api.cities.getCityBySlug(citySlug);

  if (!city) return <></>;

  return (
    <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full items-center gap-2 sm:w-auto sm:max-w-[60%]">
        <FavoriteButton
          city={city}
          isFavorite={favoriteCitiesSlugsSet.has(city.slug)}
        />
        <h1 className="text-base font-bold tracking-tight sm:text-xl">
          {Constants["whats-showing-in-date"].city(
            city.name,
            getDateString(date ?? new Date().toISOString()),
          )}
        </h1>
      </div>
      <UrlDatePicker citySlug={citySlug} />
    </div>
  );
};

const CinemaHeader = async ({
  date,
  pathname,
}: {
  date: string | null | undefined;
  pathname: string;
}) => {
  const cinemaSlug = pathname.split("/")[2] ?? "";

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug,
    date: date ? moment(date).toDate() : undefined,
  });

  if (!cinema) return <></>;

  return (
    <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="inline-flex w-full items-center gap-2 text-base font-bold tracking-tight sm:w-auto sm:max-w-[60%] sm:text-xl">
        <Film className="h-4 w-4 text-primary" />
        {Constants["whats-showing-in-date"].cinema(
          cinema.name,
          getDateString(date ?? new Date().toISOString()),
        )}
      </h1>
      <UrlDatePicker cinemaSlug={cinemaSlug} />
    </div>
  );
};

const FavoritesHeader = () => {
  return (
    <div className="flex w-full flex-row items-center gap-x-2">
      <h1 className="text-base font-bold tracking-tight sm:text-xl">
        {Constants["whats-showing-in-date"].favorites(
          getDateString(new Date().toISOString()),
        )}
      </h1>
    </div>
  );
};

export const SiteHeader = async ({
  date,
  pathname,
}: {
  pathname: string | null;
  date: string | null | undefined;
}) => {
  if (pathname === null) return <></>;

  if (pathname.includes("city")) {
    return <CityHeader pathname={pathname} date={date} />;
  }

  if (pathname.includes("cinema"))
    return <CinemaHeader pathname={pathname} date={date} />;

  if (pathname === "/") return <FavoritesHeader />;

  return <></>;
};
