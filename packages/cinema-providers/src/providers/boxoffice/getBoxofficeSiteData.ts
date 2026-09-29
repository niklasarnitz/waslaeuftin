import type { BoxofficeChain } from "@waslaeuftin/cinema-providers/internal/providers/boxoffice/boxofficeChains";
import type {
  BoxofficeAttributeNode,
  BoxofficeMovieDetails,
  BoxofficeMovieNode,
  BoxofficePageData,
  BoxofficeStaticQuery,
  BoxofficeTheaterNode,
  BoxofficeTheaterStub,
} from "@waslaeuftin/cinema-providers/internal/providers/boxoffice/types/BoxofficeTypes";
import {
  getBoxofficeJson,
  getBoxofficeText,
} from "@waslaeuftin/cinema-providers/internal/providers/boxoffice/getBoxofficeText";

// How many movie IDs to put into one /movies request.
const MOVIE_DETAILS_BATCH_SIZE = 100;

/**
 * Chain-wide data from the site build. Load it once per run and pass it to
 * `getBoxofficeMovies` for every theater of the chain.
 */
export interface BoxofficeSiteData {
  chain: BoxofficeChain;
  assetPrefix: string;
  theaters: BoxofficeTheaterNode[];
  /** Movie ID → display title. Filled lazily for movies missing from the build. */
  movieTitles: Map<string, string>;
  /** Tag → label, per theater (`{theaterId}_{tag}`) and chain-wide (`{tag}`). */
  attributeLabels: Map<string, string>;
}

const isTheaterNode = (
  theater: BoxofficeTheaterNode | BoxofficeTheaterStub,
): theater is BoxofficeTheaterNode =>
  "practicalInfo" in theater && "name" in theater;

const getAssetPrefix = (html: string, chain: BoxofficeChain) => {
  const assetPrefix = /src="([^"]+?)webpack-runtime-/i.exec(html)?.[1];
  if (!assetPrefix) {
    throw new Error(
      `Could not find the asset prefix on ${chain.domain}/${chain.listingPath}`,
    );
  }
  return assetPrefix;
};

const cleanTitle = (title: string) => title.replace(/\s+/g, " ").trim();

/** Prefers the localized title, which is free of promo prefixes. */
const getDetailsTitle = (details: BoxofficeMovieDetails) =>
  cleanTitle(details.locale?.title ?? details.title);

/**
 * Loads titles for the given movie IDs from the /movies endpoint into
 * `siteData.movieTitles`.
 */
export const loadBoxofficeMovieTitles = async (
  siteData: BoxofficeSiteData,
  movieIds: string[],
) => {
  for (
    let index = 0;
    index < movieIds.length;
    index += MOVIE_DETAILS_BATCH_SIZE
  ) {
    // Same parameters as the site itself uses.
    const params = new URLSearchParams({ basic: "false", castingLimit: "10" });
    for (const id of movieIds.slice(index, index + MOVIE_DETAILS_BATCH_SIZE)) {
      params.append("ids", id);
    }

    const details = await getBoxofficeJson<BoxofficeMovieDetails[]>(
      `${siteData.chain.domain}/api/gatsby-source-boxofficeapi/movies?${params.toString()}`,
    );

    for (const movie of details) {
      const title = getDetailsTitle(movie);
      if (title) siteData.movieTitles.set(movie.id, title);
    }
  }
};

const buildAttributeLabels = (attributes: BoxofficeAttributeNode[]) => {
  const labels = new Map<string, string>();

  for (const attribute of attributes) {
    const label = attribute.localizations[0]?.label?.trim();
    if (!label) continue;
    labels.set(attribute.id, label);
    if (!labels.has(attribute.tag)) labels.set(attribute.tag, label);
  }

  return labels;
};

export const getBoxofficeSiteData = async (
  chain: BoxofficeChain,
): Promise<BoxofficeSiteData> => {
  const html = await getBoxofficeText(`${chain.domain}/${chain.listingPath}`);
  const assetPrefix = getAssetPrefix(html, chain);

  const pageData = await getBoxofficeJson<BoxofficePageData>(
    `${assetPrefix}page-data/${chain.listingPath}/page-data.json`,
  );

  const hashes = pageData.staticQueryHashes ?? [];
  if (hashes.length === 0) {
    throw new Error(
      `No static queries in the ${chain.name} page data; the site structure may have changed`,
    );
  }

  let movies: BoxofficeMovieNode[] | undefined;
  let attributes: BoxofficeAttributeNode[] | undefined;
  let theaters: BoxofficeTheaterNode[] | undefined;

  // Stop as soon as we have everything; the other static queries are menus,
  // settings etc.
  for (const hash of hashes) {
    if (movies && attributes && theaters) break;

    const { data } = await getBoxofficeJson<BoxofficeStaticQuery>(
      `${assetPrefix}page-data/sq/d/${hash}.json`,
    );

    if (data?.allMovie) movies = data.allMovie.nodes;
    if (data?.allAttribute) attributes = data.allAttribute.nodes;

    const theaterNodes = data?.allTheater?.nodes.filter(isTheaterNode);
    if (theaterNodes && theaterNodes.length > 0) theaters = theaterNodes;
  }

  if (!movies || !attributes || !theaters) {
    throw new Error(
      `Missing ${[
        !movies && "movies",
        !attributes && "attributes",
        !theaters && "theaters",
      ]
        .filter(Boolean)
        .join(
          ", ",
        )} in the ${chain.name} page data; the site structure may have changed`,
    );
  }

  const siteData: BoxofficeSiteData = {
    chain,
    assetPrefix,
    theaters,
    movieTitles: new Map(
      movies.map((movie) => [movie.id, cleanTitle(movie.title)]),
    ),
    attributeLabels: buildAttributeLabels(attributes),
  };

  // The build's titles can carry promo prefixes ("Cineworld 30: The Matrix");
  // the movie details have the plain title. Best effort: keep the build's
  // titles if this fails.
  try {
    await loadBoxofficeMovieTitles(
      siteData,
      movies.map((movie) => movie.id),
    );
  } catch (error) {
    console.warn(
      `[Boxoffice] Could not load ${chain.name} movie details, using titles from the site build: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return siteData;
};
