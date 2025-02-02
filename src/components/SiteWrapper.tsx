import { AppSidebar } from "@waslaeuftin/components/app-sidebar";
import { SiteHeader } from "@waslaeuftin/components/SiteHeader";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@waslaeuftin/components/ui/sidebar";

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
      <AppSidebar searchQuery={searchParams?.searchQuery} />
      <SidebarInset>
        <header className="flex shrink-0 items-center gap-2 border-b px-4 py-4">
          <SidebarTrigger className="-ml-1 h-8 w-8" />
          <SiteHeader pathname={pathname} date={searchParams?.date} />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};
