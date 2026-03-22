import { AppSidebar } from "@waslaeuftin/components/app-sidebar";
import { SiteHeader } from "@waslaeuftin/components/SiteHeader";
import { SidebarInset, SidebarProvider } from "@waslaeuftin/components/ui/sidebar";

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
    <SidebarProvider>
      <AppSidebar searchQuery={searchParams?.searchQuery} collapsible="none" />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur md:px-6">
          <SiteHeader pathname={pathname} date={searchParams?.date} />
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};
