import { type ShowGroup } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/ShowGroup";

export const getKinoHeldBookingUrl = (
  movie: ShowGroup,
  showing: ShowGroup["shows"]["data"][number],
) => {
  const citySlug = movie.cinema.city.urlSlug;
  const cinemaSlug = movie.cinema.urlSlug;
  const showSlug = showing?.urlSlug;
  const url = new URL(
    `/kino/${citySlug}/${cinemaSlug}/show/${showSlug}`,
    "https://www.kinoheld.de",
  );

  url.searchParams.set("mode", "widget");
  url.searchParams.set("showId", showSlug ?? "");
  url.searchParams.set("rb", "0");
  url.searchParams.set("change", "0");

  return url.toString();
};
