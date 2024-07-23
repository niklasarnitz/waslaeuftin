import moment from "moment-timezone";
import City from "../page";
import { type Metadata } from "next";
import { api } from "@waslaeuftin/trpc/server";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { type Locale } from "@waslaeuftin/i18n/settings";
import { serverSideTranslations } from "@waslaeuftin/i18n/i18n";

type PageProps = {
  params: { citySlug?: string; locale: Locale };
};

export async function generateMetadata({
  params: { citySlug, locale },
}: PageProps): Promise<Metadata> {
  const { t } = await serverSideTranslations(locale);

  const notFoundTitle = `${t("appName")} - ${t("error")} 404 - ${t("not.found")}`;
  const notFoundDescription = t("page.not.found");

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
    title: t("what.movies.are.showing.in.x", {
      city: city.name,
    }),
    description: t("find.out.which.movies.are.showing.in.x.cta", {
      city: city.name,
    }),
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
