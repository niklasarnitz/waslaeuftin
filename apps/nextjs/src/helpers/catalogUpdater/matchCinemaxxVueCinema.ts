import type { CinemaxxVueCinema } from "@waslaeuftin/cinema-providers/server";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");

// These Kinoheld names differ from the official CinemaxX directory. Match full
// venue identities, never just a city (Hamburg and Stuttgart have several).
const aliases: Record<string, string> = Object.fromEntries(
  [
    ["CinemaxX Berlin - Potsdamer Platz", "CinemaxX Berlin"],
    ["CinemaxX Mülheim an der Ruhr", "CinemaxX Mülheim"],
    ["CinemaxX Hannover - Raschplatz", "CinemaxX Hannover"],
    ["CinemaxX Dießem, Lehmheide", "CinemaxX Krefeld"],
    ["CinemaxX Freiburg im Breisgau", "CinemaxX Freiburg"],
    ["CinemaxX - Charlottencenter", "CinemaxX Halle"],
    ["CinemaxX an der Liederhalle", "CinemaxX Stuttgart Liederhalle"],
    ["CinemaxX Offenbach am Main", "CinemaxX Offenbach"],
    ["Holi-Kino", "HOLI Hamburg"],
  ].map(([local, official]) => [normalize(local!), normalize(official!)]),
);

export const matchCinemaxxVueCinema = (
  cinema: { name: string; city: { name: string } },
  directory: CinemaxxVueCinema[],
) => {
  const localName = normalize(cinema.name);
  const expected =
    aliases[localName] ??
    (localName === "cinemaxx"
      ? normalize(`CinemaxX ${cinema.city.name}`)
      : localName);
  const matches = directory.filter(
    (entry) => normalize(entry.fullName) === expected,
  );
  if (matches.length !== 1)
    throw new Error(
      `Expected exactly one CinemaxX/Vue match for ${cinema.name} (${cinema.city.name}), found ${matches.length}`,
    );
  const providerCinemaId = Number(matches[0]!.cinemaId);
  if (!Number.isSafeInteger(providerCinemaId) || providerCinemaId <= 0)
    throw new Error(`Invalid CinemaxX/Vue cinema ID for ${cinema.name}`);
  return providerCinemaId;
};
