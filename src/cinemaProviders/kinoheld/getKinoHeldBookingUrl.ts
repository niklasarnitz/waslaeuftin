import { type KinoHeldCinemasMetadata } from "@prisma/client";
import { type ShowGroup } from "./ShowGroup";

export const getKinoHeldBookingUrl = (
  metadata: KinoHeldCinemasMetadata,
  movie: ShowGroup,
  showing: ShowGroup["shows"]["data"][number],
) => {
  switch (metadata.centerShorty) {
    case "traumpalast-leonberg":
      return `https://tickets.traumpalast.de/kino/${movie.cinema.city.urlSlug}/${metadata.centerShorty}/vorstellung/${showing?.urlSlug ?? ""}`;
    case "merkur-filmcenter-gaggenau":
    case "moviac-baden-baden":
      return `https://www.kinoheld.de/kino/${movie.cinema.city.urlSlug}/${metadata.centerShorty}/vorstellung/${showing?.urlSlug ?? ""}`;
    case "cineplex-baden_baden":
    case "cineplex-bruchsal":
    case "luxor-walldorf":
      return showing?.deeplink ?? undefined;
    default:
      return undefined;
  }
};
