import { CinemaMovies } from "@waslaeuftin/components/CinemaMovies";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { SiteWrapper } from "@waslaeuftin/components/SiteWrapper";
import { Constants } from "@waslaeuftin/globals/Constants";
import { getPathName } from "@waslaeuftin/helpers/getPathName";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { type Metadata } from "next";
import { Suspense } from "react";

type CinemaPageProps = {
  params: Promise<{ cinemaSlug?: string }>;
  searchParams: Promise<{ date?: string; searchQuery?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: CinemaPageProps): Promise<Metadata> {
  const { cinemaSlug } = await params;
  const { date } = await searchParams;

  const notFoundTitle = `${Constants.appName} - ${Constants.error} 404 - ${Constants["not-found"].page}`;

  if (!cinemaSlug) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
    };
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: umlautsFixer(cinemaSlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!cinema) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
    };
  }

  const city = await api.cities.getCityById(cinema.cityId);

  return {
    title: Constants["what-movies-are-showing-in"].cinema(
      `${cinema.name}${city ? ` in ${city.name}` : ""}`,
    ),
    description: Constants["find-out-which-movies-are-showing-in"].cinema,
  };
}

export default async function CinemaPage({
  params,
  searchParams,
}: CinemaPageProps) {
  const { cinemaSlug } = await params;
  const decodedParams = await searchParams;
  const pathname = await getPathName();

  if (!cinemaSlug) {
    return <div>{Constants["not-found"].page}</div>;
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: umlautsFixer(cinemaSlug),
    date: decodedParams.date ? moment(decodedParams.date).toDate() : undefined,
  });

  if (!cinema) {
    return <div>{Constants["not-found"].page}</div>;
  }

  return (
    <SiteWrapper pathname={pathname} searchParams={decodedParams}>
      <main>
        <section className="px-8 py-4">
          <Suspense fallback={<LoadingSpinner />}>
            <CinemaMovies cinema={cinema} />
          </Suspense>
        </section>
      </main>
    </SiteWrapper>
  );
}
