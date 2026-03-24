import { type Metadata } from "next";
import { cookies } from "next/headers";

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
  const awaitedCookies = await cookies();
  const radiusCookie = awaitedCookies.get("nearby-radius")?.value;
  const initialRadius = radiusCookie ? Number.parseInt(radiusCookie, 10) : 20;

  return (
    <SiteWrapper pathname={pathname} searchParams={decodedParams}>
      <main className="mx-auto w-full max-w-[1200px]">
        <section className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
          <NearbyCinemasSection initialRadius={initialRadius} />
        </section>
      </main>
    </SiteWrapper>
  );
}
