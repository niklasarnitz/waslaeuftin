import {
  getMovieIdentitySnapshot,
  syncTmdbMovieCoversForNewMovies,
} from "./syncTmdbMovieCovers";
import { db } from "@waslaeuftin/server/db";

type UpdateScript = {
  name: string;
  path: string;
};

type ScriptResult = {
  exitCode: number;
  output: string;
};

const decoder = new TextDecoder();

const streamToConsoleAndCapture = async (
  stream: ReadableStream<Uint8Array>,
  write: (text: string) => void,
): Promise<string> => {
  const reader = stream.getReader();
  let capturedOutput = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      capturedOutput += chunk;
      write(chunk);
    }

    const tail = decoder.decode();
    if (tail.length > 0) {
      capturedOutput += tail;
      write(tail);
    }
  } finally {
    reader.releaseLock();
  }

  return capturedOutput;
};

const updateScripts: UpdateScript[] = [
  {
    name: "CineStar",
    path: "scripts/update-movies/updateCineStarMovies.ts",
  },
  {
    name: "Cineplex",
    path: "scripts/update-movies/updateCineplexMovies.ts",
  },
  {
    name: "Comtrada CineOrder",
    path: "scripts/update-movies/updateComtradaCineOrderMovies.ts",
  },
  {
    name: "KinoHeld",
    path: "scripts/update-movies/updateKinoHeldMovies.ts",
  },
  {
    name: "KinoTicketsExpress",
    path: "scripts/update-movies/updateKinoTicketsExpress.ts",
  },
  {
    name: "PremiumKino",
    path: "scripts/update-movies/updatePremiumKinoMovies.ts",
  },
];

const pushoverToken =
  process.env.PUSHOVER_TOKEN ?? process.env.PUSHOVER_APP_TOKEN;
const pushoverUser = process.env.PUSHOVER_USER ?? process.env.PUSHOVER_USER_KEY;

const MAX_PUSHOVER_MESSAGE_LENGTH = 1_000;
const MAX_PUSHOVER_TITLE_LENGTH = 250;

const formatOutputForPushover = (output: string) => {
  const normalizedOutput = output.replace(/\r/g, "").trim();

  if (normalizedOutput.length === 0) {
    return "No script output available.";
  }

  if (normalizedOutput.length <= MAX_PUSHOVER_MESSAGE_LENGTH) {
    return normalizedOutput;
  }

  const maxTailLength = MAX_PUSHOVER_MESSAGE_LENGTH - 40;

  return `...\n${normalizedOutput.slice(-maxTailLength)}`;
};

const sendPushoverNotification = async (title: string, message: string) => {
  if (!pushoverToken || !pushoverUser) {
    console.warn(
      "Pushover credentials are missing. Set PUSHOVER_TOKEN and PUSHOVER_USER to enable notifications.",
    );
    return;
  }

  const body = new URLSearchParams({
    token: pushoverToken,
    user: pushoverUser,
    title: title.slice(0, MAX_PUSHOVER_TITLE_LENGTH),
    message,
  });

  const response = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const errorResponse = await response.text();
    console.error("Failed to send Pushover notification:", errorResponse);
  }
};

const runUpdateScript = async (script: UpdateScript): Promise<ScriptResult> => {
  const processHandle = Bun.spawn(["bun", "run", script.path], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    streamToConsoleAndCapture(processHandle.stdout, (chunk) => {
      process.stdout.write(chunk);
    }),
    streamToConsoleAndCapture(processHandle.stderr, (chunk) => {
      process.stderr.write(chunk);
    }),
  ]);

  const exitCode = await processHandle.exited;

  return {
    exitCode,
    output: [stdout, stderr].filter(Boolean).join("\n").trim(),
  };
};

const failedScripts: string[] = [];
const totalScripts = updateScripts.length;
const existingMovieKeys = await getMovieIdentitySnapshot();

try {
  for (const [index, script] of updateScripts.entries()) {
    console.info(
      `[UpdateAll] Starting ${script.name} (${index + 1}/${totalScripts}) (${script.path})`,
    );

    try {
      const result = await runUpdateScript(script);

      if (result.exitCode === 0) {
        console.info(
          `[UpdateAll] Finished ${script.name} successfully (${index + 1}/${totalScripts})`,
        );
        continue;
      }

      failedScripts.push(script.name);

      const message = [
        `Script failed: ${script.path}`,
        `Exit code: ${result.exitCode}`,
        "Output:",
        formatOutputForPushover(result.output),
      ].join("\n");

      await sendPushoverNotification("Movie Update Failed", message);
      console.error(message);
    } catch (error) {
      failedScripts.push(script.name);

      const errorOutput =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      const message = [
        `Script crashed: ${script.path}`,
        "Output:",
        formatOutputForPushover(errorOutput),
      ].join("\n");

      await sendPushoverNotification("Movie Update Failed", message);
      console.error(message);
    }
  }

  if (failedScripts.length > 0) {
    const failureMessage = `Movie updates finished with failures: ${failedScripts.join(", ")}`;
    console.error(failureMessage);
    throw new Error(failureMessage);
  }

  const coverSyncResult = await syncTmdbMovieCoversForNewMovies(existingMovieKeys);
  console.info(
    `[UpdateAll] TMDB cover sync finished: updated=${coverSyncResult.updatedMovies}, considered=${coverSyncResult.consideredMovies}, skippedExistingCover=${coverSyncResult.skippedExistingCover}, lowConfidence=${coverSyncResult.skippedLowConfidence}, noPoster=${coverSyncResult.skippedNoPoster}, noMatch=${coverSyncResult.skippedNoTmdbMatch}`,
  );

  console.info("Movie updates finished successfully.");
} finally {
  await db.$disconnect();
}
