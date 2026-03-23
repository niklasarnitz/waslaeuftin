import { db } from "@waslaeuftin/server/db";

type CinemaLite = {
  id: number;
  name: string;
  slug: string;
  providers: string[];
  recentMovies7d: number;
};

type DuplicateCandidate = {
  left: CinemaLite;
  right: CinemaLite;
  score: number;
  levenshteinSimilarity: number;
  diceSimilarity: number;
  tokenSimilarity: number;
};

const DEFAULT_THRESHOLD = 0.82;
const RECENT_MOVIES_WINDOW_DAYS = 7;

const GENERIC_TOKENS = new Set([
  "cinema",
  "cinemas",
  "cine",
  "cinestar",
  "cineplex",
  "cinemaxx",
  "kino",
  "kinozentrum",
  "kinocenter",
  "filmtheater",
]);

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value: string) => normalizeName(value).split(" ").filter(Boolean);

const tokenizeMeaningful = (value: string) =>
  tokenize(value).filter((token) => !GENERIC_TOKENS.has(token));

const jaccardSimilarity = (left: string[], right: string[]) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);

  if (leftSet.size === 0 && rightSet.size === 0) {
    return 1;
  }

  let intersectionSize = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersectionSize += 1;
    }
  }

  const unionSize = new Set([...leftSet, ...rightSet]).size;

  return unionSize === 0 ? 0 : intersectionSize / unionSize;
};

const getBigrams = (value: string) => {
  const compact = normalizeName(value).replace(/\s/g, "");

  if (compact.length < 2) {
    return compact.length === 0 ? [] : [compact];
  }

  const bigrams: string[] = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    bigrams.push(compact.slice(index, index + 2));
  }

  return bigrams;
};

const diceSimilarity = (left: string, right: string) => {
  const leftBigrams = getBigrams(left);
  const rightBigrams = getBigrams(right);

  if (leftBigrams.length === 0 && rightBigrams.length === 0) {
    return 1;
  }

  if (leftBigrams.length === 0 || rightBigrams.length === 0) {
    return 0;
  }

  const rightCounter = new Map<string, number>();
  for (const bigram of rightBigrams) {
    rightCounter.set(bigram, (rightCounter.get(bigram) ?? 0) + 1);
  }

  let intersection = 0;
  for (const bigram of leftBigrams) {
    const amount = rightCounter.get(bigram) ?? 0;
    if (amount > 0) {
      intersection += 1;
      rightCounter.set(bigram, amount - 1);
    }
  }

  return (2 * intersection) / (leftBigrams.length + rightBigrams.length);
};

const levenshteinDistance = (left: string, right: string) => {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  const previousRow = new Array<number>(right.length + 1);
  const currentRow = new Array<number>(right.length + 1);

  for (let column = 0; column <= right.length; column += 1) {
    previousRow[column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    currentRow[0] = row;

    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;

      currentRow[column] = Math.min(
        (currentRow[column - 1] ?? 0) + 1,
        (previousRow[column] ?? 0) + 1,
        (previousRow[column - 1] ?? 0) + substitutionCost,
      );
    }

    for (let column = 0; column <= right.length; column += 1) {
      previousRow[column] = currentRow[column] ?? 0;
    }
  }

  return previousRow[right.length] ?? 0;
};

const normalizedLevenshteinSimilarity = (left: string, right: string) => {
  const normalizedLeft = normalizeName(left);
  const normalizedRight = normalizeName(right);

  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);

  if (maxLength === 0) {
    return 1;
  }

  const distance = levenshteinDistance(normalizedLeft, normalizedRight);

  return 1 - distance / maxLength;
};

const calculateSimilarity = (left: string, right: string) => {
  const leftMeaningfulTokens = tokenizeMeaningful(left);
  const rightMeaningfulTokens = tokenizeMeaningful(right);

  const tokenSimilarity =
    leftMeaningfulTokens.length > 0 && rightMeaningfulTokens.length > 0
      ? jaccardSimilarity(leftMeaningfulTokens, rightMeaningfulTokens)
      : jaccardSimilarity(tokenize(left), tokenize(right));

  const levenshteinSimilarity = normalizedLevenshteinSimilarity(left, right);
  const charSimilarity = diceSimilarity(left, right);

  const leftNormalized = normalizeName(left);
  const rightNormalized = normalizeName(right);
  const hasSubstringBoost =
    leftNormalized.includes(rightNormalized) || rightNormalized.includes(leftNormalized);

  const score = Math.min(
    1,
    levenshteinSimilarity * 0.45 +
      charSimilarity * 0.35 +
      tokenSimilarity * 0.2 +
      (hasSubstringBoost ? 0.08 : 0),
  );

  return {
    score,
    levenshteinSimilarity,
    diceSimilarity: charSimilarity,
    tokenSimilarity,
  };
};

const getArgument = (name: string) => {
  const prefixed = `--${name}=`;
  const argument = process.argv.slice(2).find((arg) => arg.startsWith(prefixed));

  return argument ? argument.slice(prefixed.length) : undefined;
};

const getProvidersForCinema = (cinema: {
  isKinoTicketsExpress: boolean | null;
  kinoHeldCinemasMetadataId: number | null;
  comtradaCineOrderMetadataId: number | null;
  cinemaxxVueCinemasMetadataId: number | null;
  premiumKinoSubdomain: string | null;
  cineStarCinemaId: number | null;
  cineplexCinemaId: string | null;
  myVueCinemaId: string | null;
}) => {
  const providers: string[] = [];

  if (cinema.kinoHeldCinemasMetadataId) {
    providers.push("kinoheld");
  }

  if (cinema.comtradaCineOrderMetadataId) {
    providers.push("comtrada-cineorder");
  }

  if (cinema.cinemaxxVueCinemasMetadataId) {
    providers.push("cinemaxx-vue");
  }

  if (cinema.premiumKinoSubdomain) {
    providers.push("premiumkino");
  }

  if (cinema.cineStarCinemaId) {
    providers.push("cinestar");
  }

  if (cinema.cineplexCinemaId) {
    providers.push("cineplex");
  }

  if (cinema.myVueCinemaId) {
    providers.push("myvue");
  }

  if (cinema.isKinoTicketsExpress) {
    providers.push("kino-ticket-express");
  }

  return providers.length > 0 ? providers : ["unknown"];
};

const main = async () => {
  const thresholdArg = getArgument("threshold");
  const threshold = thresholdArg ? Number(thresholdArg) : DEFAULT_THRESHOLD;

  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error("Invalid --threshold value. Please use a number between 0 and 1.");
  }

  const cityFilter = getArgument("city")?.trim();
  const recentMoviesSince = new Date(
    Date.now() - RECENT_MOVIES_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const cities = await db.city.findMany({
    where: cityFilter
      ? {
          name: {
            contains: cityFilter,
            mode: "insensitive",
          },
        }
      : undefined,
    include: {
      cinemas: {
        select: {
          id: true,
          name: true,
          slug: true,
          isKinoTicketsExpress: true,
          kinoHeldCinemasMetadataId: true,
          comtradaCineOrderMetadataId: true,
          cinemaxxVueCinemasMetadataId: true,
          premiumKinoSubdomain: true,
          cineStarCinemaId: true,
          cineplexCinemaId: true,
          myVueCinemaId: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const cinemaIds = cities.flatMap((city) => city.cinemas.map((cinema) => cinema.id));

  const recentMoviesCountByCinemaId = new Map<number, number>();

  if (cinemaIds.length > 0) {
    const recentShowingCounts = await db.showing.groupBy({
      by: ["cinemaId"],
      where: {
        cinemaId: {
          in: cinemaIds,
        },
        createdAt: {
          gte: recentMoviesSince,
        },
      },
      _count: {
        _all: true,
      },
    });

    for (const recentShowingCount of recentShowingCounts) {
      recentMoviesCountByCinemaId.set(recentShowingCount.cinemaId, recentShowingCount._count._all);
    }
  }

  let comparedPairs = 0;
  let duplicatePairCount = 0;

  console.log(`Threshold: ${threshold.toFixed(2)}`);
  if (cityFilter) {
    console.log(`City filter: ${cityFilter}`);
  }
  console.log(`Recent movies window: ${RECENT_MOVIES_WINDOW_DAYS} days`);
  console.log(`Loaded ${cities.length} cities.`);

  for (const city of cities) {
    if (city.cinemas.length < 2) {
      continue;
    }

    const cityCinemas: CinemaLite[] = city.cinemas.map((cinema) => ({
      id: cinema.id,
      name: cinema.name,
      slug: cinema.slug,
      providers: getProvidersForCinema(cinema),
      recentMovies7d: recentMoviesCountByCinemaId.get(cinema.id) ?? 0,
    }));

    const candidates: DuplicateCandidate[] = [];

    for (let leftIndex = 0; leftIndex < cityCinemas.length - 1; leftIndex += 1) {
      const left = cityCinemas[leftIndex];

      if (!left) {
        continue;
      }

      for (
        let rightIndex = leftIndex + 1;
        rightIndex < cityCinemas.length;
        rightIndex += 1
      ) {
        const right = cityCinemas[rightIndex];

        if (!right) {
          continue;
        }

        comparedPairs += 1;

        const similarity = calculateSimilarity(left.name, right.name);

        if (similarity.score >= threshold) {
          candidates.push({
            left,
            right,
            score: similarity.score,
            levenshteinSimilarity: similarity.levenshteinSimilarity,
            diceSimilarity: similarity.diceSimilarity,
            tokenSimilarity: similarity.tokenSimilarity,
          });
        }
      }
    }

    if (candidates.length === 0) {
      continue;
    }

    duplicatePairCount += candidates.length;

    candidates.sort((a, b) => b.score - a.score);

    console.log(`\n=== ${city.name} ===`);
    for (const candidate of candidates) {
      console.log(
        `${candidate.score.toFixed(2)} | [${candidate.left.id}] ${candidate.left.name} (${candidate.left.providers.join(", ")}, movies<7d=${candidate.left.recentMovies7d}) <-> [${candidate.right.id}] ${candidate.right.name} (${candidate.right.providers.join(", ")}, movies<7d=${candidate.right.recentMovies7d})`,
      );
      console.log(
        `  lev=${candidate.levenshteinSimilarity.toFixed(2)} dice=${candidate.diceSimilarity.toFixed(2)} token=${candidate.tokenSimilarity.toFixed(2)}`,
      );
    }
  }

  if (duplicatePairCount === 0) {
    console.log("\nNo likely duplicate cinemas found for the selected threshold.");
  }

  console.log("\nSummary");
  console.log(`Compared cinema pairs: ${comparedPairs}`);
  console.log(`Likely duplicate pairs: ${duplicatePairCount}`);
};

try {
  await main();
} finally {
  await db.$disconnect();
}
