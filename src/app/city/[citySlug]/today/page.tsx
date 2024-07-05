import moment from "moment-timezone";
import City from "../page";
import { type Metadata } from "next";
import { api } from "@waslaeuftin/trpc/server";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";

type PageProps = {
  params: { citySlug?: string };
};

export async function generateMetadata({
  params: { citySlug },
}: PageProps): Promise<Metadata> {
  if (!citySlug) {
    return {
      title: "wasläuft.in - 404",
      description: "Diese Seite konnte nicht gefunden werden.",
    };
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: umlautsFixer(citySlug),
    date: moment().toDate(),
  });

  if (!city) {
    return {
      title: "wasläuft.in - 404",
      description: "Diese Seite konnte nicht gefunden werden.",
    };
  }

  return {
    title: `Welche Filme laufen in ${city.name}`,
    description: `Finde jetzt heraus, welche Filme heute in ${city.name} laufen.`,
  };
}

export default function Page({ params }: PageProps) {
  return (
    <City
      params={params}
      searchParams={{ date: moment().format("YYYY-MM-DD") }}
    />
  );
}
