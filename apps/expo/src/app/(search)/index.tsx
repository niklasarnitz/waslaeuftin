import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useQuery } from "@tanstack/react-query";

import { useSearch } from "@waslaeuftin/expo/hooks/use-search";
import {
  trackMobileEvent,
  useTrackMobileScreen,
} from "@waslaeuftin/expo/utils/analytics";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { useRefresh } from "@waslaeuftin/expo/utils/refresh";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function SearchIndex() {
  const router = useRouter();
  const primaryColor = usePrimaryColor();
  const { refreshing, onRefresh } = useRefresh();
  useTrackMobileScreen("search");
  const searchOptions = useMemo(
    () => ({
      placeholder: "Stadt oder Kino suchen",
      autoFocus: true,
      // Tapping the search field's cancel (×) returns to the main (Filme) tab.
      onCancelButtonPress: () => router.navigate("/"),
    }),
    [router],
  );
  const searchInput = useSearch(searchOptions);
  const trackedQueriesRef = useRef(new Set<string>());

  // Debounce search input to avoid hitting database on every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch search results
  const searchQuery = useQuery(
    trpc.cities.search.queryOptions(debouncedQuery, {
      enabled: debouncedQuery.trim().length > 0,
    }),
  );

  // Fetch all cities when there is no query
  const allCitiesQuery = useQuery(
    trpc.cities.getCities.queryOptions(undefined, {
      enabled: debouncedQuery.trim().length === 0,
    }),
  );

  const handleCityPress = (citySlug: string) => {
    router.push(`/city/${citySlug}`);
  };

  const handleCinemaPress = (cinemaSlug: string) => {
    router.push(`/cinema/${cinemaSlug}`);
  };

  interface SearchCityItem {
    type: "city";
    item: { id: number; name: string; slug: string };
  }

  interface SearchCinemaItem {
    type: "cinema";
    item: { id: number; name: string; slug: string; city: { name: string } };
  }

  interface SearchHeaderItem {
    type: "header";
    title: string;
  }

  type SearchListItem = SearchCityItem | SearchCinemaItem | SearchHeaderItem;

  // Build list data based on whether we are searching or listing all cities
  const searchResultsData = useMemo(() => {
    if (debouncedQuery.trim().length === 0) return [];

    const data: SearchListItem[] = [];
    const results = searchQuery.data;

    if (results) {
      if (results.cities.length > 0) {
        data.push({ type: "header", title: "Städte" });
        results.cities.forEach((city) => {
          data.push({ type: "city", item: city });
        });
      }

      if (results.cinemas.length > 0) {
        data.push({ type: "header", title: "Kinos" });
        results.cinemas.forEach((cinema) => {
          data.push({ type: "cinema", item: cinema });
        });
      }
    }
    return data;
  }, [debouncedQuery, searchQuery.data]);

  const isLoading = searchQuery.isLoading || allCitiesQuery.isLoading;

  useEffect(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (
      normalizedQuery.length < 2 ||
      !searchQuery.data ||
      trackedQueriesRef.current.has(normalizedQuery)
    ) {
      return;
    }

    trackedQueriesRef.current.add(normalizedQuery);
    trackMobileEvent({
      name: "mobile-search-submitted",
      screen: "search",
      resultCount:
        searchQuery.data.cities.length + searchQuery.data.cinemas.length,
    });
  }, [debouncedQuery, searchQuery.data]);

  return (
    <View className="bg-background flex-1">
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : debouncedQuery.trim().length === 0 ? (
        // List all cities
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={allCitiesQuery.data ?? []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={primaryColor}
            />
          }
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListHeaderComponent={() => (
            <Text className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              Alle Städte
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleCityPress(item.slug)}
              className="bg-card border-border/40 flex-row items-center justify-between rounded-xl border p-4"
              style={{ borderCurve: "continuous" }}
            >
              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-foreground text-base font-bold"
                >
                  {item.name}
                </Text>
                <Text className="text-muted-foreground mt-0.5 text-xs font-medium">
                  {item._count.cinemas}{" "}
                  {item._count.cinemas === 1 ? "Kino" : "Kinos"}
                </Text>
              </View>
              <SymbolView
                name="chevron.right"
                tintColor="#8E8E93"
                size={14}
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          )}
        />
      ) : searchResultsData.length > 0 ? (
        // List search results
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={searchResultsData}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={primaryColor}
            />
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <Text className="text-muted-foreground mt-4 mb-2 text-xs font-semibold tracking-wide uppercase first:mt-0">
                  {item.title}
                </Text>
              );
            }

            if (item.type === "city") {
              return (
                <Pressable
                  onPress={() => handleCityPress(item.item.slug)}
                  className="bg-card border-border/40 mb-2 flex-row items-center justify-between rounded-xl border p-4"
                  style={{ borderCurve: "continuous" }}
                >
                  <View className="min-w-0 flex-1 flex-row items-center gap-3">
                    <SymbolView
                      name="mappin.circle.fill"
                      tintColor={primaryColor}
                      size={18}
                    />
                    <Text
                      numberOfLines={1}
                      className="text-foreground min-w-0 flex-1 text-base font-semibold"
                    >
                      {item.item.name}
                    </Text>
                  </View>
                  <SymbolView
                    name="chevron.right"
                    tintColor="#8E8E93"
                    size={14}
                    style={{ marginLeft: 8 }}
                  />
                </Pressable>
              );
            } else {
              return (
                <Pressable
                  onPress={() => handleCinemaPress(item.item.slug)}
                  className="bg-card border-border/40 mb-2 flex-row items-center justify-between rounded-xl border p-4"
                  style={{ borderCurve: "continuous" }}
                >
                  <View className="min-w-0 flex-1 flex-row items-center gap-3">
                    <SymbolView
                      name="film.fill"
                      tintColor={primaryColor}
                      size={18}
                    />
                    <View className="min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-foreground text-base font-semibold"
                      >
                        {item.item.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-muted-foreground mt-0.5 text-xs font-medium"
                      >
                        in {item.item.city.name}
                      </Text>
                    </View>
                  </View>
                  <SymbolView
                    name="chevron.right"
                    tintColor="#8E8E93"
                    size={14}
                    style={{ marginLeft: 8 }}
                  />
                </Pressable>
              );
            }

            return null;
          }}
        />
      ) : (
        // Empty state
        <View className="flex-1 items-center justify-center p-6">
          <SymbolView name="magnifyingglass" tintColor="#8E8E93" size={48} />
          <Text className="text-foreground mt-4 text-base font-semibold">
            Keine Ergebnisse für "{debouncedQuery}"
          </Text>
          <Text className="text-muted-foreground mt-1 max-w-[240px] text-center text-xs">
            Versuche es mit einem anderen Suchbegriff oder Städtenamen.
          </Text>
        </View>
      )}
    </View>
  );
}
