import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Clapperboard,
  Download,
  Film,
  Sparkles,
} from "lucide-react";

import { SearchTextField } from "@waslaeuftin/components/SearchTextField";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@waslaeuftin/components/ui/sidebar";
import { Constants } from "@waslaeuftin/globals/Constants";
import { api } from "@waslaeuftin/trpc/server";

const normalize = (value?: string | null) => value?.trim() ?? "";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  searchQuery: string | null | undefined;
};

export async function AppSidebar({ searchQuery, ...props }: AppSidebarProps) {
  const normalizedSearchQuery = normalize(searchQuery);
  const cities = await api.cities.getCities(normalizedSearchQuery || undefined);

  let cinemaCount = 0;
  for (const city of cities) {
    cinemaCount += city._count.cinemas;
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-sidebar-border/60 gap-3 border-b px-3 pt-3 pb-4">
        <div className="border-sidebar-border/70 from-sidebar-accent/70 to-sidebar rounded-2xl border bg-gradient-to-br p-3">
          <div className="flex w-full flex-row items-start gap-3">
            <div className="bg-primary/10 text-primary mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg">
              <Clapperboard className="h-4 w-4" />
            </div>
            <div className="max-w-2xl flex-1">
              <Link href="/" className="inline-block">
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                  {Constants.appName}
                </h1>
              </Link>
              <p className="text-sidebar-foreground/75 mt-1 text-sm leading-snug">
                Cinema Atlas für deinen Abend.
              </p>
            </div>
          </div>
          <div className="text-sidebar-foreground/70 mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="border-sidebar-border/70 bg-sidebar rounded-lg border px-2.5 py-2">
              <p className="inline-flex items-center gap-1.5 font-medium">
                <Building2 className="h-3.5 w-3.5" />
                {cities.length}
              </p>
              <p className="mt-0.5">Städte</p>
            </div>
            <div className="border-sidebar-border/70 bg-sidebar rounded-lg border px-2.5 py-2">
              <p className="inline-flex items-center gap-1.5 font-medium">
                <Film className="h-3.5 w-3.5" />
                {cinemaCount}
              </p>
              <p className="mt-0.5">Kinos</p>
            </div>
          </div>
        </div>
        <div className="px-1">
          <SearchTextField />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-2 pb-3">
        {cities.map((city) => (
          <SidebarGroup
            key={city.id}
            className="hover:border-sidebar-border/70 hover:bg-sidebar-accent/35 rounded-xl border border-transparent p-1.5 transition-colors"
          >
            <SidebarGroupLabel
              asChild
              className="text-sidebar-foreground h-auto px-1 py-1.5 text-sm font-semibold"
            >
              <Link
                href={`/city/${city.slug}`}
                className="flex items-center justify-between gap-2"
              >
                <span>{city.name}</span>
                <span className="bg-sidebar-accent text-sidebar-foreground/70 rounded-md px-1.5 py-0.5 text-[11px] font-medium">
                  {city.cinemas.length}
                </span>
              </Link>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {city.cinemas.map((cinema) => (
                  <SidebarMenuItem key={`${cinema.id}-${cinema.name}`}>
                    <SidebarMenuButton
                      asChild
                      size="default"
                      className="h-9 rounded-xl px-2.5 text-[13px] font-normal"
                      isActive={false}
                    >
                      <Link
                        href={`/cinema/${cinema.slug}`}
                        className="truncate"
                      >
                        {cinema.name}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {cities.length === 0 && (
          <div className="border-sidebar-border text-sidebar-foreground/70 mx-2 mt-3 rounded-xl border border-dashed px-3 py-4 text-sm">
            <p className="font-medium">Keine Treffer gefunden.</p>
            <p className="mt-1">
              Suche nach einem anderen Stadt- oder Kinonamen.
            </p>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border/70 gap-2 border-t px-3 py-3">
        <Link
          href="/request-cinema"
          className="text-sidebar-foreground/75 hover:text-sidebar-foreground inline-flex items-center gap-2 rounded-lg text-sm transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Kino fehlt? Jetzt wünschen
        </Link>
        <Link
          href="/download"
          className="text-sidebar-foreground/75 hover:text-sidebar-foreground inline-flex items-center gap-2 rounded-lg text-sm transition-colors"
        >
          <Download className="h-4 w-4" />
          App herunterladen
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
