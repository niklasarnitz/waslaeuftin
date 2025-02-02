import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@waslaeuftin/components/ui/sidebar";
import { api } from "@waslaeuftin/trpc/server";
import { SearchTextField } from "@waslaeuftin/components/SearchTextField";
import { Constants } from "@waslaeuftin/globals/Constants";
import Link from "next/link";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  searchQuery: string | null | undefined;
};

export async function AppSidebar({ searchQuery, ...props }: AppSidebarProps) {
  const cities = await api.cities.getCities(searchQuery ?? undefined);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex w-full flex-row items-center gap-2">
          <div className="max-w-2xl flex-1 flex-col justify-start">
            <Link href="/">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                {Constants.appName}
              </h1>
            </Link>
            <Link href="/">
              <p className="text-gray-500">{Constants.home.subtitle}</p>
            </Link>
          </div>
        </div>
        <SearchTextField />
      </SidebarHeader>
      <SidebarContent>
        {cities.map((city) => (
          <SidebarGroup key={city.id}>
            <SidebarGroupLabel asChild className="text-base">
              <a href={`/city/${city.slug}`}>{city.name}</a>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {city.cinemas.map((cinema) => (
                  <SidebarMenuItem key={`${cinema.id}-${cinema.name}`}>
                    <SidebarMenuButton asChild isActive={true} size={"lg"}>
                      <a
                        href={`/cinema/${cinema.slug}`}
                        className="line overflow-ellipsis"
                      >
                        {cinema.name}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
