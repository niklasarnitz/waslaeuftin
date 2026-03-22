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

const main = async () => {
  const rl = readline.createInterface({ input, output });

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
  });

  console.log(`Found ${cinemas.length} cinemas without geolocation.`);

  let autoUpdated = 0;
  let manuallyUpdated = 0;
  let skipped = 0;
  let failed = 0;

  for (const cinema of cinemas) {
    console.log(`\n[${cinema.id}] ${cinema.name} (${cinema.city.name})`);

    try {
      const nominatimResults = await fetchCandidates(cinema.name, cinema.city.name);

      await delay(1100);

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
        await db.cinema.update({
          where: { id: cinema.id },
          data: {
            latitude: Number(bestCandidate.result.lat),
            longitude: Number(bestCandidate.result.lon),
          },
        });

        console.log(
          `  Auto-updated with high confidence (${bestCandidate.score.toFixed(2)}): ${bestCandidate.result.display_name}`,
        );
        autoUpdated += 1;
        continue;
      }

      console.log("  Low confidence candidates:");
      const topCandidates = candidates.slice(0, 3);
      topCandidates.forEach((candidate, index) => {
        console.log(`  ${formatCandidate(candidate, index)}`);
      });

      if (bestCandidate.score < MEDIUM_CONFIDENCE_THRESHOLD) {
        console.log("  Best candidate below medium threshold.");
      }

      const answer = (
        await rl.question(
          "  Choose candidate [1-3], 's' to skip, 'q' to quit: ",
        )
      )
        .trim()
        .toLowerCase();

      if (answer === "q") {
        console.log("Stopping early by user request.");
        break;
      }

      if (answer === "s" || answer === "") {
        skipped += 1;
        continue;
      }

      const selectedIndex = Number(answer) - 1;
      const selected = topCandidates[selectedIndex];

      if (!selected) {
        console.log("  Invalid selection, skipping.");
        skipped += 1;
        continue;
      }

      await db.cinema.update({
        where: { id: cinema.id },
        data: {
          latitude: Number(selected.result.lat),
          longitude: Number(selected.result.lon),
        },
      });

      manuallyUpdated += 1;
      console.log(
        `  Updated manually with score ${selected.score.toFixed(2)}: ${selected.result.display_name}`,
      );
    } catch (error) {
      failed += 1;
      console.error(`  Failed: ${(error as Error).message}`);
      await delay(1200);
    }
  }

  await db.$disconnect();
  rl.close();

  console.log("\nSummary");
  console.log(`  Auto updated:   ${autoUpdated}`);
  console.log(`  Manual updated: ${manuallyUpdated}`);
  console.log(`  Skipped:        ${skipped}`);
  console.log(`  Failed:         ${failed}`);
};

await main();
