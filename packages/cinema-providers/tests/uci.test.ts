/* eslint-disable @typescript-eslint/no-non-null-assertion -- Test fixtures have known shapes. */
/* eslint-disable @typescript-eslint/require-await -- Async HTTP test doubles. */
/* eslint-disable @typescript-eslint/await-thenable -- Bun async matchers must be awaited. */
import { expect, test } from "bun:test";

import type { fetchTextWithBun } from "@waslaeuftin/cinema-providers/internal/fetchText";
import {
  getUciCinemas,
  getUciMovies,
} from "@waslaeuftin/cinema-providers/internal/providers/uci/getUciMovies";

const berlin = { slug: "berlin-east-side-gallery", siteId: "82" };
const bochum = { slug: "bochum-ruhr-park", siteId: "46" };
const fixture = (name = "berlin") =>
  Bun.file(new URL(`./fixtures/uci-${name}.html`, import.meta.url)).text();
const response =
  (body: string, status = 200): typeof fetchTextWithBun =>
  async () => ({ body, status, cookies: ["ignored=never-retain"] });

test("public entry uses one anonymous programme GET, native IDs, evidence and deduplicated sessions", async () => {
  const calls: string[] = [];
  const body = await fixture();
  const catalog = await getUciMovies(
    510,
    berlin,
    async (url, headers, method) => {
      calls.push(url);
      expect(headers).toEqual({ Accept: "text/html" });
      expect(method).toBeUndefined();
      return { status: 200, body };
    },
  );
  expect(calls).toEqual([
    "https://www.uci-kinowelt.de/kinoprogramm/berlin-east-side-gallery",
  ]);
  expect(catalog.provider).toBe("UCI");
  expect(catalog.fetchedCinemaIds).toEqual([510]);
  expect(catalog.movies.map((m) => m.providerFilmId)).toEqual([
    "413059",
    "413209",
  ]);
  expect(catalog.movies[0]?.evidence).toEqual({
    director: "Rob Savage",
    runtimeMinutes: 93,
    originalTitle: undefined,
    productionYear: undefined,
  });
  expect(catalog.movies[1]?.evidence?.runtimeMinutes).toBe(125);
  expect(catalog.movies[0]?.sourceMetadata).toMatchObject({
    containerId: "937827",
    siteId: "82",
    ageRating: "FSK 16",
    filmUrl:
      "https://www.uci-kinowelt.de/film/other-mommy/413059/berlin-east-side-gallery/82",
  });
  expect(catalog.showings).toHaveLength(3);
  expect(catalog.showings[0]).toMatchObject({
    cinemaId: 510,
    provider: "UCI",
    providerFilmId: "413059",
    providerSessionId: "82:37102000023ZIQERCX",
    movieName: "Other Mommy",
    bookingUrl:
      "https://buchung.uci-kinowelt.de/?perf_id=37102000023ZIQERCX&site_id=82",
    showingAdditionalData: ["Kino 06", "OV"],
  });
  expect(JSON.stringify(catalog)).not.toContain("ignored=never-retain");
});

test("winter, summer and midnight are converted from Berlin, not host timezone", async () => {
  const catalog = await getUciMovies(510, berlin, response(await fixture()));
  expect(catalog.showings.map((s) => s.dateTime.toISOString())).toEqual([
    "2026-11-03T18:40:00.000Z",
    "2026-07-05T22:15:00.000Z",
    "2026-12-15T23:01:00.000Z",
  ]);
});

test("other cinema and film IDs are not hardcoded or confused with CMS IDs", async () => {
  const catalog = await getUciMovies(
    511,
    bochum,
    response(await fixture("bochum")),
  );
  expect(catalog.movies[0]?.providerFilmId).toBe("33557");
  expect(catalog.movies[0]?.sourceMetadata?.containerId).toBe("711138");
  expect(catalog.showings[0]).toMatchObject({
    cinemaId: 511,
    providerFilmId: "33557",
    providerSessionId: "46:37102000023ZIQERCX",
    showingAdditionalData: ["Kino 02 XL"],
  });
  expect(catalog.showings[0]?.dateTime.toISOString()).toBe(
    "2026-07-06T18:00:00.000Z",
  );
});

test("preserves local language/accessibility labels, opaque flags and source without inventing languages", async () => {
  const catalog = await getUciMovies(510, berlin, response(await fixture()));
  expect(catalog.showings[1]?.showingAdditionalData).toEqual([
    "Kino 02 iSense",
    "iSense",
  ]);
  expect(catalog.showings[2]?.showingAdditionalData).toEqual([
    "Kino 03",
    "OmU",
    "OmeU",
    "GRETA APP",
    "Preview",
  ]);
  expect(catalog.showings[2]?.sourceMetadata).toMatchObject({
    sourceUrl:
      "https://www.uci-kinowelt.de/kinoprogramm/berlin-east-side-gallery",
    perfId: "URLAUB123",
    siteId: "82",
    timezone: "Europe/Berlin",
    rawVersion: "omu|omeu|465|999",
    versions: ["omu", "omeu", "465", "999"],
    special: "619",
    versionLabels: [
      { code: "omu", label: "OmU", description: "Original mit Untertiteln" },
      {
        code: "omeu",
        label: "OmeU",
        description: "Original mit englischen Untertiteln",
      },
      {
        code: "465",
        label: "GRETA APP",
        description: "Audio Description per Smartphone",
      },
      { code: "999" },
    ],
  });
  expect(JSON.stringify(catalog)).not.toMatch(
    /audioLanguage|subtitleLanguage|isAvailable|wheelchair/,
  );
});

test("retains all four identity evidence fields only when explicitly labeled", async () => {
  const body = (await fixture("bochum")).replace(
    "<dt>Regie</dt>",
    "<dt>Originaltitel</dt><dd>Rocky Original</dd></div><div class='film-description__row'><dt>Produktionsjahr</dt><dd>1976</dd></div><div class='film-description__row'><dt>Regie</dt>",
  );
  const catalog = await getUciMovies(511, bochum, response(body));
  expect(catalog.movies[0]?.evidence).toEqual({
    director: "John G. Avildsen",
    runtimeMinutes: 114,
    originalTitle: "Rocky Original",
    productionYear: 1976,
  });
  expect(catalog.showings[0]?.evidence).toEqual(catalog.movies[0]?.evidence);
});

test("equal display titles do not collapse native film identities", async () => {
  const body = (await fixture()).replace("Der perfekte Urlaub", "Other Mommy");
  const catalog = await getUciMovies(510, berlin, response(body));
  expect(catalog.movies).toHaveLength(2);
  expect(catalog.movies.map((m) => m.name)).toEqual([
    "Other Mommy",
    "Other Mommy",
  ]);
});

test("refreshes each call and handles transport/empty/error pages without freshness success", async () => {
  let calls = 0;
  const body = await fixture();
  const request: typeof fetchTextWithBun = async () => {
    calls++;
    return { status: 200, body };
  };
  await getUciMovies(510, berlin, request);
  await getUciMovies(510, berlin, request);
  expect(calls).toBe(2);
  for (const status of [403, 404, 500])
    await expect(
      getUciMovies(510, berlin, response("denied", status)),
    ).rejects.toThrow(`status code ${status}`);
  for (const invalid of [
    "",
    "<html>challenge</html>",
    "<script id='cinema-list'>[]</script>",
    body.replaceAll(
      'class="badge badge-performance',
      'class="not-a-performance',
    ),
  ])
    await expect(
      getUciMovies(510, berlin, response(invalid)),
    ).rejects.toThrow();
  await expect(
    getUciMovies(510, berlin, async () => {
      throw new Error("timeout");
    }),
  ).rejects.toThrow("timeout");
});

test("fails malformed sessions and wrong site/film identities rather than returning partial success", async () => {
  const body = await fixture();
  for (const [from, to] of [
    ['data-date="20261103"', 'data-date="20260230"'],
    ['data-date="20261103"', ""],
    ['data-time="19:40"', 'data-time="25:00"'],
    ['data-tracking-film-id="413059"', 'data-tracking-film-id="937827"'],
    [
      "perf_id=37102000023ZIQERCX&amp;site_id=82",
      "perf_id=37102000023ZIQERCX&amp;site_id=46",
    ],
    ["https://buchung.uci-kinowelt.de/", "https://example.com/"],
    ["/413059/berlin-east-side-gallery/82", "/413059/bochum-ruhr-park/46"],
    ["Other Mommy", ""],
  ]) {
    await expect(
      getUciMovies(510, berlin, response(body.replace(from!, to!))),
    ).rejects.toThrow();
  }
});

test("rejects conflicting duplicate IDs and orphan dated elements", async () => {
  const body = await fixture();
  await expect(
    getUciMovies(
      510,
      berlin,
      response(
        body.replace(
          'data-tracking-auditorium="Kino 06"',
          'data-tracking-auditorium="Kino 99"',
        ),
      ),
    ),
  ).rejects.toThrow("conflicting duplicate");
  await expect(
    getUciMovies(
      510,
      berlin,
      response(`${body}<a class="badge-performance" data-date="20261103"></a>`),
    ),
  ).rejects.toThrow("malformed programme");
});

test("rejects DST gaps and ambiguous repeated hours, and accepts their adjacent hours", async () => {
  const body = await fixture("bochum");
  for (const date of ["20260329", "20261025"])
    await expect(
      getUciMovies(
        511,
        bochum,
        response(
          body
            .replace('data-date="20260706"', `data-date="${date}"`)
            .replace('data-time="20:00"', 'data-time="02:30"'),
        ),
      ),
    ).rejects.toThrow("ambiguous or nonexistent");
  for (const [date, time, iso] of [
    ["20260329", "01:30", "2026-03-29T00:30:00.000Z"],
    ["20260329", "03:30", "2026-03-29T01:30:00.000Z"],
    ["20261025", "01:30", "2026-10-24T23:30:00.000Z"],
    ["20261025", "03:30", "2026-10-25T02:30:00.000Z"],
  ]) {
    const catalog = await getUciMovies(
      511,
      bochum,
      response(
        body
          .replace('data-date="20260706"', `data-date="${date}"`)
          .replace('data-time="20:00"', `data-time="${time}"`),
      ),
    );
    expect(catalog.showings[0]?.dateTime.toISOString()).toBe(iso);
  }
});

test("discovery uses public site IDs, validates config before HTTP, and rejects mismatched mappings", async () => {
  expect(await getUciCinemas(response(await fixture()))).toEqual([
    berlin,
    bochum,
  ]);
  await expect(
    getUciMovies(510, { ...berlin, siteId: "443" }, response(await fixture())),
  ).rejects.toThrow("slug/site ID mismatch");
  await expect(
    getUciMovies(510, { ...berlin, slug: "../admin" }, async () => {
      throw new Error("must not fetch");
    }),
  ).rejects.toThrow("configuration");
  await expect(
    getUciCinemas(
      response(
        '<script id="cinema-list">[{"slug":"berlin","site_id":null}]</script>',
      ),
    ),
  ).rejects.toThrow("directory entry");
  await expect(
    getUciCinemas(response('<script id="cinema-list">not JSON</script>')),
  ).rejects.toThrow();
});
