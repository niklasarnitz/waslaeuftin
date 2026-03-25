import { db } from "@waslaeuftin/server/db";
import { fetchCineStarCatalog } from "./fetchCineStarCatalog";
import { fetchCineplexCatalog } from "./fetchCineplexCatalog";
import { fetchComtradaCineOrderCatalog } from "./fetchComtradaCineOrderCatalog";
import { fetchKinoHeldCatalog } from "./fetchKinoHeldCatalog";
import { fetchKinoTicketsExpressCatalog } from "./fetchKinoTicketsExpressCatalog";
import { fetchPremiumKinoCatalog } from "./fetchPremiumKinoCatalog";
import { fetchCineplexxATCatalog } from "./fetchCineplexxATMovies";
import { resolveAndPersistCatalog } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";
import { ProviderCatalog } from "@waslaeuftin/types/ProviderCatalog";

type ProviderFetcher = {
    name: string;
    fetch: () => Promise<ProviderCatalog>;
};

const providerFetchers: ProviderFetcher[] = [
    { name: "CineStar", fetch: fetchCineStarCatalog },
    { name: "Cineplex", fetch: fetchCineplexCatalog },
    { name: "ComtradaCineOrder", fetch: fetchComtradaCineOrderCatalog },
    { name: "KinoHeld", fetch: fetchKinoHeldCatalog },
    { name: "KinoTicketsExpress", fetch: fetchKinoTicketsExpressCatalog },
    { name: "PremiumKino", fetch: fetchPremiumKinoCatalog },
    { name: "CineplexxAT", fetch: fetchCineplexxATCatalog }
];

// --- CLI Logic ---
const requestedProviderName = process.argv[2];
let providersToUpdate = providerFetchers;

if (requestedProviderName) {
    providersToUpdate = providerFetchers.filter(
        (p) => p.name.toLowerCase() === requestedProviderName.toLowerCase()
    );

    if (providersToUpdate.length === 0) {
        console.error(`Unknown provider: "${requestedProviderName}"`);
        console.info(`Available providers: ${providerFetchers.map(p => p.name).join(", ")}`);
        process.exit(1);
    }
}
// -----------------

const pushoverToken = process.env.PUSHOVER_TOKEN ?? process.env.PUSHOVER_APP_TOKEN;
const pushoverUser = process.env.PUSHOVER_USER ?? process.env.PUSHOVER_USER_KEY;
const MAX_PUSHOVER_MESSAGE_LENGTH = 1_000;
const MAX_PUSHOVER_TITLE_LENGTH = 250;

const formatOutputForPushover = (output: string) => {
    const normalizedOutput = output.replace(/\r/g, "").trim();
    if (normalizedOutput.length === 0) return "No script output available.";
    if (normalizedOutput.length <= MAX_PUSHOVER_MESSAGE_LENGTH) return normalizedOutput;
    const maxTailLength = MAX_PUSHOVER_MESSAGE_LENGTH - 40;
    return `...\n${normalizedOutput.slice(-maxTailLength)}`;
};

const sendPushoverNotification = async (title: string, message: string) => {
    if (!pushoverToken || !pushoverUser) {
        console.warn("Pushover credentials missing. Skipping notification.");
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
        console.error("Failed to send Pushover notification:", await response.text());
    }
};

const failedProviders: string[] = [];
const catalogs: ProviderCatalog[] = [];

try {
    console.info(`[Update] Starting update for ${providersToUpdate.length} provider(s)...`);

    for (const [index, provider] of providersToUpdate.entries()) {
        console.info(
            `[Update] Fetching ${provider.name} (${index + 1}/${providersToUpdate.length})`,
        );

        try {
            const catalog = await provider.fetch();
            catalogs.push(catalog);
            console.info(
                `[Update] ${provider.name} done: ${catalog.movies.length} movies, ${catalog.showings.length} showings`,
            );
        } catch (error) {
            failedProviders.push(provider.name);
            const errorOutput = error instanceof Error ? (error.stack ?? error.message) : String(error);
            const message = [
                `Provider fetch failed: ${provider.name}`,
                "Output:",
                formatOutputForPushover(errorOutput),
            ].join("\n");

            await sendPushoverNotification("Movie Update Failed", message);
            console.error(message);
        }
    }

    if (catalogs.length === 0) {
        throw new Error("No data fetched. Check provider errors.");
    }

    console.info(`[Update] Starting title resolution and DB write...`);
    const result = await resolveAndPersistCatalog(catalogs);

    console.info(
        `[Update] Summary: ${result.canonicalMovies} movies, ${result.totalShowings} showings, ` +
        `${result.tmdbMatched} TMDB matched, ${result.tmdbUnmatched} unmatched`
    );

    if (failedProviders.length > 0) {
        process.exit(1);
    }

    console.info("Update finished successfully.");
} catch (err) {
    console.error("Critical error during update:", err);
    process.exit(1);
} finally {
    await db.$disconnect();
}
