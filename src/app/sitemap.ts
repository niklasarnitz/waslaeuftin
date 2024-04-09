import { db } from "@waslaeuftin/server/db";
import { type MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = await db.city.findMany();
  const cinemas = await db.cinema.findMany();

  return [
    {
      url: "https://waslaeuft.in",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...cities.map((city) => ({
      url: `https://waslaeuft.in/city/${city.slug}/today`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    })),
    ...cinemas.map((cinema) => ({
      url: `https://waslaeuft.in/cinema/${cinema.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    })),
  ] as MetadataRoute.Sitemap;
}
