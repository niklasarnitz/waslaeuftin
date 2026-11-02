import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import type { ComtradaCineOrderMetadata } from "@waslaeuftin/db";
import { additionalCineOrderSources } from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/additionalSources";
import { getCineprogCatalog } from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/getCineprogCatalog";
import { getKinopolisCatalog } from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/getKinopolisCatalog";
import { getPmkinoCatalog } from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/getPmkinoCatalog";
import { getTicketsCatalog } from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/getTicketsCatalog";

export const getComtradaCineOrderMovies = async (
  cinemaId: number,
  metadata: ComtradaCineOrderMetadata,
): Promise<ProviderCatalog> => {
  const host = new URL(metadata.backendUrl).hostname.replace(/^iframe\./, "");
  const source = additionalCineOrderSources.find(
    (entry) =>
      new URL(entry.backendUrl).hostname === host &&
      entry.centerShorty === metadata.centerShorty,
  );
  let catalog: ProviderCatalog;
  if (source) {
    if (metadata.centerId !== source.centerId)
      throw new Error(`Unexpected CineOrder center for ${source.name}`);
    switch (source.format) {
      case "pmkino":
        catalog = await getPmkinoCatalog(
          cinemaId,
          source.baseUrl,
          source.centerId,
        );
        break;
      case "cineprog":
        catalog = await getCineprogCatalog(
          cinemaId,
          source.baseUrl,
          source.centerId,
        );
        break;
      case "tickets":
        catalog = await getTicketsCatalog(
          cinemaId,
          source.baseUrl,
          source.centerId,
        );
        break;
      case "kinopolis":
        catalog = await getKinopolisCatalog(
          cinemaId,
          source.baseUrl,
          source.centerId,
        );
        break;
    }
  } else if (host === "ts.kinopolis.de") {
    const codes: Record<string, string> = {
      kbh: "bh",
      hhc: "hh",
      mtz: "su",
      rnz: "vi",
    };
    const code = codes[metadata.centerShorty] ?? metadata.centerShorty;
    const domain =
      code === "mm"
        ? "www.mathaeser.de"
        : code === "gp"
          ? "www.gloria-palast.de"
          : "www.kinopolis.de";
    catalog = await getKinopolisCatalog(
      cinemaId,
      `https://${domain}/${code}`,
      metadata.centerId,
    );
  } else if (
    host === "cineorder.forumcinemas.de" ||
    host === "cineorder.filmpalast.net"
  ) {
    const forumSites: Record<string, string> = {
      fra: "rastatt",
      fof: "offenburg",
      flr: "lahr",
    };
    const site = forumSites[metadata.centerShorty];
    if (host === "cineorder.forumcinemas.de" && !site)
      throw new Error(`Unknown Forum cinema: ${metadata.centerShorty}`);
    const baseUrl =
      host === "cineorder.filmpalast.net"
        ? "https://filmpalast.net"
        : `https://${site}.forumcinemas.de`;
    catalog = await getPmkinoCatalog(cinemaId, baseUrl, metadata.centerId);
  } else if (host === "cineorder.kinocentergernsbach.de") {
    catalog = await getCineprogCatalog(
      cinemaId,
      "https://www.kinocentergernsbach.de",
      metadata.centerId,
    );
  } else {
    throw new Error(`Unknown public programme source: ${metadata.backendUrl}`);
  }
  return { ...catalog, provider: "ComtradaCineOrder" };
};
