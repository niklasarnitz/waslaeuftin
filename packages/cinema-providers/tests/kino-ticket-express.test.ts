import { expect, spyOn, test } from "bun:test";

import {
  getKinoTicketsExpressMovies,
  parseKinoTicketsExpressDateTime,
} from "@waslaeuftin/cinema-providers/server";

test("identity evidence: kino tickets express extracts labeled production years and runtimes", async () => {
  const request = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(`
    <main><ul>${["10133", "10134"]
      .map(
        (id) => `
      <li class="bg-white" id="movie-${id}">
        <h2 class="text-xl sm:text-3xl font-bold text-primary">Philadelphia</h2>
        <p><b>Laufzeit:</b> ca. 125 Minuten<br><b>Produktion:</b> 1993<br><b>Darsteller:</b> Tom Hanks</p>
        <ul><li><div class="w-14"><div>05.11.</div></div><a href="/test/booking/${id}">19:00</a></li></ul>
      </li>`,
      )
      .join("")}</ul></main>`),
  );
  try {
    const catalog = await getKinoTicketsExpressMovies(42, "test");
    expect(catalog.movies).toMatchObject([
      {
        provider: "KinoTicketsExpress",
        providerFilmId: "10133",
        evidence: { productionYear: 1993, runtimeMinutes: 125 },
      },
      {
        provider: "KinoTicketsExpress",
        providerFilmId: "10134",
        evidence: { productionYear: 1993, runtimeMinutes: 125 },
      },
    ]);
    expect(catalog.showings).toMatchObject([
      {
        provider: "KinoTicketsExpress",
        providerFilmId: "10133",
        evidence: { productionYear: 1993, runtimeMinutes: 125 },
      },
      {
        provider: "KinoTicketsExpress",
        providerFilmId: "10134",
        evidence: { productionYear: 1993, runtimeMinutes: 125 },
      },
    ]);
  } finally {
    request.mockRestore();
  }
});

test("identity evidence: kino tickets express omits malformed metadata and keeps legacy showings", async () => {
  const metadata = [
    "",
    "<b>Darsteller:</b> Someone 1993<br><b>Kinostart:</b> 2026",
    "<b>Produktion:</b> 1993/2026<br><b>Laufzeit:</b> ca. 125 Minuten",
    "<b>Produktion:</b> 1993<br><b>Laufzeit:</b> ca. 0 Minuten",
    "<b>Produktion:</b> 1700<br><b>Laufzeit:</b> ca. -1 Minuten",
    "<b>Produktion:</b> 2101<br><b>Laufzeit:</b> ca. 99.5 Minuten",
    "<b>Produktion:</b> unknown<br><b>Laufzeit:</b> ca. 100000000000000000000 Minuten",
  ];
  const request = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(`
    <main><ul>${metadata
      .map(
        (value, index) => `
      <li class="bg-white">
        <h2 class="text-xl sm:text-3xl font-bold text-primary">Film</h2>
        <p>${value}</p><a href="/test/booking/${index}">Do 05.11.[19:00]</a>
      </li>`,
      )
      .join("")}</ul></main>`),
  );
  try {
    const catalog = await getKinoTicketsExpressMovies(42, "test");
    const expected = [
      undefined,
      undefined,
      { runtimeMinutes: 125 },
      { productionYear: 1993 },
      undefined,
      undefined,
      undefined,
    ];
    expect(catalog.movies.map((movie) => movie.evidence)).toEqual(expected);
    expect(catalog.showings.map((showing) => showing.evidence)).toEqual(
      expected,
    );
    expect(
      catalog.movies.every((movie) => movie.providerFilmId === undefined),
    ).toBe(true);
  } finally {
    request.mockRestore();
  }
});

test("identity evidence: breakfast combinations use only unambiguous film-card evidence, not event duration", async () => {
  const description =
    "Ab 10 Uhr können Sie sich an unserem Frühstücksbuffet bedienen. Ab 11 Uhr sehen Sie dann einen der drei Filme.";
  const card = (
    id: number,
    title: string,
    runtime: number,
    year?: number,
    breakfast = false,
  ) => `
    <li class="bg-white" id="movie-${id}">
      <h2 class="text-xl sm:text-3xl font-bold text-primary">${title}</h2>
      <p><b>Laufzeit:</b> ca. ${runtime} Minuten${year ? `<br><b>Produktion:</b> ${year}` : ""}</p>
      <div>${breakfast ? description : ""}</div>
      <ul><li><div class="w-14"><div>05.11.</div></div><a href="/karlsruhe_schauburg/booking/${id}">${breakfast ? "10:00" : "11:00"}</a></li></ul>
    </li>`;
  const request = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(`<main><ul>
      ${card(1, "Frühstück - Lieblingsmenschen (OmU)", 180, undefined, true)}
      ${card(2, "Lieblingsmenschen (OmU)", 107, 2026)}
      ${card(3, "Lieblingsmenschen", 65, 2021)}
      ${card(4, "Ordinary long film", 180, 2026)}
      ${card(5, "Frühstück - Missing film", 190, undefined, true)}
      ${card(6, "Frühstück - Ambiguous film", 180, undefined, true)}
      ${card(7, "Ambiguous film", 100, 1990)}
      ${card(8, "Ambiguous film", 110, 2026)}
      ${card(9, "Frühstück - Conflicting film", 180, 2020, true)}
      ${card(10, "Conflicting film", 107, 2026)}
      ${card(11, "Frühstück - Lieblingsmenschen (OmU)", 180, 2026)}
      ${card(12, "Frühstück- Einzeln nicht buchbar!", 60)}
    </ul></main>`),
  );
  try {
    const catalog = await getKinoTicketsExpressMovies(2, "karlsruhe_schauburg");
    for (const records of [catalog.movies, catalog.showings]) {
      const evidenceFor = (id: number) =>
        records.find((record) => record.providerFilmId === String(id))
          ?.evidence;
      expect(evidenceFor(1)).toEqual({
        productionYear: 2026,
        runtimeMinutes: 107,
      });
      expect(evidenceFor(4)).toEqual({
        productionYear: 2026,
        runtimeMinutes: 180,
      });
      expect(evidenceFor(5)).toBeUndefined();
      expect(evidenceFor(6)).toBeUndefined();
      expect(evidenceFor(9)).toEqual({ productionYear: 2020 });
      expect(evidenceFor(11)).toEqual({
        productionYear: 2026,
        runtimeMinutes: 180,
      });
      expect(evidenceFor(12)).toEqual({ runtimeMinutes: 60 });
    }
    const combination = catalog.showings.find(
      (showing) => showing.providerFilmId === "1",
    );
    expect(combination?.bookingUrl).toBe(
      "https://kinotickets.express/karlsruhe_schauburg/booking/1",
    );
    expect(combination?.dateTime.toISOString()).toBe(
      "2026-11-05T09:00:00.000Z",
    );
    expect(combination?.movieName).toBe("Frühstück - Lieblingsmenschen (OmU)");
    expect(
      combination?.showingAdditionalData?.some((label) =>
        label.includes("180 Minuten"),
      ),
    ).toBe(true);
  } finally {
    request.mockRestore();
  }
});

test.each([
  { trailer: "80sY0wErs_U", year: 2026, linked: true },
  { trailer: "otherVideo1", year: 2026, linked: false },
  { trailer: "", year: 2026, linked: false },
  { trailer: "80sY0wErs_U", year: 2025, linked: false },
])(
  "identity evidence: conflicting breakfast director claims require the same linked film ($trailer, $year)",
  async ({ trailer, year, linked }) => {
    const pages = ["geister", "fruehstueck-geister"];
    const titles = ["Geister", "Frühstück - Geister"];
    const request = spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.hostname === "kinotickets.express")
        return Promise.resolve(
          new Response(
            `<main><ul>${titles
              .map(
                (title, i) => `
        <li class="bg-white" id="movie-${i + 1}">
          <h2 class="text-xl sm:text-3xl font-bold text-primary">${title}</h2>
          <p><b>Produktion:</b> ${i ? year : 2026}<br><b>Laufzeit:</b> ca. ${i ? 180 : 105} Minuten</p>
          <div>${i ? "Ab 10 Uhr können Sie sich an unserem Frühstücksbuffet bedienen. Ab 11 Uhr sehen Sie dann einen der drei Filme." : ""}</div>
          <a href="/karlsruhe_schauburg/booking/${i + 11}">Do 05.11.[10:00]</a>
        </li>`,
              )
              .join("")}</ul></main>`,
          ),
        );
      if (url.pathname === "/sitemap.xml")
        return Promise.resolve(
          new Response(
            `<urlset>${pages.map((page) => `<url><loc>https://www.schauburg.de/film/${page}</loc></url>`).join("")}</urlset>`,
          ),
        );
      const i = pages.indexOf(url.pathname.split("/").at(-1) ?? "");
      if (i < 0) throw new Error("Unexpected detail URL");
      return Promise.resolve(
        new Response(`
      <title>${titles[i]}: Schauburg - Das Filmtheater in Karlsruhe</title>
      <a class="schauburg-filmdetail-timeelement-link" href="https://kinotickets.express/karlsruhe_schauburg/booking/${i + 11}">10:00</a>
      <span class="schauburg-filmdetail-poster-topic">Regie</span><span class="schauburg-filmdetail-poster-topic-text">${i ? "Fatih Akin" : "Fathi Akin"}</span>
      <div class="media2click-iframedata" data-attributes='${JSON.stringify({ src: `https://www.youtube-nocookie.com/embed/${i ? trailer : "80sY0wErs_U"}` })}'></div>`),
      );
    });
    try {
      const catalog = await getKinoTicketsExpressMovies(
        2,
        "karlsruhe_schauburg",
      );
      for (const records of [catalog.movies, catalog.showings]) {
        expect(records[0]?.evidence?.director).toBe("Fathi Akin");
        expect(records[1]?.evidence?.director).toBe("Fatih Akin");
        expect(records[0]?.evidence?.directorAlternatives).toEqual(
          linked ? ["Fatih Akin"] : undefined,
        );
        expect(records[1]?.evidence?.directorAlternatives).toEqual(
          linked ? ["Fathi Akin"] : undefined,
        );
        expect(records[0]?.evidence?.runtimeMinutes).toBe(105);
        expect(records[1]?.evidence?.runtimeMinutes).toBe(
          year === 2026 ? 105 : undefined,
        );
        if (linked) {
          expect(records[0]?.sourceMetadata?.linkedIdentityDetailsUrls).toEqual(
            ["https://www.schauburg.de/film/fruehstueck-geister"],
          );
          expect(records[1]?.sourceMetadata?.linkedIdentityDetailsUrls).toEqual(
            ["https://www.schauburg.de/film/geister"],
          );
        }
      }
      expect(catalog.showings.map((showing) => showing.providerFilmId)).toEqual(
        ["1", "2"],
      );
      expect(catalog.showings[1]?.bookingUrl).toBe(
        "https://kinotickets.express/karlsruhe_schauburg/booking/12",
      );
    } finally {
      request.mockRestore();
    }
  },
);

test("identity evidence: Schauburg details require the exact film title and a shared booking", async () => {
  const titles = [
    "Tschaikowsky (35mm)",
    "Leica",
    "Wrong booking",
    "Wrong title",
  ];
  const slugs = ["tschaikowsky-35mm", "leica", "wrong-booking", "wrong-title"];
  let unavailable = false;
  const request = spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.hostname === "kinotickets.express")
      return Promise.resolve(
        new Response(
          `<main><ul>${titles
            .map(
              (title, i) => `
        <li class="bg-white" id="movie-${i + 1}">
          <h2 class="text-xl sm:text-3xl font-bold text-primary">${title}</h2>
          <p><b>Produktion:</b> 1970<br><b>Laufzeit:</b> ca. 123 Minuten</p>
          <a href="/karlsruhe_schauburg/booking/${i + 11}">Do 05.11.[19:00]</a>
        </li>`,
            )
            .join("")}</ul></main>`,
        ),
      );
    if (unavailable) return Promise.reject(new Error("Details unavailable"));
    if (url.pathname === "/sitemap.xml" && !url.search)
      return Promise.resolve(
        new Response(
          `<sitemapindex><sitemap><loc>https://www.schauburg.de/sitemap.xml?sitemap=pages</loc></sitemap></sitemapindex>`,
        ),
      );
    if (url.pathname === "/sitemap.xml")
      return Promise.resolve(
        new Response(`<urlset>${slugs.map((slug) => `<url><loc>https://www.schauburg.de/film/${slug}</loc></url>`).join("")}
        <url><loc>https://example.com/film/leica</loc></url></urlset>`),
      );
    const i = slugs.indexOf(url.pathname.split("/").at(-1) ?? "");
    if (i < 0) throw new Error("Unexpected detail host or URL");
    return Promise.resolve(
      new Response(`
      <title>${i === 3 ? "Another film" : titles[i]}: Schauburg - Das Filmtheater in Karlsruhe</title>
      <a class="schauburg-filmdetail-timeelement-link" href="https://kinotickets.express/karlsruhe_schauburg/booking/${i === 2 ? 99 : i + 11}">19:00</a>
      <aside><a href="https://kinotickets.express/karlsruhe_schauburg/booking/${i + 11}">Related programme</a></aside>
      <main><div class="about"><p>${i === 0 ? "“The Music Lovers” (Originaltitel)" : "No labeled original title"}</p></div>
        <span class="schauburg-filmdetail-poster-topic">Regie</span><span class="schauburg-filmdetail-poster-topic-text">${i === 0 ? "Ken Russel" : "Reiner Holzemer"}</span>
      </main>`),
    );
  });
  try {
    const catalog = await getKinoTicketsExpressMovies(2, "karlsruhe_schauburg");
    for (const records of [catalog.movies, catalog.showings]) {
      expect(records[0]?.evidence).toEqual({
        productionYear: 1970,
        runtimeMinutes: 123,
        director: "Ken Russel",
        originalTitle: "The Music Lovers",
      });
      expect(records[1]?.evidence).toEqual({
        productionYear: 1970,
        runtimeMinutes: 123,
        director: "Reiner Holzemer",
      });
      for (const record of records.slice(2))
        expect(record.evidence).toEqual({
          productionYear: 1970,
          runtimeMinutes: 123,
        });
      expect(records[0]?.sourceMetadata).toEqual({
        identityDetailsUrl: "https://www.schauburg.de/film/tschaikowsky-35mm",
      });
    }
    unavailable = true;
    const fallback = await getKinoTicketsExpressMovies(
      2,
      "karlsruhe_schauburg",
    );
    expect(fallback.showings).toHaveLength(4);
    expect(fallback.movies.map((movie) => movie.evidence)).toEqual(
      titles.map(() => ({ productionYear: 1970, runtimeMinutes: 123 })),
    );
  } finally {
    request.mockRestore();
  }
});

test("identity evidence: Kinemathek film credits require the exact title and film booking", async () => {
  const titles = [
    "The Killer",
    "Wrong title",
    "Wrong booking",
    "Unknown credits",
    "La vita da grandi - Das Leben als Erwachsene",
    "Unrelated film - Wrong booking",
  ];
  const slugs = [
    "the-killer",
    "wrong-title",
    "wrong-booking",
    "unknown-credits",
    "la-vita-da-grandi",
    "unrelated-film",
  ];
  let unavailable = false;
  const request = spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.hostname === "kinotickets.express")
      return Promise.resolve(
        new Response(
          `<main><ul>${titles
            .map(
              (title, i) => `
          <li class="bg-white" id="movie-${10174 + i}">
            <h2 class="text-xl sm:text-3xl font-bold text-primary">${title}</h2>
            <p><b>Produktion:</b> 1989<br><b>Laufzeit:</b> ca. 101 Minuten</p>
            <a href="/karlsruhe_kinemathek/booking/${35860 + i}">Mi 04.11.[19:30]</a>
          </li>`,
            )
            .join("")}</ul></main>`,
        ),
      );
    if (unavailable) return Promise.reject(new Error("Cinema unavailable"));
    if (url.pathname === "/")
      return Promise.resolve(
        new Response(`
        ${slugs.map((slug) => `<a href="/films/${slug}">Film</a>`).join("")}
        <a href="https://example.com/films/the-killer">Untrusted film</a>`),
      );
    const i = slugs.indexOf(url.pathname.split("/").at(-1) ?? "");
    if (i < 0 || url.hostname !== "kinemathek-karlsruhe.de")
      throw new Error("Unexpected film URL");
    return Promise.resolve(
      new Response(`
      <article class="film-page">
        <h2 class="fp-title">${i === 1 ? "Another film" : titles[i]?.split(" - ")[0]}</h2>
        <p class="fp-credits">${i === 3 ? "Special programme" : "John Woo, HK 1989; 111&prime;"}</p>
        <p class="fp-facts"><span>Originaltitel: 喋血雙雄</span></p>
        <p class="fp-trailer">
          <a href="https://www.youtube.com/watch?v=bdLwJ2-zxDA">Trailer</a>
          <a href="https://www.youtube.com.evil.test/watch?v=HCnFyyvkM5s">Untrusted</a>
          <a href="https://www.youtube.com/watch?v=invalid">Malformed</a>
        </p>
        <section class="fp-shows"><ul><li class="show-row"><span class="sr-actions">
          <a href="https://kinotickets.express/karlsruhe_kinemathek/booking/${i === 2 || i === 5 ? 999 : 35860 + i}">Tickets</a>
        </span></li></ul></section>
      </article>
      <aside><a href="https://kinotickets.express/karlsruhe_kinemathek/booking/${35860 + i}">Related film</a>
        <p class="fp-trailer"><a href="https://www.youtube.com/watch?v=HCnFyyvkM5s">Related trailer</a></p>
      </aside>`),
    );
  });
  try {
    const catalog = await getKinoTicketsExpressMovies(
      7,
      "karlsruhe_kinemathek",
    );
    for (const records of [catalog.movies, catalog.showings]) {
      expect(records[0]?.evidence).toEqual({
        productionYear: 1989,
        runtimeMinutes: 101,
        director: "John Woo",
        originalTitle: "喋血雙雄",
        youtubeTrailerIds: ["bdLwJ2-zxDA"],
      });
      expect(records[0]?.sourceMetadata).toEqual({
        identityDetailsUrl: "https://kinemathek-karlsruhe.de/films/the-killer",
      });
      expect(records[4]?.evidence).toEqual(records[0]?.evidence);
      expect(records[4]?.sourceMetadata).toEqual({
        identityDetailsUrl:
          "https://kinemathek-karlsruhe.de/films/la-vita-da-grandi",
      });
      expect(records[5]?.evidence).toEqual({
        productionYear: 1989,
        runtimeMinutes: 101,
      });
      for (const record of records.slice(1, 3))
        expect(record.evidence).toEqual({
          productionYear: 1989,
          runtimeMinutes: 101,
        });
      expect(records[3]?.evidence).toEqual({
        productionYear: 1989,
        runtimeMinutes: 101,
        originalTitle: "喋血雙雄",
        youtubeTrailerIds: ["bdLwJ2-zxDA"],
      });
    }
    expect(catalog.showings[0]?.bookingUrl).toBe(
      "https://kinotickets.express/karlsruhe_kinemathek/booking/35860",
    );
    expect(catalog.showings[0]?.dateTime.toISOString()).toBe(
      "2026-11-04T18:30:00.000Z",
    );
    unavailable = true;
    const fallback = await getKinoTicketsExpressMovies(
      7,
      "karlsruhe_kinemathek",
    );
    expect(fallback.showings).toHaveLength(titles.length);
    expect(fallback.movies.map((movie) => movie.evidence)).toEqual(
      titles.map(() => ({ productionYear: 1989, runtimeMinutes: 101 })),
    );
  } finally {
    request.mockRestore();
  }
});

test("identity evidence: official festival aliases require venue, film credits and the exact booking", async () => {
  let invalid = "";
  const title = "Gioia mia - Mein Sommer mit Nonna";
  const sourceUrl =
    "https://www.cinema-italia.net/filme.php?selectedday=17&selectedfilm=3";
  const request = spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    let html: string;
    if (url.hostname === "kinotickets.express") {
      html = `<main><ul><li class="bg-white" id="movie-10149">
        <h2 class="text-xl sm:text-3xl font-bold text-primary">${title}</h2>
        <p><b>Produktion:</b> 2025<br><b>Laufzeit:</b> ca. 90 Minuten</p>
        <a href="/karlsruhe_kinemathek/booking/35826">So 08.11.[17:30]</a>
      </li></ul></main>`;
    } else if (
      url.hostname === "kinemathek-karlsruhe.de" &&
      url.pathname === "/"
    ) {
      html = `<a href="/films/gioia-mia">Film</a>`;
    } else if (url.hostname === "kinemathek-karlsruhe.de") {
      html = `<article class="film-page"><h2 class="fp-title">Gioia mia</h2>
        <p class="fp-credits">Margherita Spampinato, IT 2025; 90&prime;</p>
        <p class="fp-facts"><span>Drama</span><span>Sprache: IT</span></p>
        <p class="fp-series">${invalid === "no-festival" ? "" : `<a href="/festivals/cinema-italia">Cinema Italia</a>`}</p>
        <section class="fp-shows"><li class="show-row"><span class="sr-actions">
          <a href="https://kinotickets.express/karlsruhe_kinemathek/booking/${invalid === "booking" ? "999" : "35826"}">Tickets</a>
        </span></li></section></article>`;
    } else if (url.hostname === "www.cinema-italia.net") {
      if (invalid === "unavailable")
        return Promise.reject(new Error("Festival unavailable"));
      if (url.pathname === "/") {
        html = `<ul class="navicites"><li><a href="index.php?selectedday=17">05.11.-11.11. Karlsruhe</a></li></ul>`;
      } else if (url.pathname === "/index.php") {
        html = `<h1>05.11.-11.11. Karlsruhe</h1><h2>${invalid === "venue" ? "Another Cinema" : "Kinemathek Karlsruhe"}</h2>
          <p class="movie"><a href="${invalid === "foreign-url" ? "https://untrusted.test/filme.php?selectedfilm=3" : "filme.php?selectedday=17&selectedfilm=3"}">${title}</a></p>`;
      } else if (url.pathname === "/filme.php") {
        html = `<h1 class="red">${invalid === "original" ? "Another original" : "GIOIA MIA"}</h1>
          <h2 class="red">${invalid === "translation" ? "Mein Sommer bei Nonna" : "Mein Sommer mit Nonna"}</h2>
          <p><strong>Buch und Regie</strong>: ${invalid === "director" ? "Another Director" : "Margherita Spampinato"}<br><strong>Kamera</strong>: Camera Person</p>
          <p><span class="red"><strong>Italien ${invalid === "year" ? "2024" : "2025"}</strong></span><br>${invalid === "runtime" ? "120" : "90"} Min., OmU</p>`;
        if (invalid === "ambiguous-page") html += html;
      } else throw new Error(`Unexpected festival path ${url.pathname}`);
    } else throw new Error(`Unexpected host ${url.hostname}`);
    return Promise.resolve(new Response(html));
  });
  try {
    const catalog = await getKinoTicketsExpressMovies(
      2752,
      "karlsruhe_kinemathek",
    );
    const evidence = {
      productionYear: 2025,
      runtimeMinutes: 90,
      director: "Margherita Spampinato",
      originalTitle: "GIOIA MIA",
      officialTitleAliases: [
        {
          title,
          originalTitle: "GIOIA MIA",
          director: "Margherita Spampinato",
          productionYear: 2025,
          runtimeMinutes: 90,
          sourceUrl,
        },
      ],
    };
    expect(catalog.movies[0]?.evidence).toEqual(evidence);
    expect(catalog.showings[0]?.evidence).toEqual(evidence);
    for (const failure of [
      "booking",
      "no-festival",
      "venue",
      "foreign-url",
      "original",
      "translation",
      "director",
      "year",
      "runtime",
      "ambiguous-page",
      "unavailable",
    ]) {
      invalid = failure;
      const rejected = await getKinoTicketsExpressMovies(
        2752,
        "karlsruhe_kinemathek",
      );
      expect(
        rejected.movies[0]?.evidence?.officialTitleAliases,
      ).toBeUndefined();
      expect(rejected.showings).toHaveLength(1);
      expect(rejected.movies[0]?.evidence?.runtimeMinutes).toBe(90);
    }
  } finally {
    request.mockRestore();
  }
});

const testCinema = async (slug: string) => {
  const { movies, showings } = await getKinoTicketsExpressMovies(-1, slug);

  console.info(
    `Got ${movies.length} movies with ${showings.length} showings for ${slug}`,
  );

  expect(movies.length).toBeGreaterThan(0);
  expect(showings.length).toBeGreaterThan(0);
};

const testCinemaBookingUrls = async (slug: string) => {
  const { showings } = await getKinoTicketsExpressMovies(-1, slug);

  expect(showings.length).toBeGreaterThan(0);

  for (const showing of showings) {
    expect(showing.bookingUrl).toBeTruthy();
    expect(showing.bookingUrl).not.toContain("undefined");
    expect(showing.bookingUrl).not.toContain("null");

    const url = new URL(showing.bookingUrl);

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("kinotickets.express");
    expect(url.pathname.startsWith(`/${slug}/booking/`)).toBe(true);
  }
};

test(
  "kino tickets express: Schauburg Karlsruhe",
  async () => {
    await testCinema("karlsruhe_schauburg");
  },
  { timeout: 60000 },
);

test(
  "kino tickets express: Schauburg Karlsruhe booking URLs",
  async () => {
    await testCinemaBookingUrls("karlsruhe_schauburg");
  },
  { timeout: 60000 },
);

test(
  "kino tickets express: Kinemathek Karlsruhe",
  async () => {
    await testCinema("karlsruhe_kinemathek");
  },
  { timeout: 20000 },
);

test("kino tickets express: parses provider-local times in Europe/Berlin", () => {
  const parsed = parseKinoTicketsExpressDateTime(
    "2026-04-18 19:00",
    "YYYY-MM-DD HH:mm",
  );

  expect(parsed.toISOString()).toBe("2026-04-18T17:00:00.000Z");
});
