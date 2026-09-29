import type { OdeonSite } from "@waslaeuftin/cinema-providers/server";
import type { City } from "@waslaeuftin/db";
import {
  getOdeonSites,
  ODEON_TIME_ZONE,
} from "@waslaeuftin/cinema-providers/server";
import { Countries } from "@waslaeuftin/db";
import { db } from "@waslaeuftin/db/client";

const toSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "_");

const getCityName = (site: OdeonSite) =>
  site.contactDetails?.address?.city?.trim() ?? site.name.text.trim();

// "London Leicester Square" -> "ODEON London Leicester Square"
const getCinemaName = (site: OdeonSite) => {
  const name = site.name.text.trim();
  return /^odeon\b/i.test(name) ? name : `ODEON ${name}`;
};

const allSites = await getOdeonSites();
// Skip anything outside the UK (e.g. test or Irish sites), if marked.
const sites = allSites.filter(
  (site) => !site.ianaTimeZoneName || site.ianaTimeZoneName === ODEON_TIME_ZONE,
);

console.log(
  `Found ${sites.length} ODEON sites (${allSites.length - sites.length} skipped outside ${ODEON_TIME_ZONE})`,
);

const upsertCity = async (cityName: string, site: OdeonSite) => {
  const slug = toSlug(cityName);
  const existingCity = await db.city.findFirst({
    where: {
      OR: [{ name: cityName }, { slug }],
    },
  });

  if (existingCity?.country === Countries.UNITED_KINGDOM) return existingCity;

  if (existingCity) {
    // City names and slugs are unique across countries.
    console.warn(
      `City ${cityName} already exists in ${existingCity.country}, using "${cityName} (UK)"`,
    );
    return upsertCity(`${cityName} (UK)`, site);
  }

  return db.city.create({
    data: {
      name: cityName,
      slug,
      country: Countries.UNITED_KINGDOM,
      latitude: site.location?.latitude,
      longitude: site.location?.longitude,
    },
  });
};

const citiesByName = new Map<string, City>();
for (const site of sites) {
  const cityName = getCityName(site);
  if (!citiesByName.has(cityName)) {
    citiesByName.set(cityName, await upsertCity(cityName, site));
  }
}

console.log(`Created or updated ${citiesByName.size} cities`);

const createdCinemas = await Promise.all(
  sites.map(async (site) => {
    const city = citiesByName.get(getCityName(site));

    if (!city) {
      throw new Error(`City not found for ODEON site ${site.id}`);
    }

    if (!site.location) {
      console.warn(`ODEON site ${site.id} (${site.name.text}) has no location`);
    }

    const name = getCinemaName(site);
    const slug = toSlug(name);
    const data = {
      name,
      latitude: site.location?.latitude,
      longitude: site.location?.longitude,
      odeonCinemaId: site.id,
    };

    const existingCinema = await db.cinema.findFirst({
      where: { odeonCinemaId: site.id },
    });

    if (existingCinema) {
      return db.cinema.update({
        where: { id: existingCinema.id },
        data,
      });
    }

    return db.cinema.upsert({
      where: {
        cityId_slug: {
          cityId: city.id,
          slug,
        },
      },
      create: {
        ...data,
        slug,
        cityId: city.id,
        country: Countries.UNITED_KINGDOM,
      },
      update: data,
    });
  }),
);

console.log(`Created or updated ${createdCinemas.length} ODEON cinemas`);

await db.$disconnect();
