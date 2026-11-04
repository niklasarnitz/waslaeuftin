import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { CinemaFilterBar } from "@waslaeuftin/components/movie-listing/CinemaFilterBar";
import { MovieCard } from "@waslaeuftin/components/movie-listing/MovieCard";
import { DatePicker } from "@waslaeuftin/components/ui/date-picker";
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

test("compact date controls label today and tomorrow, while the full picker keeps the year", () => {
  for (const [offset, label] of [
    [0, "Heute"],
    [1, "Morgen"],
  ] as const) {
    const html = renderToStaticMarkup(
      <DatePicker
        compact
        value={scheduleCalendarDate(offset)}
        onChange={() => {}}
      />,
    );
    expect(html).toContain(`aria-label="Datum wählen: ${label}"`);
  }
  const customDate = parseCalendarDate("2099-10-07")!;
  const compact = renderToStaticMarkup(
    <DatePicker compact value={customDate} onChange={() => {}} />,
  );
  expect(compact).toContain('aria-label="Datum wählen: 07.10."');
  const full = renderToStaticMarkup(
    <DatePicker value={customDate} onChange={() => {}} />,
  );
  expect(full).toContain("07.10.2099");
});

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

test("responsive movie cards keep tickets before optional details without duplicate links", () => {
  const html = renderToStaticMarkup(
    <MovieCard
      movie={{
        name: "Film",
        coverUrl: null,
        showingsCount: 1,
        tmdbMetadata: {
          overview: "Die Geschichte des Films.",
          directors: [{ id: 2, name: "Regisseurin" }],
        },
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
  expect(html).toContain('aria-expanded="false"');
  expect(html.indexOf('aria-label="Tickets für')).toBeLessThan(
    html.indexOf("Regie:"),
  );
  expect(html).toContain("Die Geschichte des Films.");
  expect(html.match(/<h4\b/g)).toHaveLength(1);

  const withoutDetails = renderToStaticMarkup(
    <MovieCard
      movie={{ name: "Film", coverUrl: null, showingsCount: 0, cinemas: [] }}
    />,
  );
  expect(withoutDetails).not.toContain("aria-expanded=");
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
