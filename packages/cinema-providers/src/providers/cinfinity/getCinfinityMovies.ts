import moment from "moment-timezone";

import { queryCinfinity } from "@waslaeuftin/cinema-providers/internal/providers/cinfinity/getCinfinityCinemas";

type CinfinityScreening = {
  datetime: string | null;
  onlineTicketingId: string | null;
  isInfoOnly: boolean | null;
  auditoriumName: string | null;
  movie: {
    id?: string | null;
    title: string | null;
    duration?: number | null;
    credits?:
      | ({
          department?: string | null;
          role?: string | null;
          person?: { fullName?: string | null } | null;
        } | null)[]
      | null;
  } | null;
  cinema: {
    id: string;
    onlineTicketingBaseUrl: string | null;
    onlineReservationBaseUrl: string | null;
    website: string | null;
  } | null;
  attributes: {
    label: string | null;
  }[];
};

const CINFINITY_SCREENINGS_QUERY = `
    query CinfinityScreenings($cinemaIds: [ID!], $after: DateTime, $before: DateTime) {
        screenings(cinemaIds: $cinemaIds, after: $after, before: $before) {
            datetime
            onlineTicketingId
            isInfoOnly
            auditoriumName
            movie {
                id
                title
                duration
                credits(departments: [DIRECTING]) {
                    department
                    role
                    person {
                        fullName
                    }
                }
            }
            cinema {
                id
                onlineTicketingBaseUrl
                onlineReservationBaseUrl
                website
            }
            attributes {
                label
            }
        }
    }
`;

const getBookingUrl = (screening: CinfinityScreening) => {
  const onlineTicketingId = screening.onlineTicketingId?.trim();
  if (!onlineTicketingId) return null;

  const baseUrl =
    screening.cinema?.onlineTicketingBaseUrl ??
    screening.cinema?.onlineReservationBaseUrl ??
    screening.cinema?.website;

  if (!baseUrl) return null;

  try {
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL(onlineTicketingId, normalizedBaseUrl).toString();
  } catch {
    return null;
  }
};

export const getCinfinityMovies = async (
  cinemas: {
    cinemaId: number;
    cinfinityCinemaId: string;
  }[],
) => {
  const data = await queryCinfinity<{ screenings: CinfinityScreening[] }>(
    CINFINITY_SCREENINGS_QUERY,
    {
      cinemaIds: cinemas.map((cinema) => cinema.cinfinityCinemaId),
      after: moment().subtract(1, "day").toISOString(),
      before: moment().add(14, "days").toISOString(),
    },
  );

  const cinemasByCinfinityCinemaId: Record<string, (typeof cinemas)[number]> =
    {};
  for (const cinema of cinemas) {
    cinemasByCinfinityCinemaId[cinema.cinfinityCinemaId] = cinema;
  }

  const showings = data.screenings
    .map((screening) => {
      const cinema = screening.cinema
        ? cinemasByCinfinityCinemaId[screening.cinema.id]
        : undefined;
      const movieName = screening.movie?.title;

      if (
        !cinema ||
        !movieName?.trim() ||
        !screening.datetime ||
        screening.isInfoOnly === true
      ) {
        return null;
      }

      const movie = screening.movie;
      const director = (Array.isArray(movie?.credits) ? movie.credits : [])
        .filter(
          (credit) =>
            credit?.department === "DIRECTING" &&
            typeof credit.role === "string" &&
            /^(?:Regie|Director)$/i.test(credit.role.trim()),
        )
        .map((credit) => credit?.person?.fullName)
        .filter(
          (name): name is string => typeof name === "string" && !!name.trim(),
        )
        .map((name) => name.trim())
        .join(", ");
      const evidence = {
        ...(director ? { director } : {}),
        ...(typeof movie?.duration === "number" &&
        Number.isSafeInteger(movie.duration) &&
        movie.duration > 0
          ? { runtimeMinutes: movie.duration }
          : {}),
      };
      return {
        cinemaId: cinema.cinemaId,
        movieName,
        provider: "Cinfinity",
        providerFilmId:
          typeof movie?.id === "string" && movie.id.trim()
            ? movie.id
            : undefined,
        ...(Object.keys(evidence).length ? { evidence } : {}),
        dateTime: moment(screening.datetime).toDate(),
        bookingUrl: getBookingUrl(screening),
        showingAdditionalData: [
          screening.auditoriumName,
          ...screening.attributes.map((attribute) => attribute.label),
        ].filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        ),
      };
    })
    .filter(
      (showing): showing is NonNullable<typeof showing> => showing !== null,
    );

  const movies = showings.map((showing) => ({
    name: showing.movieName,
    cinemaId: showing.cinemaId,
    provider: showing.provider,
    providerFilmId: showing.providerFilmId,
    ...(showing.evidence ? { evidence: showing.evidence } : {}),
  }));

  return { provider: "Cinfinity", movies, showings };
};
