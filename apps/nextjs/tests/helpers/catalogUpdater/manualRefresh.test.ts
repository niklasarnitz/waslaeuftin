import { expect, mock, test } from "bun:test";

import type {
  FetchProgressReporter,
  ProviderFetchOptions,
} from "@waslaeuftin/scripts/update-movies/helpers";

let trigger = "manual";
let finish: (() => void) | undefined;
const optionsSeen: ProviderFetchOptions[] = [];
const selectedCounts: number[] = [];

mock.module("@waslaeuftin/db/client", () => ({
  db: {
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
        if (data.status === "SUCCEEDED" || data.status === "FAILED") finish?.();
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
        return { movies: [], showings: [] };
      },
    },
  ],
}));

// No catalog is persisted in this test; avoid loading enrichment services.
mock.module(
  "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog",
  () => ({
    resolveAndPersistCatalog: async () => {
      throw new Error("Unexpected persistence");
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
