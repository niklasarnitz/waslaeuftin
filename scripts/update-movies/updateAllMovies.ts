import { db } from "@waslaeuftin/server/db";
import {
    type ProviderCatalog,
    resolveAndPersistCatalog,
} from "./resolveMovieTitles";
import { fetchCineStarCatalog } from "./fetchCineStarCatalog";
import { fetchCineplexCatalog } from "./fetchCineplexCatalog";
import { fetchComtradaCineOrderCatalog } from "./fetchComtradaCineOrderCatalog";
import { fetchKinoHeldCatalog } from "./fetchKinoHeldCatalog";
import { fetchKinoTicketsExpressCatalog } from "./fetchKinoTicketsExpressCatalog";
import { fetchPremiumKinoCatalog } from "./fetchPremiumKinoCatalog";

type ProviderFetcher = {
    name: string;
    fetch: () => Promise<ProviderCatalog>;
};

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

const providerFetchers: ProviderFetcher[] = [
    { name: "CineStar", fetch: fetchCineStarCatalog },
    { name: "Cineplex", fetch: fetchCineplexCatalog },
    { name: "Comtrada CineOrder", fetch: fetchComtradaCineOrderCatalog },
    { name: "KinoHeld", fetch: fetchKinoHeldCatalog },
    { name: "KinoTicketsExpress", fetch: fetchKinoTicketsExpressCatalog },
    { name: "PremiumKino", fetch: fetchPremiumKinoCatalog },
];

const failedProviders: string[] = [];
const catalogs: ProviderCatalog[] = [];

try {
    // Phase 1: Fetch all provider data (no DB writes yet)
    for (const [index, provider] of providerFetchers.entries()) {
        console.info(
            `[UpdateAll] Fetching ${provider.name} (${index + 1}/${providerFetchers.length})`,
        );

        try {
            const catalog = await provider.fetch();
            catalogs.push(catalog);
            console.info(
                `[UpdateAll] ${provider.name} done: ${catalog.movies.length} movies, ${catalog.showings.length} showings`,
            );
        } catch (error) {
            failedProviders.push(provider.name);

            const errorOutput =
                error instanceof Error ? (error.stack ?? error.message) : String(error);
            const message = [
                `Provider fetch failed: ${provider.name}`,
                "Output:",
                formatOutputForPushover(errorOutput),
            ].join("\n");

            await sendPushoverNotification("Movie Update Failed", message);
            console.error(message);
        }
    }

    if (failedProviders.length > 0) {
        console.warn(
            `[UpdateAll] ${failedProviders.length} providers failed: ${failedProviders.join(", ")}. Continuing with successful providers.`,
        );
    }

    if (catalogs.length === 0) {
        throw new Error("All providers failed. No data to process.");
    }

    // Phase 2: Resolve titles via TMDB and persist everything
    console.info(`[UpdateAll] Starting title resolution and DB write...`);
    const result = await resolveAndPersistCatalog(catalogs);

    console.info(
        `[UpdateAll] Done: ${result.canonicalMovies} movies, ${result.totalShowings} showings, ` +
        `${result.tmdbMatched} TMDB matched, ${result.tmdbUnmatched} unmatched, ` +
        `${result.staleMoviesDeleted} stale movies deleted`,
    );

    if (failedProviders.length > 0) {
        const failureMessage = `Movie updates finished with provider failures: ${failedProviders.join(", ")}`;
        console.error(failureMessage);
        throw new Error(failureMessage);
    }

    console.info("Movie updates finished successfully.");
} finally {
    await db.$disconnect();
}
