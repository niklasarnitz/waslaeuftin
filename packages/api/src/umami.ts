"server only";

import { createHash } from "node:crypto";
import type { z } from "zod";
import { Umami } from "@umami/node";

import type { Cinema, City } from "@waslaeuftin/db";
import { ViewDeduplicator } from "@waslaeuftin/api/internal/view-deduplicator";
import { MobileAnalyticsEventInputSchema } from "@waslaeuftin/validators";

const DEFAULT_VIEW_DEDUPLICATION_WINDOW_SECONDS = 5 * 60;

const getViewDeduplicationWindowMs = () => {
  const configuredSeconds = Number(
    process.env.UMAMI_VIEW_DEDUPLICATION_SECONDS,
  );

  if (Number.isFinite(configuredSeconds) && configuredSeconds > 0) {
    return configuredSeconds * 1000;
  }

  return DEFAULT_VIEW_DEDUPLICATION_WINDOW_SECONDS * 1000;
};

const createUmamiClient = async () => {
  const websiteId = process.env.UMAMI_WEBSITE_ID;
  const hostUrl = process.env.UMAMI_URL;

  if (!websiteId || !hostUrl) {
    return null;
  }

  const client = new Umami({ websiteId, hostUrl });
  await client.identify({ userAgent: "web/serverSide" });
  return client;
};

const globalForUmami = globalThis as unknown as {
  umami?: Awaited<ReturnType<typeof createUmamiClient>>;
  viewDeduplicator?: ViewDeduplicator;
};

const umamiClient = globalForUmami.umami ?? (await createUmamiClient());
if (umamiClient) {
  globalForUmami.umami = umamiClient;
}

const viewDeduplicator =
  globalForUmami.viewDeduplicator ??
  new ViewDeduplicator(getViewDeduplicationWindowMs());
globalForUmami.viewDeduplicator = viewDeduplicator;

const hashIp = (ip: string) => createHash("sha256").update(ip).digest("hex");

export const getAnalyticsSource = (headers: Headers) => {
  const source = headers.get("x-trpc-source");

  return source === "expo-react" ? "mobile" : "web";
};

export const trackCinemaView = async (
  cinema: Cinema | Cinema[],
  ip?: string,
  source = "web",
) => {
  if (process.env.NODE_ENV !== "production" || !umamiClient) {
    return;
  }

  const hashedIp = ip && ip !== "unknown" ? hashIp(ip) : undefined;
  const cinemas = Array.isArray(cinema) ? cinema : [cinema];

  await Promise.all(
    cinemas.map((item) => {
      if (!viewDeduplicator.shouldTrack(hashedIp, "cinema", item.slug)) {
        return Promise.resolve();
      }

      return umamiClient.track({
        url: `/cinema/${item.slug}`,
        name: "cinema-view",
        data: {
          slug: item.slug,
          source,
        },
      });
    }),
  );
};

export const trackCityView = async (
  city: City | City[],
  ip?: string,
  source = "web",
) => {
  if (process.env.NODE_ENV !== "production" || !umamiClient) {
    return;
  }

  const hashedIp = ip && ip !== "unknown" ? hashIp(ip) : undefined;
  const cities = Array.isArray(city) ? city : [city];

  await Promise.all(
    cities.map((item) => {
      if (!viewDeduplicator.shouldTrack(hashedIp, "city", item.slug)) {
        return Promise.resolve();
      }

      return umamiClient.track({
        url: `/city/${item.slug}`,
        name: "city-view",
        data: {
          slug: item.slug,
          source,
        },
      });
    }),
  );
};

type MobileAnalyticsEventInput = z.infer<
  typeof MobileAnalyticsEventInputSchema
>;

export const trackMobileEvent = async (event: MobileAnalyticsEventInput) => {
  if (process.env.NODE_ENV !== "production" || !umamiClient) {
    return;
  }

  const input = MobileAnalyticsEventInputSchema.parse(event);
  const url = input.screen ? `/app/${input.screen}` : "/app";
  const data = Object.fromEntries(
    Object.entries({
      source: "mobile",
      screen: input.screen,
      result: input.result,
      action: input.action,
      targetType: input.targetType,
      resultCount: input.resultCount,
    }).filter(([, value]) => value !== undefined),
  );

  await umamiClient.track({
    url,
    name: input.name,
    data,
  });
};
