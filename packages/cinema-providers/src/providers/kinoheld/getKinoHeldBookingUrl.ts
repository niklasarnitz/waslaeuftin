import { type ShowGroup } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/ShowGroup";

export const getKinoHeldBookingUrl = (
  movie: ShowGroup,
  showing: ShowGroup["shows"]["data"][number],
) => {
  // Ensure we have the necessary slugs to build the URL
  const citySlug = movie.cinema.city.urlSlug;
  const cinemaSlug = movie.cinema.urlSlug;
  const showSlug = showing?.urlSlug;

  return `https://www.kinoheld.de/kino/${citySlug}/${cinemaSlug}/vorstellung/${showSlug}`;
};
