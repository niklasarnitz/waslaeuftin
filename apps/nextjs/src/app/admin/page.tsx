import { type Metadata } from "next";
import { notFound } from "next/navigation";

import type { Countries, ProviderUpdateRun } from "@waslaeuftin/db";
import {
  SignInButton,
  SignOutButton,
} from "@waslaeuftin/app/admin/_components/AuthButtons";
import { AutoRefresh } from "@waslaeuftin/app/admin/_components/AutoRefresh";
import { ProgressBar } from "@waslaeuftin/app/admin/_components/ProgressBar";
import { StartUpdateButton } from "@waslaeuftin/app/admin/_components/StartUpdateButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@waslaeuftin/components/ui/card";
import { db } from "@waslaeuftin/db/client";
import { isAdminAuthConfigured } from "@waslaeuftin/helpers/auth/authOptions";
import { getAdminSession } from "@waslaeuftin/helpers/auth/getAdminSession";
import { providerFetchers } from "@waslaeuftin/helpers/catalogUpdater/providerFetchers";
import { cn } from "@waslaeuftin/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin – wasläuft․in",
  robots: { index: false, follow: false },
};

const RUNS_PER_PROVIDER = 10;

const movieUpdateCron = process.env.MOVIE_UPDATE_CRON || "0 3 * * *";

const COUNTRY_LABELS: Record<Countries, string> = {
  GERMANY: "Germany",
  AUSTRIA: "Austria",
  UNITED_KINGDOM: "United Kingdom",
};

const PHASE_LABELS: Record<ProviderUpdateRun["phase"], string> = {
  QUEUED: "Queued",
  FETCHING: "Fetching cinemas",
  MATCHING: "Matching titles",
  TMDB: "Looking up TMDB",
  PERSISTING: "Writing to database",
  DONE: "Done",
};

// Share of the overall progress bar each phase covers.
const PHASE_RANGES: Record<ProviderUpdateRun["phase"], [number, number]> = {
  QUEUED: [0, 0],
  FETCHING: [0, 0.6],
  MATCHING: [0.6, 0.65],
  TMDB: [0.65, 0.95],
  PERSISTING: [0.95, 1],
  DONE: [1, 1],
};

const isActive = (run: ProviderUpdateRun) =>
  run.status === "QUEUED" || run.status === "RUNNING";

const phaseFraction = (run: ProviderUpdateRun) =>
  run.phaseTotal > 0 ? Math.min(run.phaseDone / run.phaseTotal, 1) : 0;

const runProgress = (run: ProviderUpdateRun) => {
  if (run.status === "SUCCEEDED") return 1;
  const [start, end] = PHASE_RANGES[run.phase];
  return start + (end - start) * phaseFraction(run);
};

const runTone = (run: ProviderUpdateRun) => {
  switch (run.status) {
    case "SUCCEEDED":
      return "success";
    case "FAILED":
      return "failed";
    case "RUNNING":
      return "running";
    default:
      return "idle";
  }
};

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  dateStyle: "short",
  timeStyle: "medium",
});

const formatDate = (date: Date | null) =>
  date ? dateFormatter.format(date) : "–";

const formatDuration = (run: ProviderUpdateRun, now: Date) => {
  if (!run.startedAt) return "–";
  const end = run.finishedAt ?? now;
  const totalSeconds = Math.max(
    0,
    Math.round((end.getTime() - run.startedAt.getTime()) / 1000),
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatCount = (value: number | null) =>
  value === null ? "–" : value.toLocaleString("de-DE");

const StatusBadge = ({ run }: { run: ProviderUpdateRun }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      run.status === "SUCCEEDED" &&
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      run.status === "FAILED" &&
        "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      run.status === "RUNNING" &&
        "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      run.status === "QUEUED" &&
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    )}
  >
    {run.status.toLowerCase()}
  </span>
);

const phaseDetail = (run: ProviderUpdateRun) => {
  if (run.status !== "RUNNING") return null;
  if (run.phase === "FETCHING") {
    const failed =
      run.cinemasFailed > 0 ? ` (${run.cinemasFailed} failed)` : "";
    return `${run.cinemasProcessed}/${run.cinemasTotal} cinemas${failed}`;
  }
  if (run.phaseTotal > 0) return `${run.phaseDone}/${run.phaseTotal}`;
  return null;
};

const ProviderCard = ({
  provider,
  runs,
  cinemaCount,
  updateActive,
  now,
}: {
  provider: string;
  runs: ProviderUpdateRun[];
  cinemaCount: number;
  updateActive: boolean;
  now: Date;
}) => {
  const latest = runs[0];
  const lastSuccess = runs.find((run) => run.status === "SUCCEEDED");
  const detail = latest ? phaseDetail(latest) : null;

  return (
    <Card>
      <CardHeader className="gap-2 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              {provider}
              {latest ? <StatusBadge run={latest} /> : null}
            </CardTitle>
            <CardDescription>
              {formatCount(cinemaCount)}{" "}
              {cinemaCount === 1 ? "cinema" : "cinemas"} · Last success:{" "}
              {formatDate(lastSuccess?.finishedAt ?? null)}
            </CardDescription>
          </div>
          <StartUpdateButton
            provider={provider}
            label="Run"
            disabled={updateActive}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {latest ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>
                {latest.status === "FAILED"
                  ? `Failed while: ${PHASE_LABELS[latest.phase].toLowerCase()}`
                  : PHASE_LABELS[latest.phase]}
                {detail ? ` · ${detail}` : ""}
              </span>
              <span>{Math.round(runProgress(latest) * 100)}%</span>
            </div>
            <ProgressBar
              value={runProgress(latest)}
              tone={runTone(latest)}
              indeterminate={
                latest.status === "RUNNING" &&
                (latest.phase === "PERSISTING" || latest.phaseTotal === 0)
              }
            />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-xs sm:grid-cols-4">
              <Stat label="Cinemas" value={formatCount(latest.cinemasTotal)} />
              <Stat
                label="Showings fetched"
                value={formatCount(latest.showingsFetched)}
              />
              <Stat
                label="New showings"
                value={formatCount(latest.showingsCreated)}
              />
              <Stat
                label="TMDB matched"
                value={
                  latest.tmdbMatched === null
                    ? "–"
                    : `${latest.tmdbMatched}/${(latest.tmdbMatched ?? 0) + (latest.tmdbUnmatched ?? 0)}`
                }
              />
            </dl>
            {latest.status === "FAILED" && latest.error ? (
              <details className="pt-1">
                <summary className="cursor-pointer text-xs text-red-700 dark:text-red-400">
                  {latest.error.split("\n")[0]}
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-100 p-2 text-[11px] whitespace-pre-wrap dark:bg-slate-900">
                  {latest.error}
                </pre>
              </details>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No runs yet.</p>
        )}

        {runs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">Run</th>
                  <th className="py-1 pr-2 font-medium">Started</th>
                  <th className="py-1 pr-2 font-medium">Duration</th>
                  <th className="py-1 pr-2 font-medium">Trigger</th>
                  <th className="w-24 py-1 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-t border-slate-100 dark:border-slate-800"
                    title={run.error ?? undefined}
                  >
                    <td className="py-1.5 pr-2">
                      <span className="mr-1.5 text-slate-500">#{run.id}</span>
                      <StatusBadge run={run} />
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {formatDate(run.startedAt ?? run.queuedAt)}
                    </td>
                    <td className="py-1.5 pr-2">{formatDuration(run, now)}</td>
                    <td className="py-1.5 pr-2">{run.trigger}</td>
                    <td className="py-1.5">
                      <ProgressBar
                        value={runProgress(run)}
                        tone={runTone(run)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-slate-500">{label}</dt>
    <dd className="font-medium tabular-nums">{value}</dd>
  </div>
);

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardHeader className="p-4">
      <CardDescription>{label}</CardDescription>
      <CardTitle className="text-2xl tabular-nums">
        {formatCount(value)}
      </CardTitle>
    </CardHeader>
  </Card>
);

const SignInScreen = ({ error }: { error?: string }) => (
  <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-24">
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Admin</CardTitle>
        <CardDescription>
          Sign in with your Authentik account to see the movie update runs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-red-700 dark:text-red-400">
            Sign-in failed ({error}). Please try again.
          </p>
        ) : null}
        <SignInButton />
      </CardContent>
    </Card>
  </main>
);

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  if (!isAdminAuthConfigured()) {
    notFound();
  }

  const session = await getAdminSession();
  if (!session) {
    const { error } = await searchParams;
    return (
      <SignInScreen error={typeof error === "string" ? error : undefined} />
    );
  }

  const [movieCount, showingCount, cinemaCount, cityCount, cinemaCountries] =
    await Promise.all([
      db.movie.count(),
      db.showing.count(),
      db.cinema.count(),
      db.city.count(),
      db.cinema.groupBy({ by: ["country"], orderBy: { country: "asc" } }),
    ]);

  const providers = await Promise.all(
    providerFetchers.map(async ({ name, cinemaWhere }) => {
      const [runs, cinemasByCountry] = await Promise.all([
        db.providerUpdateRun.findMany({
          where: { provider: name },
          orderBy: { queuedAt: "desc" },
          take: RUNS_PER_PROVIDER,
        }),
        db.cinema.groupBy({
          by: ["country"],
          where: cinemaWhere,
          _count: { _all: true },
        }),
      ]);
      return {
        provider: name,
        runs,
        cinemasByCountry: new Map(
          cinemasByCountry.map((row) => [row.country, row._count._all]),
        ),
      };
    }),
  );

  // A provider serving several countries is listed under each of them.
  const countrySections = cinemaCountries.map(({ country }) => ({
    country,
    providers: providers.filter(({ cinemasByCountry }) =>
      cinemasByCountry.has(country),
    ),
  }));
  const providersWithoutCinemas = providers.filter(
    ({ cinemasByCountry }) => cinemasByCountry.size === 0,
  );

  const latestRun = await db.providerUpdateRun.findFirst({
    orderBy: { queuedAt: "desc" },
  });
  const latestBatch = latestRun
    ? await db.providerUpdateRun.findMany({
        where: { batchId: latestRun.batchId },
        orderBy: { id: "asc" },
      })
    : [];

  const now = new Date();
  const updateActive = latestBatch.some(isActive);
  const batchFinished = latestBatch.filter((run) => !isActive(run)).length;
  const batchFailed = latestBatch.filter(
    (run) => run.status === "FAILED",
  ).length;
  // Failed runs are finished too, so they count as complete for the batch.
  const batchProgress =
    latestBatch.length > 0
      ? latestBatch.reduce(
          (sum, run) => sum + (run.status === "FAILED" ? 1 : runProgress(run)),
          0,
        ) / latestBatch.length
      : 0;
  const currentRun = latestBatch.find((run) => run.status === "RUNNING");

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 md:px-6">
      <AutoRefresh active={updateActive} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Movie updates</h1>
          <p className="text-sm text-slate-500">
            {movieUpdateCron === "off" ? (
              "Scheduled updates are disabled (MOVIE_UPDATE_CRON=off)."
            ) : (
              <>
                Scheduled <code>{movieUpdateCron}</code> (Europe/Berlin).
              </>
            )}{" "}
            Refreshes every {updateActive ? "3" : "30"} seconds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {session.user?.name ?? session.user?.email}
          </span>
          <SignOutButton />
          <StartUpdateButton
            label="Run all providers"
            disabled={updateActive}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Movies" value={movieCount} />
        <StatCard label="Showings" value={showingCount} />
        <StatCard label="Cinemas" value={cinemaCount} />
        <StatCard label="Cities" value={cityCount} />
        <StatCard label="Countries" value={cinemaCountries.length} />
      </div>

      {latestBatch.length > 0 && latestRun ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>
              {updateActive ? "Current update" : "Last update"}
            </CardTitle>
            <CardDescription>
              {latestBatch.length === 1
                ? latestRun.provider
                : `${latestBatch.length} providers`}{" "}
              · {latestRun.trigger} · queued {formatDate(latestRun.queuedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>
                {batchFinished}/{latestBatch.length} providers finished
                {batchFailed > 0 ? ` · ${batchFailed} failed` : ""}
                {currentRun ? ` · now: ${currentRun.provider}` : ""}
              </span>
              <span className="tabular-nums">
                {Math.round(batchProgress * 100)}%
              </span>
            </div>
            <ProgressBar
              value={batchProgress}
              tone={
                updateActive
                  ? "running"
                  : batchFailed > 0
                    ? "failed"
                    : "success"
              }
              className="h-3"
            />
            <div className="flex flex-wrap gap-1.5">
              {latestBatch.map((run) => (
                <span
                  key={run.id}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs",
                    run.status === "SUCCEEDED" &&
                      "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300",
                    run.status === "FAILED" &&
                      "border-red-300 text-red-800 dark:border-red-800 dark:text-red-300",
                    run.status === "RUNNING" &&
                      "border-blue-300 text-blue-800 dark:border-blue-800 dark:text-blue-300",
                    run.status === "QUEUED" &&
                      "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400",
                  )}
                >
                  {run.provider}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {countrySections.map(({ country, providers }) => (
        <section key={country} className="space-y-3">
          <h2 className="text-lg font-semibold">
            {COUNTRY_LABELS[country]}{" "}
            <span className="text-sm font-normal text-slate-500">
              {providers.length}{" "}
              {providers.length === 1 ? "provider" : "providers"}
            </span>
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {providers.map(({ provider, runs, cinemasByCountry }) => (
              <ProviderCard
                key={provider}
                provider={provider}
                runs={runs}
                cinemaCount={cinemasByCountry.get(country) ?? 0}
                updateActive={updateActive}
                now={now}
              />
            ))}
          </div>
        </section>
      ))}

      {providersWithoutCinemas.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Without cinemas</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {providersWithoutCinemas.map(({ provider, runs }) => (
              <ProviderCard
                key={provider}
                provider={provider}
                runs={runs}
                cinemaCount={0}
                updateActive={updateActive}
                now={now}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
