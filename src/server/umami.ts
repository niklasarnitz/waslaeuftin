"server only";

import { createHash } from "node:crypto";
import { env } from "@waslaeuftin/env";
import { Umami } from '@umami/node';
import { Cinema, City } from "@prisma/client";

const VIEW_DEDUPLICATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const createUmamiClient = async () => {
    const client = new Umami({
        websiteId: env.UMAMI_WEBSITE_ID,
        hostUrl: env.UMAMI_URL
    });

    await client.identify({
        userAgent: "web/serverSide"
    })

    return client;
}

const globalForUmami = globalThis as unknown as {
    umami: Awaited<ReturnType<typeof createUmamiClient>> | undefined;
    lastViews: Map<string, number>;
};

if (!globalForUmami.lastViews) {
    globalForUmami.lastViews = new Map();
}

const umamiClient = globalForUmami.umami ?? await createUmamiClient();
const lastViews = globalForUmami.lastViews;

const hashIp = (ip: string) => {
    return createHash("sha256").update(ip).digest("hex");
};

const shouldTrackView = (hashedIp: string, type: "cinema" | "city", slug: string) => {
    const key = `${hashedIp}:${type}:${slug}`;
    const now = Date.now();
    const lastView = lastViews.get(key);

    if (lastView && now - lastView < VIEW_DEDUPLICATION_TIMEOUT_MS) {
        return false;
    }

    lastViews.set(key, now);

    // Periodic cleanup of old entries to prevent memory leaks
    if (lastViews.size > 10000) {
        for (const [k, v] of lastViews.entries()) {
            if (now - v > VIEW_DEDUPLICATION_TIMEOUT_MS) {
                lastViews.delete(k);
            }
        }
    }

    return true;
};

export const trackCinemaView = async (cinema: Cinema | Cinema[], ip?: string) => {
    // if (env.NODE_ENV !== "production") {
    //     return;
    // }

    const hashedIp = ip ? hashIp(ip) : "unknown";
    const cinemas = Array.isArray(cinema) ? cinema : [cinema];

    await Promise.all(cinemas.map((c) => {
        if (!shouldTrackView(hashedIp, "cinema", c.slug)) {
            return Promise.resolve();
        }

        return umamiClient.track({
            url: `/cinema/${c.slug}`,
            name: 'cinema-view',
            data: { 
                slug: c.slug,
                name: c.name
            }
        });
    }))
};

export const trackCityView = async (city: City | City[], ip?: string) => {
    // if (env.NODE_ENV !== "production") {
    //     return;
    // }

    const hashedIp = ip ? hashIp(ip) : "unknown";
    const cities = Array.isArray(city) ? city : [city];

    await Promise.all(cities.map((c) => {
        if (!shouldTrackView(hashedIp, "city", c.slug)) {
            return Promise.resolve();
        }

        return umamiClient.track({
            url: `/city/${c.slug}`,
            name: 'city-view',
            data: { 
                slug: c.slug,
                name: c.name
            }
        });
    }))
};
