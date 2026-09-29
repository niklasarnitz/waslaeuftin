// Chains whose website is Webedia's Gatsby build on top of the Boxoffice API.
// They all work the same way; only the domain and the page that lists the
// theaters differ. Cinemas store the domain (`Cinema.boxofficeDomain`), which
// picks the chain here.
export interface BoxofficeChain {
  /** Display name, used in logs and for seeding. */
  name: string;
  /** Site origin without a trailing slash. */
  domain: string;
  /** Path of the page listing all theaters, without slashes. */
  listingPath: string;
  /**
   * Time zone the showtimes are in. The theaters' own `timeZone` field is not
   * reliable (some UK theaters say "Europe/Paris").
   */
  timeZone: string;
}

export const boxofficeChains = {
  cineworld: {
    name: "Cineworld",
    domain: "https://www.cineworld.co.uk",
    listingPath: "cinemas",
    timeZone: "Europe/London",
  },
  everyman: {
    name: "Everyman",
    domain: "https://www.everymancinema.com",
    listingPath: "venues-list",
    timeZone: "Europe/London",
  },
  showcase: {
    name: "Showcase",
    domain: "https://www.showcasecinemas.co.uk",
    listingPath: "cinemas",
    timeZone: "Europe/London",
  },
} satisfies Record<string, BoxofficeChain>;

export type BoxofficeChainKey = keyof typeof boxofficeChains;

export const getBoxofficeChainByDomain = (domain: string): BoxofficeChain => {
  const normalizedDomain = domain.replace(/\/+$/, "");
  const chain = Object.values(boxofficeChains).find(
    (c) => c.domain === normalizedDomain,
  );

  if (!chain) {
    throw new Error(`Unknown Boxoffice domain: ${domain}`);
  }

  return chain;
};
