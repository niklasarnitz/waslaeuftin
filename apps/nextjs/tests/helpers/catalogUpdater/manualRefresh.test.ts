import { expect, mock, test } from "bun:test";

import type {
  FetchProgressReporter,
  ProviderFetchOptions,
} from "@waslaeuftin/scripts/update-movies/helpers";

let trigger = "manual";
let finish: (() => void) | undefined;
const optionsSeen: ProviderFetchOptions[] = [];
const selectedCounts: number[] = [];
let includeSchedule = false;
let failPersistence = false;
let finalStatus = "";
const operations: string[] = [];

mock.module("@waslaeuftin/db/client", () => ({
  db: {
    cinema: {
      updateMany: async () => {
        operations.push("freshness");
        return { count: 1 };
      },
    },
    providerUpdateRun: {
      updateMany: async () => ({ count: 0 }),
      findFirst: async () => null,
      createManyAndReturn: async ({
        data,
      }: {
        data: { trigger: string }[];
      }) => {
        trigger = data[0]?.trigger ?? "";
        return [{ id: 1, provider: "TestProvider", trigger }];
      },
      update: async ({ data }: { data: { status?: string } }) => {
        if (data.status === "SUCCEEDED" || data.status === "FAILED") {
          finalStatus = data.status;
          finish?.();
        }
      },
    },
  },
}));
mock.module(
  "@waslaeuftin/helpers/notifications/sendPushoverNotification",
  () => ({ sendPushoverNotification: async () => undefined }),
);
mock.module("@waslaeuftin/helpers/catalogUpdater/providerFetchers", () => ({
  providerFetchers: [
    {
      name: "TestProvider",
      fetch: async (
        progress?: FetchProgressReporter,
        options?: ProviderFetchOptions,
      ) => {
        const { shouldFetchCinema } =
          await import("@waslaeuftin/scripts/update-movies/helpers");
        const count = [new Date()].filter((date) =>
          shouldFetchCinema(date, options),
        ).length;
        selectedCounts.push(count);
        optionsSeen.push(options ?? {});
        await progress?.onCinemasSelected(count);
        return includeSchedule
          ? {
              fetchedCinemaIds: [1],
              movies: [],
              showings: [
                {
                  cinemaId: 1,
                  movieName: "Film",
                  dateTime: new Date(),
                  showingAdditionalData: [],
                },
              ],
            }
          : { movies: [], showings: [] };
      },
    },
  ],
}));

// No catalog is persisted in this test; avoid loading enrichment services.
mock.module(
  "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog",
  () => ({
    resolveAndPersistCatalog: async () => {
      if (!includeSchedule) throw new Error("Unexpected persistence");
      operations.push("persistence");
      if (failPersistence) throw new Error("Schedule could not be saved");
      return {
        totalShowings: 1,
        canonicalMovies: 1,
        tmdbMatched: 0,
        tmdbUnmatched: 1,
      };
    },
  }),
);

test("manual Run selects recently fetched cinemas; cron keeps the freshness filter", async () => {
  const { startProviderUpdates } =
    await import("@waslaeuftin/helpers/catalogUpdater/providerUpdateRunner");
  for (const runTrigger of ["manual", "cron"] as const) {
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });
    expect(
      (
        await startProviderUpdates({
          trigger: runTrigger,
          providers: ["TestProvider"],
        })
      ).started,
    ).toBe(true);
    await done;
    // Let executeBatch release its per-process lock after the success update.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(optionsSeen).toEqual([{ force: true }, { force: false }]);
  expect(selectedCounts).toEqual([1, 0]);
});

test("freshness advances only after a programme is successfully persisted", async () => {
  const { startProviderUpdates } =
    await import("@waslaeuftin/helpers/catalogUpdater/providerUpdateRunner");
  includeSchedule = true;
  for (const fail of [false, true]) {
    failPersistence = fail;
    operations.length = 0;
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });
    expect(
      (
        await startProviderUpdates({
          trigger: "manual",
          providers: ["TestProvider"],
        })
      ).started,
    ).toBe(true);
    await done;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(operations).toEqual(
      fail ? ["persistence"] : ["persistence", "freshness"],
    );
    expect(finalStatus).toBe(fail ? "FAILED" : "SUCCEEDED");
  }
  includeSchedule = false;
  failPersistence = false;
});
