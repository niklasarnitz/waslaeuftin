// Programme-only dry run by default. --apply registers cinemas, never switches
// an existing cinema's provider and never starts an importer or deployment.
import type { Cinema, Prisma } from "@waslaeuftin/db";
import {
  getDieselKinoMovies,
  getMegaplexMovies,
  getStarMovieMovies,
} from "@waslaeuftin/cinema-providers/server";

const providers = {
  DieselKino: {
    field: "dieselKinoSlug",
    fetch: getDieselKinoMovies,
    locations: [
      ["braunau", "Dieselkino Braunau", "Braunau am Inn"],
      ["bruck", "Dieselkino Bruck", "Bruck an der Großglocknerstraße"],
      ["fohnsdorf", "Dieselkino Fohnsdorf", "Fohnsdorf"],
      ["gleisdorf", "Dieselkino Gleisdorf", "Gleisdorf"],
      ["kapfenberg", "Dieselkino Kapfenberg", "Kapfenberg"],
      ["leibnitz", "Dieselkino Leibnitz", "Leibnitz"],
      ["lieboch", "Dieselkino Lieboch", "Lieboch"],
      ["oberwart", "Dieselkino Oberwart", "Oberwart"],
      ["stjohann", "Dieselkino St. Johann im Pongau", "St. Johann im Pongau"],
    ],
  },
  StarMovie: {
    field: "starMovieSlug",
    fetch: getStarMovieMovies,
    locations: [
      ["regau", "Star Movie Regau", "Regau"],
      ["liezen", "Star Movie Liezen", "Liezen"],
      ["peuerbach", "Star Movie Peuerbach", "Peuerbach"],
      ["ried", "Star Movie Ried", "Tumeltsham"],
      ["steyr", "Star Movie Steyr", "Dietach"],
      ["wels", "Star Movie Wels", "Wels"],
      ["tulln", "Star Movie Tulln", "Tulln an der Donau"],
    ],
  },
  Megaplex: {
    field: "megaplexSlug",
    fetch: getMegaplexMovies,
    locations: [
      ["linz", "Hollywood Megaplex PlusCity", "Pasching"],
      ["stpoelten", "Hollywood Megaplex St. Pölten", "St. Pölten"],
      ["gasometer", "Hollywood Megaplex Gasometer", "Wien"],
      ["scn", "Hollywood Megaplex SCN", "Wien"],
      ["metropol", "Metropol Kino", "Innsbruck"],
    ],
  },
} as const;

// Star Movie: first-party contact-page map pins. Other venues: matching OSM
// cinema objects, not map viewport centres or similarly named parking/bus stops.
// Sources and address checks: packages/cinema-providers/research/austria-activation.md.
const venueCoordinates = {
  braunau: { latitude: 48.2514018, longitude: 13.0447467 },
  bruck: { latitude: 47.2861808, longitude: 12.8094774 },
  fohnsdorf: { latitude: 47.1849802, longitude: 14.6849166 },
  gleisdorf: { latitude: 47.0973117, longitude: 15.7171757 },
  kapfenberg: { latitude: 47.4398301, longitude: 15.2877312 },
  leibnitz: { latitude: 46.7795602, longitude: 15.5352155 },
  lieboch: { latitude: 46.9568516, longitude: 15.3475336 },
  oberwart: { latitude: 47.2879771, longitude: 16.1860849 },
  stjohann: { latitude: 47.3514095, longitude: 13.1945465 },
  regau: { latitude: 47.9905188, longitude: 13.6807888 },
  liezen: { latitude: 47.5618797, longitude: 14.2562859 },
  peuerbach: { latitude: 48.3435768, longitude: 13.7719895 },
  ried: { latitude: 48.2194725, longitude: 13.4954972 },
  steyr: { latitude: 48.0771681, longitude: 14.4239639 },
  wels: { latitude: 48.1468935, longitude: 13.9748993 },
  tulln: { latitude: 48.3283577, longitude: 16.0828892 },
  linz: { latitude: 48.2433743, longitude: 14.2359778 },
  stpoelten: { latitude: 48.2168201, longitude: 15.6517709 },
  gasometer: { latitude: 48.1858681, longitude: 16.4206646 },
  scn: { latitude: 48.2684212, longitude: 16.398483 },
  metropol: { latitude: 47.269265, longitude: 11.3901741 },
};

const args = process.argv.slice(2);
const requested = args.filter((arg) => arg !== "--apply");
if (
  requested.length > 1 ||
  (requested[0] && !Object.hasOwn(providers, requested[0]))
)
  throw new Error(
    "Usage: create-austrian-cinemas.ts [DieselKino|StarMovie|Megaplex] [--apply]",
  );
const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, "_");
const plan: {
  name: string;
  slug: string;
  city: string;
  field: "dieselKinoSlug" | "starMovieSlug" | "megaplexSlug";
  nativeSlug: string;
  latitude: number;
  longitude: number;
}[] = [];

// Validate every selected venue before the first database write. Synthetic IDs
// are used only to inspect catalogues; these showings are never persisted.
for (const [provider, config] of Object.entries(providers)) {
  if (requested[0] && provider !== requested[0]) continue;
  for (const [nativeSlug, name, city] of config.locations) {
    const catalog = await config.fetch(plan.length + 1, nativeSlug);
    if (!catalog.movies.length || !catalog.showings.length)
      throw new Error(`Refusing to register an empty programme: ${name}`);
    plan.push({
      name,
      city,
      slug: slugify(name),
      field: config.field,
      nativeSlug,
      ...venueCoordinates[nativeSlug],
    });
    console.info(
      JSON.stringify({
        provider,
        name,
        city,
        nativeSlug,
        ...venueCoordinates[nativeSlug],
        films: catalog.movies.length,
        screenings: catalog.showings.length,
        sample: catalog.showings.slice(0, 2).map((showing) => ({
          title: showing.movieName,
          start: showing.dateTime,
          bookingUrl: showing.bookingUrl,
        })),
      }),
    );
  }
}

if (!args.includes("--apply")) {
  console.info(
    `Dry run: validated ${plan.length} locations; no database connection or writes. Apply the Austrian provider migration, verify source permissions and venue geotags before registration.`,
  );
} else {
  const { db } = await import("@waslaeuftin/db/client");
  try {
    const ids = await db.$transaction(
      async (tx) => {
        if (
          await tx.providerUpdateRun.count({
            where: { status: { in: ["QUEUED", "RUNNING"] } },
          })
        )
          throw new Error(
            "Wait for provider updates to finish before onboarding",
          );
        const result: number[] = [];
        for (const entry of plan) {
          const city = await tx.city.upsert({
            where: { name: entry.city },
            create: {
              name: entry.city,
              slug: slugify(entry.city),
              country: "AUSTRIA",
            },
            update: {},
          });
          if (city.country !== "AUSTRIA")
            throw new Error(
              `City already belongs to another country: ${entry.city}`,
            );
          const matches = await tx.cinema.findMany({
            where: {
              OR: [
                { [entry.field]: entry.nativeSlug },
                {
                  cityId: city.id,
                  OR: [
                    { slug: entry.slug },
                    { name: { equals: entry.name, mode: "insensitive" } },
                  ],
                },
              ],
            },
          });
          const existing = matches[0];
          if (
            matches.length > 1 ||
            (existing &&
              (existing.country !== "AUSTRIA" ||
                existing.cityId !== city.id ||
                existing[entry.field] !== entry.nativeSlug))
          )
            throw new Error(
              `Conflicting cinema mapping for ${entry.name}; review manually`,
            );
          if (existing) {
            const keys: (keyof Cinema)[] = [
              "yorckCinemaId",
              "cinetixxCinemaId",
              "cineprogBaseUrl",
              "uciCinemaId",
              "dieselKinoSlug",
              "starMovieSlug",
              "megaplexSlug",
              "cinemaxxVueCinemasMetadataId",
              "cineStarCinemaId",
              "cineplexCinemaId",
              "cinfinityCinemaId",
              "cineplexxAtCinemaId",
              "isKinoTicketsExpress",
              "premiumKinoSubdomain",
              "comtradaCineOrderMetadataId",
              "kinoHeldCinemasMetadataId",
            ];
            if (keys.some((key) => key !== entry.field && existing[key]))
              throw new Error(`Another provider is mapped to ${entry.name}`);
            result.push(existing.id);
          } else {
            const data = {
              name: entry.name,
              slug: entry.slug,
              cityId: city.id,
              country: "AUSTRIA",
              [entry.field]: entry.nativeSlug,
              latitude: entry.latitude,
              longitude: entry.longitude,
            } satisfies Prisma.CinemaUncheckedCreateInput;
            result.push((await tx.cinema.create({ data })).id);
          }
        }
        return result;
      },
      { timeout: 60_000 },
    );
    console.info(`Registered/confirmed cinemas: ${ids.join(", ")}`);
    console.info(
      "New entries use verified contact-page or OpenStreetMap cinema geotags; existing coordinates are unchanged. The normal provider updater imports listings; this script does not run it.",
    );
  } finally {
    await db.$disconnect();
  }
}
