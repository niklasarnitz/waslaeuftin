import type {
  OdeonSite,
  OdeonSitesResponse,
} from "@waslaeuftin/cinema-providers/internal/providers/odeon/types/OdeonOcapi";
import { getOdeonJson } from "@waslaeuftin/cinema-providers/internal/providers/odeon/odeonApi";

/** All ODEON sites (cinemas) the website sells tickets for. */
export const getOdeonSites = async (): Promise<OdeonSite[]> => {
  const response = await getOdeonJson<OdeonSitesResponse | OdeonSite[]>(
    "/ocapi/v1/sites",
  );
  const sites = Array.isArray(response) ? response : response.sites;

  return sites.filter((site) => site.isAvailableForSale !== false);
};
