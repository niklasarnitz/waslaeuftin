import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { CinemaFilterBar } from "@waslaeuftin/components/movie-listing/CinemaFilterBar";
import { MovieCard } from "@waslaeuftin/components/movie-listing/MovieCard";
import { groupMoviesByTitle } from "@waslaeuftin/core";
import {
  parseCalendarDate,
  scheduleCalendarDate,
  serializeCalendarDate,
} from "@waslaeuftin/helpers/calendarDate";
import { compactCityProgramme } from "@waslaeuftin/helpers/compactCityProgramme";

const options = Array.from({ length: 7 }, (_, index) => ({
  id: index,
  name: `Kino ${index}`,
  slug: `kino-${index}`,
}));

test("cinema filters initially show five plus any selected cinema", () => {
  const html = renderToStaticMarkup(
    <CinemaFilterBar
      options={options}
      selectedSlugs={["kino-6"]}
      onToggle={() => {}}
      onClear={() => {}}
    />,
  );
  expect(html).toContain("Alle Kinos anzeigen");
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain("Kino 6");
  expect(html).not.toContain("Kino 5");
  const small = renderToStaticMarkup(
    <CinemaFilterBar
      options={options.slice(0, 5)}
      selectedSlugs={[]}
      onToggle={() => {}}
      onClear={() => {}}
    />,
  );
  expect(small).not.toContain("Alle Kinos anzeigen");
  expect(small).toContain("Kino 4");
});

test("responsive movie cards render each ticket link only once", () => {
  const html = renderToStaticMarkup(
    <MovieCard
      movie={{
        name: "Film",
        coverUrl: null,
        showingsCount: 1,
        cinemas: [
          {
            cinema: options[0]!,
            showings: [
              {
                id: 1,
                dateTime: "2099-10-07T18:00:00Z",
                bookingUrl: "https://example.org/ticket",
              },
            ],
          },
        ],
      }}
    />,
  );
  expect(html.match(/aria-label="Tickets für/g)).toHaveLength(1);
});

test("compact programme preserves grouping and filters while dropping unused payload", () => {
  const cinema = {
    id: 1,
    name: "Kino",
    slug: "kino",
    movies: [
      {
        name: "Film",
        coverUrl: null,
        tmdbMetadata: {
          tmdbId: 1,
          popularity: 20,
          overview: "Story",
          cast: Array.from({ length: 20 }, (_, id) => ({
            id,
            name: `Actor ${id}`,
            profilePath: "unused",
          })),
          backdropPath: "unused",
        },
        showings: [
          {
            id: 1,
            dateTime: new Date("2099-10-07T18:00:00Z"),
            bookingUrl: "https://example.org",
            rawMovieName: "Film (OV)",
            showingAdditionalData: ["3D"],
            timeZone: "Europe/Berlin",
            cinemaId: 1,
            movieId: 2,
            createdAt: new Date(),
          },
        ],
      },
    ],
  };
  const city = {
    name: "Berlin",
    slug: "berlin",
    cinemas: [cinema],
  } as Parameters<typeof compactCityProgramme>[0];
  const compact = compactCityProgramme(city);
  const restored = compact.cinemas.map((entry) => ({
    ...entry,
    movies: entry.movies.map((movie) => ({
      ...movie,
      tmdbMetadata: compact.movieMetadata[movie.name],
    })),
  }));
  for (const filters of [
    { selectedTags: ["OV"] },
    { selectedTags: ["3D"], timeWindow: "18" as const },
    { selectedTags: ["IMAX"] },
  ]) {
    const project = (cinemas: Parameters<typeof groupMoviesByTitle>[0]) =>
      groupMoviesByTitle(cinemas, { filters }).map(
        ({ name, showingsCount, cinemas }) => ({
          name,
          showingsCount,
          showingIds: cinemas.flatMap((entry) =>
            entry.showings.map((showing) => showing.id),
          ),
        }),
      );
    expect(project(restored)).toEqual(project(city.cinemas));
  }
  expect(compact.movieMetadata.Film?.cast).toHaveLength(5);
  expect(compact.movieMetadata.Film).not.toHaveProperty("backdropPath");
  expect(compact.cinemas[0]?.movies[0]?.showings[0]).not.toHaveProperty(
    "createdAt",
  );
});

test("calendar URL dates round trip and follow Berlin around midnight", () => {
  expect(parseCalendarDate("2026-02-31")).toBeNull();
  expect(serializeCalendarDate(parseCalendarDate("2026-10-07")!)).toBe(
    "2026-10-07",
  );
  expect(
    serializeCalendarDate(
      scheduleCalendarDate(0, new Date("2026-10-07T22:30:00Z")),
    ),
  ).toBe("2026-10-08");
  expect(
    serializeCalendarDate(
      scheduleCalendarDate(1, new Date("2026-10-07T22:30:00Z")),
    ),
  ).toBe("2026-10-09");
});
