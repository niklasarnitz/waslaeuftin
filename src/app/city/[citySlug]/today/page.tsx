import moment from "moment-timezone";
import City from "../page";
import { type Metadata } from "next";
import { api } from "@waslaeuftin/trpc/server";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { Constants } from "@waslaeuftin/globals/Constants";

type PageProps = {
  params: Promise<{ citySlug?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { citySlug } = await params;

  const notFoundTitle = `${Constants.appName} - ${Constants.error} 404 - ${Constants["not-found"].page}`;
  const notFoundDescription = Constants["not-found"].page;

  if (!citySlug) {
    return {
      title: notFoundTitle,
      description: notFoundDescription,
    };
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: umlautsFixer(citySlug),
    date: moment().toDate(),
  });

  if (!city) {
    return {
      title: notFoundTitle,
      description: notFoundDescription,
    };
  }

  return {
    title: Constants["what-movies-are-showing-in"].city(city.name),
    description: Constants["find-out-which-movies-are-showing-in"].city(
      city.name,
    ),
  };
}

export default function Page({ params }: PageProps) {
  const searchParams = new Promise<{ date: string }>((resolve) => {
    resolve({ date: moment().format("YYYY-MM-DD") });
  });

  return <City params={params} searchParams={searchParams} />;
}
