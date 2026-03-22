import * as React from "react";
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
import { api } from "@waslaeuftin/trpc/server";
import { SearchTextField } from "@waslaeuftin/components/SearchTextField";
import { Constants } from "@waslaeuftin/globals/Constants";
import Link from "next/link";
import { Building2, Clapperboard, Film, Sparkles } from "lucide-react";

const normalize = (value?: string | null) => value?.trim() ?? "";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  searchQuery: string | null | undefined;
};

export async function AppSidebar({ searchQuery, ...props }: AppSidebarProps) {
  const normalizedSearchQuery = normalize(searchQuery);
  const cities = await api.cities.getCities(normalizedSearchQuery || undefined);
  const cinemaCount = cities.reduce((acc, city) => acc + city.cinemas.length, 0);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-3 border-b border-sidebar-border/60 px-3 pb-4 pt-3">
        <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-3">
          <div className="flex w-full flex-row items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clapperboard className="h-4 w-4" />
            </div>
            <div className="max-w-2xl flex-1">
              <Link href="/" className="inline-block">
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                  {Constants.appName}
                </h1>
              </Link>
              <p className="mt-1 text-sm leading-snug text-sidebar-foreground/75">
                Schnell sehen, was heute in deinem Kino läuft.
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-sidebar-foreground/70">
            <div className="rounded-lg border border-sidebar-border/70 bg-sidebar px-2.5 py-2">
              <p className="inline-flex items-center gap-1.5 font-medium">
                <Building2 className="h-3.5 w-3.5" />
                {cities.length}
              </p>
              <p className="mt-0.5">Städte</p>
            </div>
            <div className="rounded-lg border border-sidebar-border/70 bg-sidebar px-2.5 py-2">
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
      <SidebarContent className="px-2 pb-3 pt-2">
        {cities.map((city) => (
          <SidebarGroup
            key={city.id}
            className="rounded-lg border border-transparent p-1.5 transition-colors hover:border-sidebar-border/70 hover:bg-sidebar-accent/20"
          >
            <SidebarGroupLabel
              asChild
              className="h-auto px-1 py-1.5 text-sm font-semibold text-sidebar-foreground"
            >
              <Link
                href={`/city/${city.slug}`}
                className="flex items-center justify-between gap-2"
              >
                <span>{city.name}</span>
                <span className="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[11px] font-medium text-sidebar-foreground/70">
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
                      className="h-9 rounded-lg px-2.5 text-[13px] font-normal"
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
          <div className="mx-2 mt-3 rounded-xl border border-dashed border-sidebar-border px-3 py-4 text-sm text-sidebar-foreground/70">
            <p className="font-medium">Keine Treffer gefunden.</p>
            <p className="mt-1">Suche nach einem anderen Stadt- oder Kinonamen.</p>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 px-3 py-3">
        <Link
          href="/request-cinema"
          className="inline-flex items-center gap-2 rounded-lg text-sm text-sidebar-foreground/75 transition-colors hover:text-sidebar-foreground"
        >
          <Sparkles className="h-4 w-4" />
          Kino fehlt? Jetzt wünschen
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
