import { type MetadataRoute } from "next";

import { db } from "@waslaeuftin/db/client";
import { listingPath, SITE_URL } from "@waslaeuftin/helpers/seo";

// Render per request: the image is built without database access.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const upcomingShowings = { some: { dateTime: { gte: new Date() } } };
  const [cities, cinemas] = await Promise.all([
    db.city.findMany({
      where: { cinemas: { some: { showings: upcomingShowings } } },
      select: { slug: true },
    }),
    db.cinema.findMany({
      where: { showings: upcomingShowings },
      select: { slug: true },
    }),
  ]);

  // Let database failures return an error instead of publishing an incomplete sitemap.
  // No fabricated lastModified: a request is not a content update.
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/download`, changeFrequency: "monthly", priority: 0.5 },
    ...cities.map((city) => ({
      url: `${SITE_URL}${listingPath("city", city.slug)}`,
      changeFrequency: "daily" as const,
      priority: 1,
    })),
    ...cinemas.map((cinema) => ({
      url: `${SITE_URL}${listingPath("cinema", cinema.slug)}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
