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

import { trpc } from "@waslaeuftin/expo/utils/api";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Icon wrapper ────────────────────────────────────────────────────────────
// We deliberately avoid SymbolView in list rows because it is iOS-only and
// renders nothing on Android.  Ionicons work on both platforms.
function ItemIcon({
  name,
  color,
  bg,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  color,
  muted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  color: string;
  muted: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 16,
        marginBottom: 8,
      }}
    >
      <Ionicons name={icon} size={13} color={color} />
      <Text
        style={{
          color: muted,
          fontSize: 12,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const inputRef = useRef<TextInput>(null);

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
  const go = (path: `/city/${string}` | `/cinema/${string}`) => {
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

  // ── Colours ──
  const bgColor = isDark ? "#1C1C1E" : "#F2F2F7";
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const mutedColor = isDark ? "#8E8E93" : "#6C6C70";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const inputBg = isDark ? "#3A3A3C" : "#E5E5EA";
  const iconBg = `${primaryColor}20`;

  // ── Card style ──
  const cardStyle = {
    backgroundColor: cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  };

  // ── Render a single result row ──
  const renderResultItem = ({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <SectionHeader
          icon={item.icon}
          title={item.title}
          color={primaryColor}
          muted={mutedColor}
        />
      );
    }

    if (item.type === "city") {
      return (
        <Pressable
          onPress={() => go(`/city/${item.item.slug}`)}
          style={cardStyle}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <ItemIcon name="location" color={primaryColor} bg={iconBg} />
            <Text style={{ color: textColor, fontSize: 15, fontWeight: "600" }}>
              {item.item.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={mutedColor} />
        </Pressable>
      );
    }

    // cinema
    return (
      <Pressable
        onPress={() => go(`/cinema/${item.item.slug}`)}
        style={cardStyle}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <ItemIcon name="videocam" color={primaryColor} bg={iconBg} />
          <View>
            <Text style={{ color: textColor, fontSize: 15, fontWeight: "600" }}>
              {item.item.name}
            </Text>
            <Text style={{ color: mutedColor, fontSize: 12, marginTop: 1 }}>
              in {item.item.city.name}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={14} color={mutedColor} />
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "ios" ? 20 : 16,
          paddingBottom: 12,
          gap: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: inputBg,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <Ionicons name="search" size={16} color={mutedColor} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Filme, Kinos oder Städte suchen"
            placeholderTextColor={mutedColor}
            style={{
              flex: 1,
              fontSize: 16,
              color: textColor,
              padding: 0,
            }}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text
            style={{ color: primaryColor, fontSize: 16, fontWeight: "600" }}
          >
            Abbrechen
          </Text>
        </Pressable>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : hasNoResults ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Ionicons name="search-outline" size={48} color={mutedColor} />
          <Text
            style={{
              color: textColor,
              fontSize: 16,
              fontWeight: "600",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Keine Ergebnisse für „{debouncedQuery}"
          </Text>
          <Text
            style={{
              color: mutedColor,
              fontSize: 13,
              marginTop: 6,
              textAlign: "center",
              maxWidth: 240,
            }}
          >
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
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListHeaderComponent={() => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <Ionicons name="location" size={14} color={primaryColor} />
              <Text
                style={{
                  color: mutedColor,
                  fontSize: 12,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Alle Städte
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => go(`/city/${item.slug}`)}
              style={cardStyle}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <ItemIcon name="location" color={primaryColor} bg={iconBg} />
                <View>
                  <Text
                    style={{
                      color: textColor,
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{ color: mutedColor, fontSize: 12, marginTop: 1 }}
                  >
                    {item._count.cinemas}{" "}
                    {item._count.cinemas === 1 ? "Kino" : "Kinos"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color={mutedColor} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
