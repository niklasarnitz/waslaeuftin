import moment from "moment-timezone";

import type { BoxofficeSiteData } from "@waslaeuftin/cinema-providers/internal/providers/boxoffice/getBoxofficeSiteData";
import type {
  BoxofficeScheduleResponse,
  BoxofficeShowtime,
} from "@waslaeuftin/cinema-providers/internal/providers/boxoffice/types/BoxofficeTypes";
import type { RawProviderMovie } from "@waslaeuftin/cinema-providers/internal/RawProviderMovie";
import type { RawProviderShowing } from "@waslaeuftin/cinema-providers/internal/RawProviderShowing";
import { loadBoxofficeMovieTitles } from "@waslaeuftin/cinema-providers/internal/providers/boxoffice/getBoxofficeSiteData";
import { getBoxofficeJson } from "@waslaeuftin/cinema-providers/internal/providers/boxoffice/getBoxofficeText";

const SCHEDULE_DATE_FORMAT = "YYYY-MM-DDTHH:mm:ss";

// Friendlier labels than the sites' badges ("REALD-3D", "ST", "AFS", ...).
// Other tags use the site's label.
const TAG_LABELS: Record<string, string> = {
  "Format.Projection.3d": "3D",
  "Auditorium.Experience.ScreenX": "ScreenX",
  "Auditorium.Experience.SuperScreen": "Superscreen",
  "Auditorium.Experience.InfinityVision": "Infinity Vision",
  "Auditorium.Comfort.Recliners": "Recliner",
  "Showtime.Accessibility.Subtitled": "Subtitled",
  "Showtime.Accessibility.AudioDescription": "Audio Description",
  "Showtime.Accessibility.AutismFriendly": "Autism Friendly",
  "Showtime.Accessibility.ClosedCaption": "Closed Captions",
};

const DIGITAL_TAG = "Format.Projection.Digital";
const THREE_D_TAG = "Format.Projection.3d";

const getShowingAdditionalData = (
  siteData: BoxofficeSiteData,
  theaterId: string,
  showtime: BoxofficeShowtime,
) => {
  const tags = showtime.tags ?? [];
  const labels: string[] = [];

  for (const tag of tags) {
    // Some showtimes are tagged both 2D and 3D.
    if (tag === DIGITAL_TAG && tags.includes(THREE_D_TAG)) continue;

    // Tags without an attribute (e.g. "Showtime.Event.BigScreenClassics")
    // aren't shown on the site either.
    const siteLabel =
      siteData.attributeLabels.get(`${theaterId}_${tag}`) ??
      siteData.attributeLabels.get(tag);
    if (!siteLabel) continue;

    labels.push(TAG_LABELS[tag] ?? siteLabel);
  }

  const screenName = showtime.screen?.name?.trim();
  if (screenName) {
    labels.push(/^\d+$/.test(screenName) ? `Screen ${screenName}` : screenName);
  }

  return Array.from(new Set(labels));
};

const getBookingUrl = (showtime: BoxofficeShowtime) => {
  const ticketing = showtime.data?.ticketing ?? [];
  // "default" is the chain's own checkout; "relay" goes through a tracker.
  const preferred =
    ticketing.find((t) => t.provider === "default") ?? ticketing[0];
  return preferred?.urls?.[0] ?? null;
};

/**
 * Fetches the schedule of one theater of a Boxoffice chain.
 *
 * @param cinemaId our cinema ID
 * @param theaterId the Boxoffice theater ID, e.g. "X06V1"
 * @param siteData chain-wide data from `getBoxofficeSiteData`, shared by all
 *   theaters of the chain in a run
 */
export const getBoxofficeMovies = async (
  cinemaId: number,
  theaterId: string,
  siteData: BoxofficeSiteData,
) => {
  const { chain } = siteData;
  const today = moment.tz(chain.timeZone).startOf("day");

  const params = new URLSearchParams({
    theaters: JSON.stringify({ id: theaterId, timeZone: chain.timeZone }),
    from: today.format(SCHEDULE_DATE_FORMAT),
    to: today.clone().add(1, "year").endOf("day").format(SCHEDULE_DATE_FORMAT),
  });

  const response = await getBoxofficeJson<BoxofficeScheduleResponse>(
    `${chain.domain}/api/gatsby-source-boxofficeapi/schedule?${params.toString()}`,
  );

  const schedule = response[theaterId]?.schedule;
  if (!schedule) {
    throw new Error(
      `No ${chain.name} schedule for theater ${theaterId} in the response`,
    );
  }

  // Movies added after the site was built aren't in the build's movie list.
  const missingMovieIds = Object.keys(schedule).filter(
    (movieId) => !siteData.movieTitles.has(movieId),
  );
  if (missingMovieIds.length > 0) {
    await loadBoxofficeMovieTitles(siteData, missingMovieIds);
  }

  const movies: RawProviderMovie[] = [];
  const showings: RawProviderShowing[] = [];

  for (const [movieId, days] of Object.entries(schedule)) {
    const movieName = siteData.movieTitles.get(movieId);
    if (!movieName) {
      console.warn(
        `[Boxoffice] Skipping ${chain.name} movie ${movieId} at ${theaterId}: no title`,
      );
      continue;
    }

    movies.push({ cinemaId, name: movieName });

    const seen = new Set<string>();

    for (const showtime of Object.values(days).flat()) {
      if (showtime.isExpired) continue;

      const bookingUrl = getBookingUrl(showtime);
      // The API occasionally returns the same showtime twice.
      const key = `${showtime.startsAt}|${bookingUrl}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // startsAt is theater-local time without an offset.
      const dateTime = moment.tz(
        showtime.startsAt,
        SCHEDULE_DATE_FORMAT,
        true,
        chain.timeZone,
      );
      if (!dateTime.isValid()) continue;

      showings.push({
        cinemaId,
        movieName,
        dateTime: dateTime.toDate(),
        bookingUrl,
        showingAdditionalData: getShowingAdditionalData(
          siteData,
          theaterId,
          showtime,
        ),
      });
    }
  }

  return { movies, showings };
};
