import { expect, test } from "bun:test";

import type { ShowGroup } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/ShowGroup";
import { getKinoHeldBookingUrl } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/getKinoHeldBookingUrl";
import { getKinoHeldMovies } from "@waslaeuftin/cinema-providers/server";

const moviacKinoMetadata = {
  centerShorty: "moviac-kino-kaiserhof",
  centerId: "NDU2MzE4MA",
  createdAt: new Date(),
  updatedAt: new Date(),
  id: -2,
};

const expectKinoHeldBookingUrls = (
  showings: Awaited<ReturnType<typeof getKinoHeldMovies>>["showings"],
  expected: { citySlug: string; cinemaSlug: string },
) => {
  expect(showings.length).toBeGreaterThan(0);

  for (const showing of showings) {
    expect(showing.bookingUrl).toBeTruthy();
    expect(showing.bookingUrl).not.toContain("undefined");
    expect(showing.bookingUrl).not.toContain("null");

    const url = new URL(showing.bookingUrl);
    const showSlug = url.pathname.split("/").at(-1);

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("www.kinoheld.de");
    expect(
      url.pathname.startsWith(
        `/kino/${expected.citySlug}/${expected.cinemaSlug}/show/`,
      ),
    ).toBe(true);
    expect(url.searchParams.get("mode")).toBe("widget");
    expect(url.searchParams.get("showId")).toBe(showSlug);
    expect(url.searchParams.get("rb")).toBe("0");
    expect(url.searchParams.get("change")).toBe("0");
  }
};

test("kinoheld: builds widget booking URLs", () => {
  const movie = {
    cinema: {
      urlSlug: "moviac-kino-kaiserhof",
      city: {
        urlSlug: "baden-baden",
      },
    },
  } as ShowGroup;
  const showing = {
    urlSlug: "12708",
  } as ShowGroup["shows"]["data"][number];

  expect(getKinoHeldBookingUrl(movie, showing)).toBe(
    "https://www.kinoheld.de/kino/baden-baden/moviac-kino-kaiserhof/show/12708?mode=widget&showId=12708&rb=0&change=0",
  );
});

test(
  "kinoheld: Traumpalast Leonberg",
  async () => {
    const { movies, showings } = await getKinoHeldMovies(-1, {
      centerShorty: "traumpalast-leonberg",
      centerId: "MjI2MDM4MA",
      createdAt: new Date(),
      updatedAt: new Date(),
      id: -2,
    });

    console.info(
      `Got ${movies.length} movies with ${showings.length} showings for Traumpalast Leonberg`,
    );

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0);
  },
  { timeout: 20000 },
);

test(
  "kinoheld: moviac - Kino im Kaiserhof booking URLs",
  async () => {
    const { showings } = await getKinoHeldMovies(-1, moviacKinoMetadata);

    expectKinoHeldBookingUrls(showings, {
      citySlug: "baden-baden",
      cinemaSlug: "moviac-kino-kaiserhof",
    });
  },
  { timeout: 20000 },
);

test(
  "kinoheld: IMAX Traumpalast Leonberg",
  async () => {
    const { movies, showings } = await getKinoHeldMovies(-1, {
      centerShorty: "traumpalast-imax-leonberg",
      centerId: "Mzg0MDgyOA",
      createdAt: new Date(),
      updatedAt: new Date(),
      id: -2,
    });

    console.info(
      `Got ${movies.length} movies with ${showings.length} showings for IMAX Traumpalast Leonberg`,
    );

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0);
  },
  { timeout: 20000 },
);
