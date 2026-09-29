import type { BoxofficeTheaterNode } from "@waslaeuftin/cinema-providers/server";
import {
  boxofficeChains,
  getBoxofficeSiteData,
} from "@waslaeuftin/cinema-providers/server";
import { Countries } from "@waslaeuftin/db";
import { db } from "@waslaeuftin/db/client";

// Creates the cities and cinemas of Cineworld UK from the theater list in the
// site build. Other Boxoffice chains (Everyman, Showcase) work the same way
// with a different chain here.
const chain = boxofficeChains.cineworld;

// Theaters whose `location.city` is a district, a county or ambiguous.
const CITY_OVERRIDES: Record<string, string> = {
  X079V: "Boldon", // "Tyne and Wear"
  X11BH: "Liverpool", // "Speke"
  X07AD: "Newport (Isle of Wight)", // "Newport", same as Newport, Wales
  X06TH: "Newcastle upon Tyne", // "Newcastle Upon Tyne"
};

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+-\s+/g, " ")
    .trim()
    .replace(/\s+/g, "_");

const getCityName = (theater: BoxofficeTheaterNode) => {
  const override = CITY_OVERRIDES[theater.id];
  if (override) return override;

  // Cineworld names all Greater London theaters "London - <area>", while
  // `location.city` is sometimes the borough (Bexleyheath, Ilford, ...).
  if (theater.name.startsWith("London - ")) return "London";

  const city = theater.practicalInfo.location?.city?.trim();
  if (!city) {
    throw new Error(`No city for ${chain.name} theater ${theater.id}`);
  }
  return city;
};

// "London - Leicester Square" -> "Cineworld London Leicester Square"
const getCinemaName = (theater: BoxofficeTheaterNode) =>
  `${chain.name} ${theater.name.replace(/\s+-\s+/g, " ").trim()}`;

const siteData = await getBoxofficeSiteData(chain);
const theaters = siteData.theaters.filter(
  (theater) => !theater.practicalInfo.closed,
);

console.log(
  `Found ${theaters.length} open ${chain.name} theaters (${siteData.theaters.length - theaters.length} closed)`,
);

// City coordinates: the centroid of its theaters.
const getCityCoordinates = (cityName: string) => {
  const coordinates = theaters
    .filter((theater) => getCityName(theater) === cityName)
    .flatMap((theater) => theater.practicalInfo.coordinates ?? []);

  if (coordinates.length === 0) return { latitude: null, longitude: null };

  return {
    latitude:
      coordinates.reduce((sum, c) => sum + c.latitude, 0) / coordinates.length,
    longitude:
      coordinates.reduce((sum, c) => sum + c.longitude, 0) / coordinates.length,
  };
};

const cityIdsBySlug = new Map<string, number>();

for (const cityName of new Set(theaters.map(getCityName))) {
  const slug = toSlug(cityName);
  const coordinates = getCityCoordinates(cityName);

  const existingCity = await db.city.findFirst({
    where: { OR: [{ name: cityName }, { slug }] },
  });

  if (existingCity && existingCity.country !== Countries.UNITED_KINGDOM) {
    throw new Error(
      `City ${cityName} (${slug}) already exists in ${existingCity.country}`,
    );
  }

  const city = existingCity
    ? existingCity.latitude === null || existingCity.longitude === null
      ? await db.city.update({
          where: { id: existingCity.id },
          data: coordinates,
        })
      : existingCity
    : await db.city.create({
        data: {
          name: cityName,
          slug,
          country: Countries.UNITED_KINGDOM,
          ...coordinates,
        },
      });

  cityIdsBySlug.set(slug, city.id);
}

console.log(`Created or found ${cityIdsBySlug.size} cities`);

let cinemaCount = 0;

for (const theater of theaters) {
  const cityId = cityIdsBySlug.get(toSlug(getCityName(theater)));
  if (!cityId) {
    throw new Error(`City not found for theater ${theater.id}`);
  }

  const name = getCinemaName(theater);
  const slug = toSlug(name);
  const coordinates = theater.practicalInfo.coordinates;

  const data = {
    name,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    boxofficeTheaterId: theater.id,
    boxofficeDomain: chain.domain,
  };

  await db.cinema.upsert({
    where: { cityId_slug: { cityId, slug } },
    create: {
      ...data,
      cityId,
      slug,
      country: Countries.UNITED_KINGDOM,
    },
    update: data,
  });

  cinemaCount++;
}

console.log(`Created or updated ${cinemaCount} cinemas`);

process.exit();
