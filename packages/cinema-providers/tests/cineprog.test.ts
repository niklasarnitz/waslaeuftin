import { expect, test } from "bun:test";

import type { fetchTextWithBun } from "@waslaeuftin/cinema-providers/internal/fetchText";
import { getCineprogMovies } from "@waslaeuftin/cinema-providers/internal/providers/cineprog/getCineprogMovies";

// eslint-disable-next-line no-restricted-imports -- Test fixtures have no source-package export alias.
import {
  cineprogGroupFacts,
  cineprogParkSession,
  cineprogWokiDetail,
  cineprogWokiFacts,
  cineprogWokiSession,
} from "./fixtures/cineprog";

type Data = Record<string, unknown>;
const base = "https://www.woki.de";
const expectRejected = async (promise: Promise<unknown>, message?: string) => {
  const failure = await promise.then(
    () => undefined,
    (error: unknown) => error,
  );
  expect(failure).toBeInstanceOf(Error);
  if (message) expect(String(failure)).toContain(message);
};
const literal = (name: string, value: unknown) =>
  `<script>var ${name} = ${JSON.stringify(value)}; window.notExecuted = () => { throw Error('never'); };</script>`;
const film = (
  dates: Data = { "datum_2026-11-05": [cineprogWokiSession] },
  facts: Data = cineprogWokiFacts,
  group: Data = cineprogGroupFacts,
) => ({
  filmfakten: facts,
  vorstellungen: { vorstellungen_fakten: group, termine: dates },
});
const jsonLd = (start: string, id = "125231") =>
  `<script type="application/ld+json">${JSON.stringify({
    "@graph": [
      {
        "@type": "ScreeningEvent",
        startDate: start,
        workPresented: { "@id": `${base}#${id}` },
      },
    ],
  })}</script>`;

const fixtureRequest = (
  films: Data = { film_125231: film() },
  detail: Data = cineprogWokiDetail,
  extraHtml = "",
) => {
  const calls: string[] = [];
  let active = 0;
  let maximum = 0;
  const request: typeof fetchTextWithBun = async (url) => {
    calls.push(url);
    if (url === `${base}/programm?filter=all`)
      return {
        status: 200,
        body: literal("programm", { filme: films }) + extraHtml,
      };
    const id = /\/detail\/(\d+)$/.exec(url)?.[1];
    if (!id) throw new Error(`Unexpected fixture request: ${url}`);
    active++;
    maximum = Math.max(maximum, active);
    await Bun.sleep(1);
    active--;
    return {
      status: 200,
      body: literal("movie", {
        [`film_${id}`]: { filmfakten: { ...detail, idf: id } },
      }),
    };
  };
  return { request, calls, maximum: () => maximum };
};

test("Cineprog public function enriches WOKI array sessions without inventing languages", async () => {
  const fixture = fixtureRequest(
    undefined,
    undefined,
    jsonLd("2026-11-05T15:00:00+01:00"),
  );
  const result = await getCineprogMovies(13, base, fixture.request);
  expect(fixture.calls).toEqual([
    `${base}/programm?filter=all`,
    `${base}/detail/125231`,
  ]);
  expect(result.provider).toBe("Cineprog");
  expect(result.fetchedCinemaIds).toEqual([13]);
  expect(result.movies[0]?.evidence).toEqual({
    originalTitle: "Geister",
    productionYear: 2026,
    director: "Fatih Akin",
    runtimeMinutes: 105,
  });
  const showing = result.showings[0];
  expect(showing?.dateTime.toISOString()).toBe("2026-11-05T14:00:00.000Z");
  expect(showing?.providerSessionId).toBe("13:www.kinoheld.de:showId:52631");
  expect(showing?.bookingUrl).toContain("showId=52631");
  expect(showing?.showingAdditionalData).toEqual([
    "Goldener Saal",
    "2D",
    "Dolby 7.1",
  ]);
  expect(showing?.sourceMetadata).toMatchObject({
    audioLanguage: null,
    subtitleLanguage: null,
    availability: null,
    cancellationStatus: null,
    timeCrosscheck: "matched",
    session: { resbis: "2026-11-05*15:00:00" },
  });
  expect(result.movies[0]?.sourceMetadata).toMatchObject({
    identityScope: "catalogue-version-or-event",
    detailFilmfakten: { klon_von: "125231M" },
  });
});

test("Cineprog Park singleton rows use desktop performance, not stale fixticket/mobile", async () => {
  const session = {
    ...cineprogParkSession,
    link_mobile: cineprogParkSession.link_fixticket,
  };
  const fixture = fixtureRequest({
    film_125231: film({ "datum_2026-11-02": session }),
  });
  const result = await getCineprogMovies(20, base, fixture.request);
  expect(result.showings).toHaveLength(1);
  expect(result.showings[0]?.bookingUrl).toContain(
    "performance=62171000023BSAMYRA",
  );
  expect(result.showings[0]?.providerSessionId).toBe(
    "20:iframe.cineorder.park-kino.de:performance:62171000023BSAMYRA",
  );
  expect(result.showings[0]?.sourceMetadata?.linkConflict).toBe(true);
});

test("Cineprog keeps Park's two desktop sessions despite a repeated fixticket", async () => {
  const earlier = {
    ...cineprogParkSession,
    zeit: "16:30",
    link_desktop: cineprogParkSession.link_fixticket,
    link_mobile: cineprogParkSession.link_fixticket,
  };
  const fixture = fixtureRequest({
    film_125231: film({
      "datum_2026-11-02": [earlier, cineprogParkSession, cineprogParkSession],
    }),
  });
  const result = await getCineprogMovies(20, base, fixture.request);
  expect(result.showings).toHaveLength(2);
  expect(
    result.showings.map((showing) => showing.sourceMetadata?.nativeSessionId),
  ).toEqual(["52171000023BSAMYRA", "62171000023BSAMYRA"]);
});

test("Cineprog external ticket override keeps the native identity", async () => {
  const session = {
    ...cineprogWokiSession,
    external_ticket_url: "https://www.grenzgang.de/programm/event",
  };
  const fixture = fixtureRequest({
    film_125231: film({ "datum_2026-11-05": session }),
  });
  const result = await getCineprogMovies(13, base, fixture.request);
  expect(result.showings[0]?.bookingUrl).toBe(session.external_ticket_url);
  expect(result.showings[0]?.sourceMetadata?.nativeSessionId).toBe("52631");
});

test("Cineprog deduplicates detail requests/sessions but keeps version/event records", async () => {
  const films: Data = {};
  for (let i = 0; i < 9; i++) {
    const id = String(125231 + i);
    films[`film_${id}`] = film(
      {
        "datum_2026-11-05": [
          { ...cineprogWokiSession, link_mobile: {}, link_fixticket: {} },
        ],
      },
      { ...cineprogWokiFacts, idf: id },
    );
  }
  films.duplicate = films.film_125231;
  const fixture = fixtureRequest(films);
  const result = await getCineprogMovies(13, base, fixture.request);
  expect(result.movies).toHaveLength(9);
  expect(result.showings).toHaveLength(9);
  expect(fixture.calls).toHaveLength(10);
  expect(fixture.maximum()).toBe(4);
  expect(result.showings[0]?.providerSessionId).toBe(
    "13:composite:125231:2026-11-05T15:00:1",
  );
});

test("Cineprog sentinels and string booleans preserve unknown evidence", async () => {
  const facts = {
    ...cineprogWokiFacts,
    laufzeit: {},
    director: {},
    Versionsmarker: {},
  };
  const fixture = fixtureRequest(
    {
      film_125231: film(undefined, facts, {
        OrigVersion: "true",
        OmitU: "1",
        DreiD: "0",
        HFR: "false",
      }),
    },
    {
      ...facts,
      originaltitel: {},
      produktionsland: {},
      castcrew: {},
      KinoStart_D: "2026-11-05",
    },
  );
  const result = await getCineprogMovies(13, base, fixture.request);
  expect(result.movies[0]?.evidence).toEqual({
    originalTitle: undefined,
    productionYear: undefined,
    director: undefined,
    runtimeMinutes: undefined,
  });
  expect(result.showings[0]?.showingAdditionalData).toEqual([
    "Goldener Saal",
    "OV",
    "OmU",
  ]);
  expect(result.showings[0]?.sourceMetadata?.audioLanguage).toBeNull();
});

for (const [date, offset, expected] of [
  ["2027-07-04", "+02:00", "2027-07-04T13:00:00.000Z"],
  ["2026-11-05", "+01:00", "2026-11-05T14:00:00.000Z"],
] as const) {
  test(`Cineprog Berlin ${offset} cross-check`, async () => {
    const fixture = fixtureRequest(
      {
        film_125231: film({
          [`datum_${date}`]: { ...cineprogWokiSession, datum: date },
        }),
      },
      undefined,
      jsonLd(`${date}T15:00:00${offset}`),
    );
    const result = await getCineprogMovies(13, base, fixture.request);
    expect(result.showings[0]?.dateTime.toISOString()).toBe(expected);
  });
}

test("Cineprog uses explicit Berlin offset to resolve the repeated autumn hour", async () => {
  const fixture = fixtureRequest(
    {
      film_125231: film({
        "datum_2026-10-25": {
          ...cineprogWokiSession,
          datum: "2026-10-25",
          zeit: "02:30",
        },
      }),
    },
    undefined,
    jsonLd("2026-10-25T02:30:00+01:00"),
  );
  const result = await getCineprogMovies(13, base, fixture.request);
  expect(result.showings[0]?.dateTime.toISOString()).toBe(
    "2026-10-25T01:30:00.000Z",
  );
});

test("Cineprog rejects contradictory JSON-LD offsets, nonexistent and unzoned ambiguous times", async () => {
  for (const [date, time, ld] of [
    ["2026-11-05", "15:00", jsonLd("2026-11-05T15:00:00+02:00")],
    ["2027-03-28", "02:30", ""],
    ["2026-10-25", "02:30", ""],
  ]) {
    const fixture = fixtureRequest(
      {
        film_125231: film({
          [`datum_${date}`]: {
            ...cineprogWokiSession,
            datum: date,
            zeit: time,
          },
        }),
      },
      undefined,
      ld,
    );
    await expectRejected(getCineprogMovies(13, base, fixture.request));
  }
});

test("Cineprog rejects malformed/unsupported/empty data rather than returning freshness", async () => {
  for (const body of [
    "<html>Not Cineprog</html>",
    "<script>var programm = {broken;</script>",
    "<script>var programm = {filme: {}};</script>",
    "<script>var programm = (() => ({filme: {}}))();</script>",
    literal("programm", { filme: {} }),
    literal("programm", { filme: [] }),
  ]) {
    const request: typeof fetchTextWithBun = () =>
      Promise.resolve({ status: 200, body });
    await expectRejected(getCineprogMovies(13, base, request));
  }
  for (const dates of [
    {},
    { "datum_2026-11-05": {} },
    { "datum_2026-11-05": { ...cineprogWokiSession, zeit: "nonsense" } },
  ]) {
    const fixture = fixtureRequest({ film_125231: film(dates) });
    await expectRejected(getCineprogMovies(13, base, fixture.request));
  }
});

test("Cineprog does not execute script expressions or strings containing braces", async () => {
  const fixture = fixtureRequest(undefined, {
    ...cineprogWokiDetail,
    originaltitel: 'Film { "quoted" }',
  });
  const result = await getCineprogMovies(13, base, fixture.request);
  expect(result.movies[0]?.evidence?.originalTitle).toBe('Film { "quoted" }');
});

test("Cineprog validates public HTTPS base and booking links before exposing them", async () => {
  const fixture = fixtureRequest();
  for (const url of [
    "http://www.woki.de",
    "https://user:pass@www.woki.de",
    "https://127.0.0.1",
    "https://[::1]",
    "https://localhost",
    "https://cinema.internal",
  ]) {
    await expectRejected(getCineprogMovies(13, url, fixture.request));
  }
  expect(fixture.calls).toHaveLength(0);
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "https://user:pass@www.woki.de",
  ]) {
    const invalid = fixtureRequest({
      film_125231: film({
        "datum_2026-11-05": {
          ...cineprogWokiSession,
          external_ticket_url: url,
        },
      }),
    });
    await expectRejected(getCineprogMovies(13, base, invalid.request));
  }
});

test("Cineprog fails closed for HTTP and detail errors", async () => {
  const request: typeof fetchTextWithBun = () =>
    Promise.resolve({ status: 503, body: "Unavailable" });
  await expectRejected(getCineprogMovies(13, base, request), "HTTP 503");
  const fixture = fixtureRequest();
  const brokenDetail: typeof fetchTextWithBun = (url, headers) =>
    url.includes("/detail/")
      ? Promise.resolve({
          status: 200,
          body: literal("movie", { film_999: {} }),
        })
      : fixture.request(url, headers);
  await expectRejected(getCineprogMovies(13, base, brokenDetail));
});
