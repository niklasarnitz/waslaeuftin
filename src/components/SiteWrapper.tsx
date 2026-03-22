import { SiteHeader } from "@waslaeuftin/components/SiteHeader";

export const SiteWrapper = async ({
  pathname,
  searchParams,
  children,
}: {
  children: React.ReactNode;
  pathname: string | null;
  searchParams: {
    date?: string | null | undefined;
    searchQuery?: string | null | undefined;
  };
}) => {
  return (
    <>
      <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl md:px-6">
        <SiteHeader pathname={pathname} date={searchParams?.date} />
      </header>
      <div className="flex-1">{children}</div>
    </>
  );
};
