import { type Metadata } from "next";
import { Constants } from "@waslaeuftin/globals/Constants";
import { SiteWrapper } from "@waslaeuftin/components/SiteWrapper";
import { getPathName } from "@waslaeuftin/helpers/getPathName";
import { NearbyCinemasSection } from "@waslaeuftin/components/NearbyCinemasSection";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: Constants.appName,
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

  return (
    <SiteWrapper pathname={pathname} searchParams={decodedParams}>
      <main className="mx-auto w-full max-w-[1200px]">
        <section className="px-4 py-6 md:px-6 md:py-8">
          <NearbyCinemasSection />
        </section>
      </main>
    </SiteWrapper>
  );
}
