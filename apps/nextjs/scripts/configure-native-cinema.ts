// Dry run by default. Apply only after reviewing the fetched source and venue.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { db } from "@waslaeuftin/db/client";
import {
  fetchNativeCinema,
  nativeCinemaSourceKey,
  nativeProviderNames,
} from "@waslaeuftin/helpers/catalogUpdater/nativeCinemaProviders";
import { persistNativeCatalog } from "@waslaeuftin/helpers/catalogUpdater/persistNativeCatalog";

const args = process.argv.slice(2).filter((arg) => arg !== "--apply");
const [name, id, nativeId, slug] = args;
const provider = nativeProviderNames.find((entry) => entry === name);
if (
  !provider ||
  !id ||
  !/^[1-9]\d*$/.test(id) ||
  !nativeId ||
  args.length > 4 ||
  ((provider === "Yorck" || provider === "UCI") && !slug)
) {
  throw new Error(
    "Usage: configure-native-cinema.ts <Yorck|Cinetixx|Cineprog|UCI|DieselKino|StarMovie|Megaplex> <existing-cinema-id> <native-id|base-url|location-slug> [slug] [--apply]",
  );
}

try {
  const cinema = await db.cinema.findUniqueOrThrow({
    where: { id: Number(id) },
    include: { city: true },
  });
  const austrian = ["DieselKino", "StarMovie", "Megaplex"].includes(provider);
  if (cinema.country !== (austrian ? "AUSTRIA" : "GERMANY"))
    throw new Error("Native provider does not match this cinema's country");
  if (
    cinema.cinemaxxVueCinemasMetadataId ||
    cinema.cineStarCinemaId ||
    cinema.cineplexCinemaId ||
    cinema.cinfinityCinemaId ||
    cinema.cineplexxAtCinemaId ||
    cinema.isKinoTicketsExpress ||
    cinema.premiumKinoSubdomain ||
    cinema.comtradaCineOrderMetadataId
  )
    throw new Error(
      "This cinema has another direct provider. Retire its mapping explicitly before switching sources.",
    );
  const mapping = {
    id: cinema.id,
    yorckCinemaId: provider === "Yorck" ? nativeId : null,
    yorckCinemaSlug: provider === "Yorck" ? (slug ?? null) : null,
    cinetixxCinemaId: provider === "Cinetixx" ? nativeId : null,
    cineprogBaseUrl: provider === "Cineprog" ? nativeId : null,
    uciCinemaId: provider === "UCI" ? nativeId : null,
    uciCinemaSlug: provider === "UCI" ? (slug ?? null) : null,
    dieselKinoSlug: provider === "DieselKino" ? nativeId : null,
    starMovieSlug: provider === "StarMovie" ? nativeId : null,
    megaplexSlug: provider === "Megaplex" ? nativeId : null,
  };
  const catalog = await fetchNativeCinema(provider, { ...cinema, ...mapping });
  catalog.fetchedCinemaIds = [cinema.id];
  console.info(
    JSON.stringify(
      {
        cinema: { id: cinema.id, name: cinema.name, city: cinema.city.name },
        mapping,
        movies: catalog.movies.length,
        sessions: catalog.showings.length,
        sample: catalog.showings
          .slice(0, 3)
          .map(({ sourceMetadata: _metadata, ...showing }) => showing),
      },
      null,
      2,
    ),
  );
  if (!process.argv.includes("--apply")) {
    console.info(
      "Dry run only. Verify the physical venue before using --apply; it replaces future listings and activates native ownership.",
    );
  } else {
    if (
      await db.providerUpdateRun.count({
        where: { status: { in: ["QUEUED", "RUNNING"] } },
      })
    )
      throw new Error(
        "Wait for provider updates to finish before switching sources",
      );
    const backup = resolve(
      ".cache",
      `native-cinema-${cinema.id}-before-${Date.now()}.json`,
    );
    await mkdir(resolve(".cache"), { recursive: true });
    await writeFile(
      backup,
      JSON.stringify({
        cinema,
        showings: await db.showing.findMany({ where: { cinemaId: cinema.id } }),
      }),
      { mode: 0o600 },
    );
    console.info(`Rollback snapshot: ${backup}`);
    await persistNativeCatalog([catalog], undefined, [
      { ...mapping, previousSourceKey: nativeCinemaSourceKey(cinema) },
    ]);
    console.info(`Activated ${provider} for cinema ${cinema.id}`);
  }
} finally {
  await db.$disconnect();
}
