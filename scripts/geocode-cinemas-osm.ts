import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { db } from "@waslaeuftin/server/db";

type NominatimItem = {
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  importance?: number;
  place_rank?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

type Candidate = {
  result: NominatimItem;
  score: number;
  reason: string;
};

type RunMode = "agent" | "interactive";
type ProgressFormat = "text" | "json";

type CliOptions = {
  mode: RunMode;
  dryRun: boolean;
  limit?: number;
  minScore: number;
  delayMs: number;
  progressFormat: ProgressFormat;
};

type ProgressUpdate = {
  format: ProgressFormat;
  successCount: number;
  processedCount: number;
  totalCount: number;
  cinemaId: number;
  cinemaName: string;
  cityName: string;
  score: number;
  mode: "high-confidence" | "agent" | "manual";
  dryRun: boolean;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value: string) =>
  new Set(
    normalize(value)
      .split(" ")
      .map((token) => token.trim())
      .filter(Boolean),
  );

const jaccardSimilarity = (left: Set<string>, right: Set<string>) => {
  if (left.size === 0 && right.size === 0) return 1;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }

  const union = new Set([...left, ...right]).size;

  return union === 0 ? 0 : intersection / union;
};

const getCityLabel = (item: NominatimItem) => {
  return (
    item.address?.city ??
    item.address?.town ??
    item.address?.village ??
    item.address?.municipality ??
    ""
  );
};

const scoreCandidate = (
  cinemaName: string,
  cityName: string,
  item: NominatimItem,
): Candidate => {
  const cinemaTokens = tokenize(cinemaName);
  const cityTokens = tokenize(cityName);
  const displayTokens = tokenize(item.display_name);
  const resultCityTokens = tokenize(getCityLabel(item));

  const nameScore = jaccardSimilarity(cinemaTokens, displayTokens);
  const cityScore =
    resultCityTokens.size > 0
      ? jaccardSimilarity(cityTokens, resultCityTokens)
      : jaccardSimilarity(cityTokens, displayTokens);

  const importance = item.importance ?? 0;

  const isLikelyCinema =
    item.class === "amenity" &&
    (item.type === "cinema" || item.type === "theatre");

  let score = nameScore * 0.65 + cityScore * 0.25 + Math.min(importance, 1) * 0.1;

  if (isLikelyCinema) {
    score += 0.15;
  }

  if (item.display_name.toLowerCase().includes("kino")) {
    score += 0.05;
  }

  score = Math.min(score, 1);

  return {
    result: item,
    score,
    reason: `name=${nameScore.toFixed(2)} city=${cityScore.toFixed(2)} importance=${importance.toFixed(2)} type=${item.class ?? "?"}/${item.type ?? "?"}`,
  };
};

const fetchCandidates = async (cinemaName: string, cityName: string) => {
  const query = `${cinemaName}, ${cityName}`;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "waslaeuftin-geocoder/1.0 (contact: github.com/niklasarnitz/waslaeuftin)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed (${response.status})`);
  }

  const data = (await response.json()) as NominatimItem[];

  return data;
};

const formatCandidate = (candidate: Candidate, index: number) => {
  const city = getCityLabel(candidate.result);
  return `${index + 1}. score=${candidate.score.toFixed(2)} lat=${candidate.result.lat} lon=${candidate.result.lon}\n   ${candidate.result.display_name}\n   city=${city || "?"} ${candidate.reason}`;
};

const HIGH_CONFIDENCE_THRESHOLD = 0.82;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.65;

const printUsage = () => {
  console.log(`
Usage: bun run scripts/geocode-cinemas-osm.ts [options]

Options:
  --mode <agent|interactive>     Run non-interactive for LLM agents (default: agent)
  --limit <n>                    Process only the first n cinemas without geotags
  --min-score <0..1>             In agent mode: minimum score for auto-accepting best candidate (default: 0.65)
  --delay-ms <n>                 Delay between Nominatim requests in milliseconds (default: 1100)
  --progress-format <text|json>  Progress output format after each successful tagging (default: text)
  --dry-run                      Do not persist coordinates, only simulate decisions
  --help                         Show this help

Examples:
  bun run scripts/geocode-cinemas-osm.ts --mode agent --limit 25
  bun run scripts/geocode-cinemas-osm.ts --mode agent --progress-format json --min-score 0.72
  bun run scripts/geocode-cinemas-osm.ts --mode interactive
`);
};

const parseIntOption = (value: string, optionName: string) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for --${optionName}: ${value}`);
  }

  return parsed;
};

const parseNumberOption = (value: string, optionName: string) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid value for --${optionName}: ${value}`);
  }

  return parsed;
};

const parseCliOptions = (args: string[]): CliOptions => {
  const options: CliOptions = {
    mode: "agent",
    dryRun: false,
    limit: undefined,
    minScore: MEDIUM_CONFIDENCE_THRESHOLD,
    delayMs: 1100,
    progressFormat: "text",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg) {
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--mode" || arg.startsWith("--mode=")) {
      const value = arg.startsWith("--mode=") ? arg.split("=")[1] : args[index + 1];

      if (!value) {
        throw new Error("Missing value for --mode");
      }

      if (arg === "--mode") {
        index += 1;
      }

      if (value !== "agent" && value !== "interactive") {
        throw new Error(`Invalid value for --mode: ${value}`);
      }

      options.mode = value;
      continue;
    }

    if (arg === "--limit" || arg.startsWith("--limit=")) {
      const value = arg.startsWith("--limit=") ? arg.split("=")[1] : args[index + 1];

      if (!value) {
        throw new Error("Missing value for --limit");
      }

      if (arg === "--limit") {
        index += 1;
      }

      options.limit = parseIntOption(value, "limit");
      continue;
    }

    if (arg === "--min-score" || arg.startsWith("--min-score=")) {
      const value = arg.startsWith("--min-score=")
        ? arg.split("=")[1]
        : args[index + 1];

      if (!value) {
        throw new Error("Missing value for --min-score");
      }

      if (arg === "--min-score") {
        index += 1;
      }

      options.minScore = parseNumberOption(value, "min-score");

      if (options.minScore < 0 || options.minScore > 1) {
        throw new Error(`--min-score must be between 0 and 1, got ${value}`);
      }

      continue;
    }

    if (arg === "--delay-ms" || arg.startsWith("--delay-ms=")) {
      const value = arg.startsWith("--delay-ms=")
        ? arg.split("=")[1]
        : args[index + 1];

      if (!value) {
        throw new Error("Missing value for --delay-ms");
      }

      if (arg === "--delay-ms") {
        index += 1;
      }

      options.delayMs = parseIntOption(value, "delay-ms");
      continue;
    }

    if (
      arg === "--progress-format" ||
      arg.startsWith("--progress-format=")
    ) {
      const value = arg.startsWith("--progress-format=")
        ? arg.split("=")[1]
        : args[index + 1];

      if (!value) {
        throw new Error("Missing value for --progress-format");
      }

      if (arg === "--progress-format") {
        index += 1;
      }

      if (value !== "text" && value !== "json") {
        throw new Error(`Invalid value for --progress-format: ${value}`);
      }

      options.progressFormat = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

const toCoordinates = (candidate: Candidate) => {
  const latitude = Number(candidate.result.lat);
  const longitude = Number(candidate.result.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Candidate coordinates are invalid");
  }

  return { latitude, longitude };
};

const persistCoordinates = async (
  cinemaId: number,
  latitude: number,
  longitude: number,
  dryRun: boolean,
) => {
  if (dryRun) {
    return;
  }

  await db.cinema.update({
    where: { id: cinemaId },
    data: {
      latitude,
      longitude,
    },
  });
};

const emitProgressUpdate = ({
  format,
  successCount,
  processedCount,
  totalCount,
  cinemaId,
  cinemaName,
  cityName,
  score,
  mode,
  dryRun,
}: ProgressUpdate) => {
  const percentage = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

  if (format === "json") {
    console.log(
      JSON.stringify({
        event: "tagging-progress",
        successCount,
        processedCount,
        totalCount,
        percentage: Number(percentage.toFixed(2)),
        cinemaId,
        cinemaName,
        cityName,
        score: Number(score.toFixed(3)),
        mode,
        dryRun,
      }),
    );
    return;
  }

  console.log(
    `  Progress: ${successCount}/${totalCount} successful (${percentage.toFixed(1)}%) · processed ${processedCount}/${totalCount} · mode=${mode}${dryRun ? " [dry-run]" : ""}`,
  );
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  let rl: ReturnType<typeof readline.createInterface> | null = null;

  try {
    const options = parseCliOptions(args);

    if (options.mode === "interactive") {
      rl = readline.createInterface({ input, output });
    }

    const cinemas = await db.cinema.findMany({
      where: {
        OR: [{ latitude: null }, { longitude: null }],
      },
      include: {
        city: {
          select: { name: true },
        },
      },
      orderBy: { id: "asc" },
      take: options.limit,
    });

    console.log(
      `Found ${cinemas.length} cinemas without geolocation (mode=${options.mode}${options.dryRun ? ", dry-run" : ""}).`,
    );

    let autoUpdated = 0;
    let agentUpdated = 0;
    let manuallyUpdated = 0;
    let successfulTaggings = 0;
    let skipped = 0;
    let failed = 0;

    for (const [index, cinema] of cinemas.entries()) {
      const processedCount = index + 1;

      console.log(`\n[${cinema.id}] ${cinema.name} (${cinema.city.name})`);

      try {
        const nominatimResults = await fetchCandidates(cinema.name, cinema.city.name);

        await delay(options.delayMs);

        if (nominatimResults.length === 0) {
          console.log("  No OSM candidate found.");
          skipped += 1;
          continue;
        }

        const candidates = nominatimResults
          .map((item) => scoreCandidate(cinema.name, cinema.city.name, item))
          .sort((a, b) => b.score - a.score);

        const [bestCandidate, secondCandidate] = candidates;

        if (!bestCandidate) {
          skipped += 1;
          continue;
        }

        const confidenceGap = secondCandidate
          ? bestCandidate.score - secondCandidate.score
          : bestCandidate.score;

        const isHighConfidence =
          bestCandidate.score >= HIGH_CONFIDENCE_THRESHOLD && confidenceGap >= 0.08;

        if (isHighConfidence) {
          const { latitude, longitude } = toCoordinates(bestCandidate);
          await persistCoordinates(cinema.id, latitude, longitude, options.dryRun);

          console.log(
            `  Auto-updated with high confidence (${bestCandidate.score.toFixed(2)}): ${bestCandidate.result.display_name}`,
          );
          autoUpdated += 1;
          successfulTaggings += 1;

          emitProgressUpdate({
            format: options.progressFormat,
            successCount: successfulTaggings,
            processedCount,
            totalCount: cinemas.length,
            cinemaId: cinema.id,
            cinemaName: cinema.name,
            cityName: cinema.city.name,
            score: bestCandidate.score,
            mode: "high-confidence",
            dryRun: options.dryRun,
          });
          continue;
        }

        console.log("  Low confidence candidates:");
        const topCandidates = candidates.slice(0, 3);
        topCandidates.forEach((candidate, candidateIndex) => {
          console.log(`  ${formatCandidate(candidate, candidateIndex)}`);
        });

        if (bestCandidate.score < MEDIUM_CONFIDENCE_THRESHOLD) {
          console.log("  Best candidate below medium threshold.");
        }

        if (options.mode === "agent") {
          if (bestCandidate.score < options.minScore) {
            console.log(
              `  Agent mode skip: best score ${bestCandidate.score.toFixed(2)} below --min-score ${options.minScore.toFixed(2)}.`,
            );
            skipped += 1;
            continue;
          }

          const { latitude, longitude } = toCoordinates(bestCandidate);
          await persistCoordinates(cinema.id, latitude, longitude, options.dryRun);

          console.log(
            `  Agent-updated with score ${bestCandidate.score.toFixed(2)}: ${bestCandidate.result.display_name}`,
          );
          agentUpdated += 1;
          successfulTaggings += 1;

          emitProgressUpdate({
            format: options.progressFormat,
            successCount: successfulTaggings,
            processedCount,
            totalCount: cinemas.length,
            cinemaId: cinema.id,
            cinemaName: cinema.name,
            cityName: cinema.city.name,
            score: bestCandidate.score,
            mode: "agent",
            dryRun: options.dryRun,
          });
          continue;
        }

        if (!rl) {
          throw new Error("Readline interface not initialized for interactive mode");
        }

        const answer = (
          await rl.question(
            "  Choose candidate [1-3] (Enter = 1), 's' to skip, 'q' to quit: ",
          )
        )
          .trim()
          .toLowerCase();

        if (answer === "q") {
          console.log("Stopping early by user request.");
          break;
        }

        if (answer === "s") {
          skipped += 1;
          continue;
        }

        const selectedIndex = answer === "" ? 0 : Number(answer) - 1;
        const selected = topCandidates[selectedIndex];

        if (!selected) {
          console.log("  Invalid selection, skipping.");
          skipped += 1;
          continue;
        }

        const { latitude, longitude } = toCoordinates(selected);
        await persistCoordinates(cinema.id, latitude, longitude, options.dryRun);

        manuallyUpdated += 1;
        successfulTaggings += 1;
        console.log(
          `  Updated manually with score ${selected.score.toFixed(2)}: ${selected.result.display_name}`,
        );

        emitProgressUpdate({
          format: options.progressFormat,
          successCount: successfulTaggings,
          processedCount,
          totalCount: cinemas.length,
          cinemaId: cinema.id,
          cinemaName: cinema.name,
          cityName: cinema.city.name,
          score: selected.score,
          mode: "manual",
          dryRun: options.dryRun,
        });
      } catch (error) {
        failed += 1;
        console.error(`  Failed: ${(error as Error).message}`);
        await delay(options.delayMs);
      }
    }

    console.log("\nSummary");
    console.log(`  High confidence updated: ${autoUpdated}`);
    console.log(`  Agent updated:           ${agentUpdated}`);
    console.log(`  Manual updated:          ${manuallyUpdated}`);
    console.log(`  Successful taggings:     ${successfulTaggings}`);
    console.log(`  Skipped:                 ${skipped}`);
    console.log(`  Failed:                  ${failed}`);
  } finally {
    rl?.close();
    await db.$disconnect();
  }
};

await main();
