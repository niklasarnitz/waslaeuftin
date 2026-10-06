import { randomUUID } from "node:crypto";

import type { Prisma, ProviderUpdateRun } from "@waslaeuftin/db";
import type { ProviderFetcher } from "@waslaeuftin/helpers/catalogUpdater/providerFetchers";
import type { ResolvePhase } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";
import { db } from "@waslaeuftin/db/client";
import { providerFetchers } from "@waslaeuftin/helpers/catalogUpdater/providerFetchers";
import { resolveAndPersistCatalog } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";
import { sendPushoverNotification } from "@waslaeuftin/helpers/notifications/sendPushoverNotification";

export type ProviderUpdateTrigger = "cron" | "manual" | "cli";

// A run that has not reported progress for this long is considered dead
// (e.g. the process running it was killed) and no longer blocks new runs.
const STALE_RUN_MS = 30 * 60 * 1000;

const ACTIVE_STATUSES = ["QUEUED", "RUNNING"] as const;

const RESOLVE_PHASES = {
  matching: "MATCHING",
  tmdb: "TMDB",
  persisting: "PERSISTING",
} as const satisfies Record<ResolvePhase, string>;

// Only one batch runs per process at a time; survives HMR reloads in dev.
const globalForRunner = globalThis as unknown as {
  activeProviderUpdateBatch?: string;
};

export const errorToString = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

const updateRun = async (
  id: number,
  data: Prisma.ProviderUpdateRunUpdateInput,
) => {
  try {
    await db.providerUpdateRun.update({ where: { id }, data });
  } catch (error) {
    // Progress bookkeeping must never fail the actual update.
    console.warn(`[ProviderUpdate] Could not update run ${id}:`, error);
  }
};

/**
 * Fails runs that can no longer finish. Runs started by the server (cron or
 * admin page) die with the process, so on boot they are always interrupted.
 * CLI runs live in their own process and are only failed once they go stale.
 */
export const failInterruptedRuns = async ({
  serverBoot,
}: {
  serverBoot: boolean;
}) => {
  const staleBefore = new Date(Date.now() - STALE_RUN_MS);
  const staleRuns = await db.providerUpdateRun.updateMany({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      updatedAt: { lt: staleBefore },
    },
    data: {
      status: "FAILED",
      error: "Abandoned: no progress reported for 30 minutes.",
      finishedAt: new Date(),
    },
  });

  const interruptedRuns = serverBoot
    ? await db.providerUpdateRun.updateMany({
        where: {
          status: { in: [...ACTIVE_STATUSES] },
          trigger: { in: ["cron", "manual"] },
        },
        data: {
          status: "FAILED",
          error: "Interrupted: the server restarted while this run was active.",
          finishedAt: new Date(),
        },
      })
    : { count: 0 };

  const failed = staleRuns.count + interruptedRuns.count;
  if (failed > 0) {
    await sendPushoverNotification(
      "Movie Update Interrupted",
      `${failed} provider update run(s) did not finish and were marked as failed ` +
        `(${interruptedRuns.count} interrupted by a server restart, ${staleRuns.count} without progress for 30 minutes).`,
    );
  }

  return failed;
};

const findActiveRun = async () => {
  await failInterruptedRuns({ serverBoot: false });
  return db.providerUpdateRun.findFirst({
    where: { status: { in: [...ACTIVE_STATUSES] } },
    orderBy: { queuedAt: "desc" },
  });
};

const selectProviders = (providers?: string[]) => {
  if (!providers || providers.length === 0) return providerFetchers;

  const requested = new Set(providers.map((name) => name.toLowerCase()));
  const selected = providerFetchers.filter((provider) =>
    requested.has(provider.name.toLowerCase()),
  );

  if (selected.length !== requested.size) {
    const known = new Set(providerFetchers.map((p) => p.name.toLowerCase()));
    const unknown = providers.filter((name) => !known.has(name.toLowerCase()));
    throw new Error(
      `Unknown provider(s): ${unknown.join(", ")}. Available providers: ${providerFetchers.map((p) => p.name).join(", ")}`,
    );
  }

  return selected;
};

const executeRun = async (run: ProviderUpdateRun, fetcher: ProviderFetcher) => {
  console.info(`[ProviderUpdate] ${fetcher.name}: starting (run ${run.id})`);

  await updateRun(run.id, {
    status: "RUNNING",
    phase: "FETCHING",
    startedAt: new Date(),
  });

  let cinemasProcessed = 0;
  let cinemasFailed = 0;

  try {
    const catalog = await fetcher.fetch({
      onCinemasSelected: (total) =>
        updateRun(run.id, {
          cinemasTotal: total,
          phaseTotal: total,
          phaseDone: 0,
        }),
      onChunkProcessed: (processed, failed) => {
        cinemasProcessed += processed;
        cinemasFailed += failed;
        return updateRun(run.id, {
          cinemasProcessed,
          cinemasFailed,
          phaseDone: cinemasProcessed,
        });
      },
    });

    console.info(
      `[ProviderUpdate] ${fetcher.name}: fetched ${catalog.movies.length} movies, ${catalog.showings.length} showings`,
    );

    await updateRun(run.id, {
      moviesFetched: catalog.movies.length,
      showingsFetched: catalog.showings.length,
    });

    if (catalog.movies.length > 0 || catalog.showings.length > 0) {
      const result = await (fetcher.persist ?? resolveAndPersistCatalog)(
        [catalog],
        {
          onPhase: (phase, total) =>
            updateRun(run.id, {
              phase: RESOLVE_PHASES[phase],
              phaseTotal: total,
              phaseDone: 0,
            }),
          onProgress: (done) => updateRun(run.id, { phaseDone: done }),
        },
      );

      await updateRun(run.id, {
        showingsCreated: result.totalShowings,
        canonicalMovies: result.canonicalMovies,
        tmdbMatched: result.tmdbMatched,
        tmdbUnmatched: result.tmdbUnmatched,
      });
    }

    await updateRun(run.id, {
      status: "SUCCEEDED",
      phase: "DONE",
      finishedAt: new Date(),
    });
    console.info(`[ProviderUpdate] ${fetcher.name}: done`);
    return true;
  } catch (error) {
    const errorOutput = errorToString(error);
    console.error(`[ProviderUpdate] ${fetcher.name}: failed`, error);

    await updateRun(run.id, {
      status: "FAILED",
      error: errorOutput,
      finishedAt: new Date(),
    });
    await sendPushoverNotification(
      "Movie Update Failed",
      `Provider update failed: ${fetcher.name}\nOutput:\n${errorOutput}`,
    );
    return false;
  }
};

const createBatch = async (
  fetchers: ProviderFetcher[],
  trigger: ProviderUpdateTrigger,
) => {
  const batchId = randomUUID();
  const runs = await db.providerUpdateRun.createManyAndReturn({
    data: fetchers.map((fetcher) => ({
      batchId,
      provider: fetcher.name,
      trigger,
    })),
  });

  return { batchId, runs };
};

const executeBatch = async (
  batchId: string,
  runs: ProviderUpdateRun[],
  fetchers: ProviderFetcher[],
) => {
  globalForRunner.activeProviderUpdateBatch = batchId;
  const failedProviders: string[] = [];

  try {
    console.info(
      `[ProviderUpdate] Batch ${batchId}: updating ${fetchers.length} provider(s)`,
    );

    for (const fetcher of fetchers) {
      const run = runs.find((r) => r.provider === fetcher.name);
      if (!run) continue;

      const succeeded = await executeRun(run, fetcher);
      if (!succeeded) failedProviders.push(fetcher.name);
    }

    console.info(
      failedProviders.length > 0
        ? `[ProviderUpdate] Batch ${batchId} finished with failures: ${failedProviders.join(", ")}`
        : `[ProviderUpdate] Batch ${batchId} finished successfully`,
    );
  } finally {
    // Anything still queued (e.g. an unexpected throw) must not stay active.
    await db.providerUpdateRun
      .updateMany({
        where: { batchId, status: { in: [...ACTIVE_STATUSES] } },
        data: {
          status: "FAILED",
          error: "Batch aborted before this run finished.",
          finishedAt: new Date(),
        },
      })
      .catch((error: unknown) =>
        console.warn("[ProviderUpdate] Could not close batch:", error),
      );
    globalForRunner.activeProviderUpdateBatch = undefined;
  }

  return { batchId, failedProviders };
};

export type StartProviderUpdatesResult =
  { started: true; batchId: string } | { started: false; reason: string };

/**
 * Queues one run per provider and processes them in the background. Used by
 * the nightly cron and the admin page; returns once the runs are queued.
 */
export const startProviderUpdates = async ({
  providers,
  trigger,
}: {
  providers?: string[];
  trigger: Exclude<ProviderUpdateTrigger, "cli">;
}): Promise<StartProviderUpdatesResult> => {
  if (globalForRunner.activeProviderUpdateBatch) {
    return { started: false, reason: "An update is already running." };
  }

  // Claim the lock before the first await so a second call can't slip in.
  globalForRunner.activeProviderUpdateBatch = "starting";

  let batch: Awaited<ReturnType<typeof createBatch>>;
  let fetchers: ProviderFetcher[];
  try {
    const activeRun = await findActiveRun();
    if (activeRun) {
      globalForRunner.activeProviderUpdateBatch = undefined;
      return {
        started: false,
        reason: `An update is already running (${activeRun.provider}, run ${activeRun.id}).`,
      };
    }

    fetchers = selectProviders(providers);
    batch = await createBatch(fetchers, trigger);
  } catch (error) {
    globalForRunner.activeProviderUpdateBatch = undefined;
    throw error;
  }

  const { batchId, runs } = batch;
  void executeBatch(batchId, runs, fetchers).catch(async (error: unknown) => {
    console.error(`[ProviderUpdate] Batch ${batchId} crashed:`, error);
    await sendPushoverNotification(
      "Movie Update Crashed",
      `Update batch ${batchId} crashed:\n${errorToString(error)}`,
    );
  });

  return { started: true, batchId };
};

/**
 * Runs the given providers (all by default) to completion in this process.
 * Used by the CLI script.
 */
export const runProviderUpdates = async ({
  providers,
}: {
  providers?: string[];
}) => {
  const activeRun = await findActiveRun();
  if (activeRun) {
    throw new Error(
      `An update is already running (${activeRun.provider}, run ${activeRun.id}).`,
    );
  }

  const fetchers = selectProviders(providers);
  const { batchId, runs } = await createBatch(fetchers, "cli");
  return executeBatch(batchId, runs, fetchers);
};
