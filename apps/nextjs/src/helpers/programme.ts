import moment from "moment-timezone";

import type { Cinema } from "@waslaeuftin/db";
import { categorizeShowingTags, normalizeMovieTitle } from "@waslaeuftin/core";

const TIME_ZONE = "Europe/Berlin";
export const PROGRAMME_STALE_MS = 36 * 60 * 60 * 1000;

export function freshness(updated: Date | null, now = new Date()) {
  if (!updated || updated.getTime() > now.getTime()) return "unknown";
  return now.getTime() - updated.getTime() > PROGRAMME_STALE_MS
    ? "stale"
    : "current";
}

export function programmeTitle(place: string, date?: string, now = new Date()) {
  const selected = date
    ? moment.tz(date, TIME_ZONE)
    : moment(now).tz(TIME_ZONE);
  const label = selected.isSame(moment(now).tz(TIME_ZONE), "day")
    ? "heute"
    : `am ${selected.format("DD.MM.YYYY")}`;
  return `Kinoprogramm ${place} – Filme & Spielzeiten ${label} | wasläuft.in`;
}

export interface HighlightShowing {
  dateTime: Date;
  rawMovieName: string;
  showingAdditionalData: string[];
  movie: { name: string };
  cinema: { name: string; slug: string; country: string };
}

export function buildHighlights(
  showings: HighlightShowing[],
  now = new Date(),
) {
  const tomorrow = moment(now)
    .tz(TIME_ZONE)
    .add(1, "day")
    .startOf("day")
    .valueOf();
  const horizon = moment(now)
    .tz(TIME_ZONE)
    .add(8, "days")
    .startOf("day")
    .valueOf();
  const upcoming = showings
    .filter(
      (s) =>
        s.dateTime.getTime() >= now.getTime() && s.dateTime.getTime() < horizon,
    )
    .sort(
      (a, b) =>
        a.dateTime.getTime() - b.dateTime.getTime() ||
        a.movie.name.localeCompare(b.movie.name, "de") ||
        a.cinema.slug.localeCompare(b.cinema.slug),
    );
  const today = upcoming.filter((s) => s.dateTime.getTime() < tomorrow);
  const section = (items: HighlightShowing[]) => {
    const seen = new Set<string>();
    return {
      count: items.length,
      items: items
        .filter((s) => {
          const key = s.movie.name;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 4),
    };
  };
  return {
    evening: section(
      today.filter((s) => moment(s.dateTime).tz(TIME_ZONE).hour() >= 18),
    ),
    original: section(
      today.filter((s) => {
        const tags = categorizeShowingTags(
          normalizeMovieTitle(s.rawMovieName).tags,
          s.showingAdditionalData,
        ).prominentTags;
        return tags.some((t) => ["OV", "OmU", "OmeU", "OmEU"].includes(t));
      }),
    ),
    upcoming: section(upcoming.filter((s) => s.dateTime.getTime() >= tomorrow)),
  };
}

export function mapUrl(cinema: {
  name: string;
  city: { name: string };
  latitude: number | null;
  longitude: number | null;
}) {
  const destination =
    cinema.latitude !== null && cinema.longitude !== null
      ? `${cinema.latitude},${cinema.longitude}`
      : `${cinema.name}, ${cinema.city.name}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
}

export function ticketSource(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return null;
    return { url: parsed.href, name: parsed.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

export function programmeProviders(
  cinema: Pick<
    Cinema,
    | "cinemaxxVueCinemasMetadataId"
    | "cineStarCinemaId"
    | "cinfinityCinemaId"
    | "cineplexCinemaId"
    | "comtradaCineOrderMetadataId"
    | "kinoHeldCinemasMetadataId"
    | "isKinoTicketsExpress"
    | "premiumKinoSubdomain"
    | "cineplexxAtCinemaId"
  >,
) {
  return [
    cinema.cinemaxxVueCinemasMetadataId !== null ? "CinemaxX" : null,
    cinema.cineStarCinemaId !== null ? "CineStar" : null,
    cinema.cinfinityCinemaId !== null ? "cinfinity" : null,
    cinema.cineplexCinemaId !== null ? "Cineplex" : null,
    cinema.comtradaCineOrderMetadataId !== null ? "CineOrder" : null,
    cinema.kinoHeldCinemasMetadataId !== null ? "Kinoheld" : null,
    cinema.isKinoTicketsExpress ? "KinoTickets Express" : null,
    cinema.premiumKinoSubdomain !== null ? "Premiumkino" : null,
    cinema.cineplexxAtCinemaId !== null ? "Cineplexx" : null,
  ].filter((name): name is string => name !== null);
}
