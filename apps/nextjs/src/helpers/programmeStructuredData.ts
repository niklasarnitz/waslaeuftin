import type { Countries } from "@waslaeuftin/db";
import { listingPath, SITE_URL } from "@waslaeuftin/helpers/seo";

interface Theater {
  name: string;
  slug: string;
  country: Countries;
  latitude: number | null;
  longitude: number | null;
}

export function theaterData(
  cinema: Theater,
  city: { name: string; slug: string },
) {
  const url = `${SITE_URL}${listingPath("cinema", cinema.slug)}`;
  return {
    "@type": "MovieTheater",
    "@id": `${url}#cinema`,
    name: cinema.name,
    url,
    containedInPlace: {
      "@type": "City",
      name: city.name,
      url: `${SITE_URL}${listingPath("city", city.slug)}`,
    },
    ...(cinema.latitude !== null && cinema.longitude !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: cinema.latitude,
            longitude: cinema.longitude,
          },
        }
      : {}),
  };
}

export function programmeBreadcrumbs(
  city: { name: string; slug: string },
  cinema?: { name: string; slug: string },
) {
  const items = [
    { name: "wasläuft.in", url: SITE_URL },
    {
      name: `Kinoprogramm ${city.name}`,
      url: `${SITE_URL}${listingPath("city", city.slug)}`,
    },
    ...(cinema
      ? [
          {
            name: cinema.name,
            url: `${SITE_URL}${listingPath("cinema", cinema.slug)}`,
          },
        ]
      : []),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
