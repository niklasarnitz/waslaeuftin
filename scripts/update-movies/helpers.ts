import { db } from "@waslaeuftin/server/db";

export const CINEMA_BATCH_SIZE = 10;
export const BATCH_DELAY_MS = 100;
export const STALE_THRESHOLD_MS = 5 * 60 * 60 * 1000; // 5 hours

export const sleep = async (delayMs: number) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
};

export const isCinemaStale = (lastFetchedAt: Date | null): boolean => {
    if (!lastFetchedAt) return true;
    return Date.now() - lastFetchedAt.getTime() > STALE_THRESHOLD_MS;
};

export const markCinemasFetched = async (cinemaIds: number[]) => {
    if (cinemaIds.length === 0) return;
    await db.cinema.updateMany({
        where: { id: { in: cinemaIds } },
        data: { lastFetchedAt: new Date() },
    });
};

export const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
    if (chunkSize <= 0) {
        throw new Error("chunkSize must be greater than 0");
    }

    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
};
