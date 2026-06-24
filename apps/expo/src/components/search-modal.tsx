import type { Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { trackMobileEvent } from "@waslaeuftin/expo/utils/analytics";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

// Shared card class for every result row.
const ROW_CLASS =
  "bg-card border-border mb-2 flex-row items-center justify-between rounded-xl border p-3.5";

// ─── Icon wrapper ────────────────────────────────────────────────────────────
// We deliberately avoid SymbolView in list rows because it is iOS-only and
// renders nothing on Android.  Ionicons work on both platforms.
function ItemIcon({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View className="bg-primary/10 h-9 w-9 items-center justify-center rounded-[10px]">
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  color: string;
}) {
  return (
    <View className="mt-4 mb-2 flex-row items-center gap-1.5">
      <Ionicons name={icon} size={13} color={color} />
      <Text className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </Text>
    </View>
  );
}

export function SearchModal({ visible, onClose }: SearchModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {visible ? <SearchModalContent onClose={onClose} /> : null}
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function SearchModalContent({ onClose }: Pick<SearchModalProps, "onClose">) {
  const router = useRouter();
  const primaryColor = usePrimaryColor();
  const isDark = useColorScheme() === "dark";
  // Icon tint passed as a prop (not a style object) — kept as a value.
  const mutedColor = isDark ? "#8E8E93" : "#6C6C70";
  const inputRef = useRef<TextInput>(null);
  const trackedQueriesRef = useRef(new Set<string>());

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Focus when modal opens. This component remounts for each opening, which
  // resets the query state without a synchronous state update in an effect.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(handler);
  }, [query]);

  const isSearching = debouncedQuery.trim().length > 0;

  // Queries
  const citiesSearchQuery = useQuery(
    trpc.cities.search.queryOptions(debouncedQuery, {
      enabled: isSearching,
    }),
  );
  const allCitiesQuery = useQuery(
    trpc.cities.getCities.queryOptions(undefined, {
      enabled: !isSearching,
    }),
  );

  // Navigation helpers
  const go = (path: Href<string>) => {
    onClose();
    setTimeout(() => router.push(path), 200);
  };

  // ── Types ──
  interface CityItem {
    type: "city";
    item: { id: number; name: string; slug: string };
  }
  interface CinemaItem {
    type: "cinema";
    item: { id: number; name: string; slug: string; city: { name: string } };
  }
  interface HeaderItem {
    type: "header";
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
  }
  type ListItem = CityItem | CinemaItem | HeaderItem;

  // Build flat list for search results
  const searchResultsData = useMemo((): ListItem[] => {
    if (!isSearching) return [];
    const data: ListItem[] = [];
    const cities = citiesSearchQuery.data;

    if (cities) {
      if (cities.cities.length > 0) {
        data.push({ type: "header", icon: "location", title: "Städte" });
        cities.cities.forEach((c) => data.push({ type: "city", item: c }));
      }
      if (cities.cinemas.length > 0) {
        data.push({ type: "header", icon: "videocam", title: "Kinos" });
        cities.cinemas.forEach((c) => data.push({ type: "cinema", item: c }));
      }
    }
    return data;
  }, [isSearching, citiesSearchQuery.data]);

  const isLoading =
    (isSearching && citiesSearchQuery.isLoading) ||
    (!isSearching && allCitiesQuery.isLoading);

  const hasNoResults =
    isSearching && !isLoading && searchResultsData.length === 0;

  useEffect(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (
      normalizedQuery.length < 2 ||
      !citiesSearchQuery.data ||
      trackedQueriesRef.current.has(normalizedQuery)
    ) {
      return;
    }

    trackedQueriesRef.current.add(normalizedQuery);
    trackMobileEvent({
      name: "mobile-search-submitted",
      screen: "home",
      resultCount:
        citiesSearchQuery.data.cities.length +
        citiesSearchQuery.data.cinemas.length,
    });
  }, [citiesSearchQuery.data, debouncedQuery]);

  // ── Render a single result row ──
  const renderResultItem = ({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <SectionHeader
          icon={item.icon}
          title={item.title}
          color={primaryColor}
        />
      );
    }

    if (item.type === "city") {
      return (
        <Pressable
          onPress={() => go(`/city/${item.item.slug}`)}
          className={ROW_CLASS}
        >
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <ItemIcon name="location" color={primaryColor} />
            <Text
              numberOfLines={1}
              className="text-foreground flex-1 text-[15px] font-semibold"
            >
              {item.item.name}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={mutedColor}
            style={{ marginLeft: 8 }}
          />
        </Pressable>
      );
    }

    // cinema
    return (
      <Pressable
        onPress={() =>
          go({
            pathname: "/cinema/[cinemaSlug]",
            params: { cinemaSlug: item.item.slug, name: item.item.name },
          })
        }
        className={ROW_CLASS}
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <ItemIcon name="videocam" color={primaryColor} />
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className="text-foreground text-[15px] font-semibold"
            >
              {item.item.name}
            </Text>
            <Text
              numberOfLines={1}
              className="text-muted-foreground mt-px text-xs"
            >
              in {item.item.city.name}
            </Text>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={mutedColor}
          style={{ marginLeft: 8 }}
        />
      </Pressable>
    );
  };

  return (
    <View className="bg-background flex-1">
      {/* ── Header ── */}
      <View
        className={`flex-row items-center gap-3 px-4 pb-3 ${
          Platform.OS === "ios" ? "pt-5" : "pt-4"
        }`}
      >
        <View className="bg-secondary flex-1 flex-row items-center gap-2 rounded-xl px-3 py-2.5">
          <Ionicons name="search" size={16} color={mutedColor} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Filme, Kinos oder Städte suchen"
            placeholderTextColor={mutedColor}
            className="text-foreground flex-1 p-0 text-base"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text className="text-primary text-base font-semibold">
            Abbrechen
          </Text>
        </Pressable>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : hasNoResults ? (
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="search-outline" size={48} color={mutedColor} />
          <Text className="text-foreground mt-4 text-center text-base font-semibold">
            Keine Ergebnisse für „{debouncedQuery}"
          </Text>
          <Text className="text-muted-foreground mt-1.5 max-w-[240px] text-center text-[13px]">
            Versuche einen anderen Film-, Kino- oder Städtenamen.
          </Text>
        </View>
      ) : isSearching ? (
        <FlatList
          data={searchResultsData}
          keyExtractor={(item, i) => `${item.type}-${i}`}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          keyboardShouldPersistTaps="handled"
          renderItem={renderResultItem}
        />
      ) : (
        // Default: all cities
        <FlatList
          data={allCitiesQuery.data ?? []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListHeaderComponent={() => (
            <View className="mb-3 flex-row items-center gap-1.5">
              <Ionicons name="location" size={14} color={primaryColor} />
              <Text className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Alle Städte
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => go(`/city/${item.slug}`)}
              className={ROW_CLASS}
            >
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <ItemIcon name="location" color={primaryColor} />
                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-foreground text-[15px] font-bold"
                  >
                    {item.name}
                  </Text>
                  <Text className="text-muted-foreground mt-px text-xs">
                    {item._count.cinemas}{" "}
                    {item._count.cinemas === 1 ? "Kino" : "Kinos"}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={mutedColor}
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
