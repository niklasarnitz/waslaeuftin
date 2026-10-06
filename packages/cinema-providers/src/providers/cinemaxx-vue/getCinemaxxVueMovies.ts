import { load } from "cheerio";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import {
  describeFailedResponse,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

const ORIGIN = "https://www.cinemaxx.de";
const API = `${ORIGIN}/api/microservice`;

type Attribute = { name: string };
export interface CinemaxxVueFilm {
  filmTitle: string;
  filmUrl?: string;
  originalTitle?: string;
  filmAttributes: Attribute[];
  showingGroups: {
    sessions: {
      sessionId: string;
      showTimeWithTimeZone: string;
      bookingUrl: string;
      screenName: string;
      attributes: Attribute[];
    }[];
  }[];
}
export interface CinemaxxVueCinema {
  cinemaId: string;
  cinemaName: string;
  fullName: string;
}

type Request = typeof fetchTextWithBun;

const parseResult = <T>(body: string): T => {
  const data = JSON.parse(body) as { result: T | null; errorMessage?: string };
  if (data.result == null || data.errorMessage) {
    throw new Error(`CinemaxX/Vue: ${data.errorMessage || "missing result"}`);
  }
  return data.result;
};

// One guest session per update batch; no film-response cache survives a refresh.
export const createCinemaxxVueClient = (
  request: Request = fetchTextWithBun,
) => {
  let guestCookies: Promise<string> | undefined;
  const filmTitles = new Map<string, Promise<string>>();
  const recoverTitle = async (film: CinemaxxVueFilm) => {
    if (film.filmTitle.trim()) return;
    if (film.originalTitle?.trim()) {
      film.filmTitle = film.originalTitle.trim();
      return;
    }
    const url = new URL(film.filmUrl ?? "", ORIGIN);
    if (url.origin !== ORIGIN || !url.pathname.startsWith("/film/"))
      throw new Error("CinemaxX/Vue: missing title and film URL");
    let title = filmTitles.get(url.href);
    if (!title) {
      title = request(url.href, { Accept: "text/html" }).then((response) => {
        if (response.status !== 200)
          throw new Error(describeFailedResponse(response));
        const value = load(response.body)("title")
          .text()
          .replace(/\s*\|\s*CinemaxX\s*$/i, "")
          .trim();
        if (!value || value === "CinemaxX")
          throw new Error(`CinemaxX/Vue: missing title for ${url.pathname}`);
        return value;
      });
      filmTitles.set(url.href, title);
    }
    film.filmTitle = await title;
  };
  const authenticate = async () => {
    const response = await request(
      `${API}/auth/token`,
      { Accept: "application/json" },
      "POST",
    );
    if (response.status !== 200)
      throw new Error(describeFailedResponse(response));
    parseResult<unknown>(response.body);
    const cookies = response.cookies
      ?.map((cookie) => cookie.split(";")[0])
      .join("; ");
    if (!cookies)
      throw new Error("CinemaxX/Vue: guest authentication returned no cookies");
    return cookies;
  };
  const get = async <T>(path: string, authenticated: boolean): Promise<T> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (authenticated) {
        guestCookies ??= authenticate().catch((error: unknown) => {
          guestCookies = undefined;
          throw error;
        });
        headers.Cookie = await guestCookies;
      }
      const response = await request(`${API}${path}`, headers);
      if (response.status === 401 && authenticated && attempt === 0) {
        guestCookies = undefined;
        continue;
      }
      if (response.status !== 200)
        throw new Error(describeFailedResponse(response));
      return parseResult<T>(response.body);
    }
    throw new Error("CinemaxX/Vue: authentication failed");
  };
  return {
    async getCinemas() {
      const groups = await get<{ cinemas: CinemaxxVueCinema[] }[]>(
        "/showings/cinemas",
        false,
      );
      return groups.flatMap((group) => group.cinemas);
    },
    async getMovies(
      cinemaId: number,
      providerCinemaId: number,
    ): Promise<ProviderCatalog> {
      const films = await get<CinemaxxVueFilm[]>(
        `/showings/cinemas/${providerCinemaId}/films`,
        true,
      );
      await Promise.all(films.map(recoverTitle));
      return parseCinemaxxVueFilms(cinemaId, providerCinemaId, films);
    },
  };
};

export const parseCinemaxxVueFilms = (
  cinemaId: number,
  providerCinemaId: number,
  films: CinemaxxVueFilm[],
): ProviderCatalog => {
  const showings: ProviderCatalog["showings"] = [];
  const sessions = new Set<string>();
  for (const film of films) {
    if (!film.filmTitle.trim())
      throw new Error("CinemaxX/Vue: empty film title");
    for (const group of film.showingGroups) {
      for (const session of group.sessions) {
        if (sessions.has(session.sessionId)) continue;
        const dateTime = new Date(session.showTimeWithTimeZone);
        if (
          !/(?:Z|[+-]\d{2}:\d{2})$/.test(session.showTimeWithTimeZone) ||
          Number.isNaN(dateTime.getTime())
        ) {
          throw new Error(
            `CinemaxX/Vue: invalid zoned time for session ${session.sessionId}`,
          );
        }
        const bookingUrl = new URL(session.bookingUrl, ORIGIN);
        if (
          bookingUrl.origin !== ORIGIN ||
          !bookingUrl.pathname.startsWith(
            `/buchtickets/zusammenfassung/${providerCinemaId}/`,
          )
        ) {
          throw new Error(
            `CinemaxX/Vue: wrong cinema booking URL for session ${session.sessionId}`,
          );
        }
        sessions.add(session.sessionId);
        showings.push({
          cinemaId,
          movieName: film.filmTitle.trim(),
          dateTime,
          bookingUrl: bookingUrl.href,
          showingAdditionalData: [
            ...new Set(
              [
                session.screenName,
                ...session.attributes.map((attribute) => attribute.name),
                ...film.filmAttributes.map((attribute) => attribute.name),
              ]
                .map((value) => value.trim())
                .filter(Boolean),
            ),
          ],
        });
      }
    }
  }
  return {
    movies: [...new Set(showings.map((showing) => showing.movieName))].map(
      (name) => ({ cinemaId, name }),
    ),
    showings,
  };
};

export const getCinemaxxVueMovies = (
  cinemaId: number,
  providerCinemaId: number,
) => createCinemaxxVueClient().getMovies(cinemaId, providerCinemaId);
export const getCinemaxxVueCinemas = () =>
  createCinemaxxVueClient().getCinemas();
