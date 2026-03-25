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
    address?: {
        city?: string;
        town?: string;
        village?: string;
        country_code?: string;
    };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const NOMINATIM_DELAY_MS = 50;

const fetchCityCoordinates = async (
    cityName: string,
    countryCode: string,
): Promise<NominatimItem[]> => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("city", cityName);
    url.searchParams.set("countrycodes", countryCode);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");

    const response = await fetch(url, {
        headers: {
            "User-Agent":
                "waslaeuftin-geocoder/1.0 (contact: github.com/niklasarnitz/waslaeuftin)",
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Nominatim request failed (${response.status})`);
    }

    return (await response.json()) as NominatimItem[];
};

const COUNTRY_CODE_MAP: Record<string, string> = {
    GERMANY: "de",
    AUSTRIA: "at",
};

const main = async () => {
    const dryRun = process.argv.includes("--dry-run");

    const rl = readline.createInterface({ input, output });

    try {
        // Step 1: Geocode cities without coordinates
        const cities = await db.city.findMany({
            where: {
                OR: [{ latitude: null }, { longitude: null }],
            },
            orderBy: { id: "asc" },
        });

        console.log(
            `Found ${cities.length} cities without coordinates${dryRun ? " [dry-run]" : ""}.`,
        );

        let citiesUpdated = 0;
        let citiesFailed = 0;

        for (const city of cities) {
            const countryCode = COUNTRY_CODE_MAP[city.country] ?? "de";

            try {
                const results = await fetchCityCoordinates(city.name, countryCode);
                await delay(NOMINATIM_DELAY_MS);

                if (results.length === 0) {
                    console.log(`  [${city.id}] ${city.name}: no result found`);
                    citiesFailed += 1;
                    continue;
                }

                let selected: NominatimItem;

                const allSameCoords = results.every(
                    (r) => r.lat === results[0]!.lat && r.lon === results[0]!.lon,
                );

                if (results.length === 1 || allSameCoords) {
                    selected = results[0]!;
                } else {
                    console.log(`  [${city.id}] ${city.name}:`);
                    for (let i = 0; i < results.length; i++) {
                        const r = results[i]!;
                        console.log(
                            `    ${i + 1}. ${parseFloat(r.lat)}, ${parseFloat(r.lon)} (${r.display_name})`,
                        );
                    }

                    const answer = (
                        await rl.question(
                            `  Choose [1-${results.length}] (Enter = 1), 's' to skip, 'q' to quit: `,
                        )
                    )
                        .trim()
                        .toLowerCase();

                    if (answer === "q") {
                        console.log("Stopping early by user request.");
                        break;
                    }

                    if (answer === "s") {
                        console.log("  Skipped.");
                        citiesFailed += 1;
                        continue;
                    }

                    const selectedIndex = answer === "" ? 0 : Number(answer) - 1;
                    const pick = results[selectedIndex] ?? null;

                    if (!pick) {
                        console.log("  Invalid selection, skipping.");
                        citiesFailed += 1;
                        continue;
                    }

                    selected = pick;
                }

                const selectedLat = parseFloat(selected.lat);
                const selectedLon = parseFloat(selected.lon);

                if (!dryRun) {
                    await db.city.update({
                        where: { id: city.id },
                        data: { latitude: selectedLat, longitude: selectedLon },
                    });
                }

                console.log(
                    `  Updated ${selected.display_name}: ${selectedLat}, ${selectedLon}${dryRun ? " [dry-run]" : ""}`,
                );
                citiesUpdated += 1;
            } catch (error) {
                citiesFailed += 1;
                console.error(
                    `  [${city.id}] ${city.name}: failed - ${(error as Error).message}`,
                );
                await delay(NOMINATIM_DELAY_MS);
            }
        }

        console.log(`\nCities: ${citiesUpdated} updated, ${citiesFailed} failed.`);

        // Step 2: Use city coordinates as fallback for cinemas without coordinates
        const cinemas = await db.cinema.findMany({
            where: {
                OR: [{ latitude: null }, { longitude: null }],
            },
            include: {
                city: {
                    select: { id: true, name: true, latitude: true, longitude: true },
                },
            },
            orderBy: { id: "asc" },
        });

        console.log(
            `\nFound ${cinemas.length} cinemas without coordinates for city fallback.`,
        );

        let cinemasFallback = 0;
        let cinemasSkipped = 0;

        for (const cinema of cinemas) {
            if (cinema.city.latitude == null || cinema.city.longitude == null) {
                console.log(
                    `  [${cinema.id}] ${cinema.name}: city "${cinema.city.name}" has no coordinates, skipping`,
                );
                cinemasSkipped += 1;
                continue;
            }

            if (!dryRun) {
                await db.cinema.update({
                    where: { id: cinema.id },
                    data: {
                        latitude: cinema.city.latitude,
                        longitude: cinema.city.longitude,
                    },
                });
            }

            console.log(
                `  [${cinema.id}] ${cinema.name}: using city "${cinema.city.name}" coords (${cinema.city.latitude}, ${cinema.city.longitude})${dryRun ? " [dry-run]" : ""}`,
            );
            cinemasFallback += 1;
        }

        console.log(
            `\nCinema fallback: ${cinemasFallback} updated, ${cinemasSkipped} skipped (city has no coords).`,
        );
    } finally {
        rl.close();
        await db.$disconnect();
    }
};

await main();
