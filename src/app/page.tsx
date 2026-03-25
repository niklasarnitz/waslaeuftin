import { type Metadata } from "next";

import { Constants } from "@waslaeuftin/globals/Constants";
import { SiteWrapper } from "@waslaeuftin/components/SiteWrapper";
import { getPathName } from "@waslaeuftin/helpers/getPathName";
import { NearbyCinemasSection } from "@waslaeuftin/components/NearbyCinemasSection";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: `${Constants.home.title} | ${Constants.appName}`,
    description: Constants.home.cta,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string | null | undefined;
    searchQuery?: string | null | undefined;
  }>;
}) {
  const pathname = await getPathName();
  const decodedParams = await searchParams;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: Constants.appName,
    url: "https://waslaeuft.in/",
    description: Constants.home.cta,
    potentialAction: {
      "@type": "SearchAction",
      target: "https://waslaeuft.in/?searchQuery={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <SiteWrapper pathname={pathname} searchParams={decodedParams}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-[1200px]">
        <section className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
          <NearbyCinemasSection />
        </section>
      </main>
    </SiteWrapper>
  );
}
