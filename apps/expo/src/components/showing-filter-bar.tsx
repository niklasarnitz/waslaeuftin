import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { ShowingFilterOptions } from "@waslaeuftin/core";
import type { SortByOption } from "@waslaeuftin/expo/utils/settings";
import { TAG_OPTIONS, TIME_OPTIONS } from "@waslaeuftin/core";
import { AppIcon } from "@waslaeuftin/expo/components/app-icon";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

interface ShowingFilterBarProps {
  filters: ShowingFilterOptions;
  onChangeFilters: (filters: ShowingFilterOptions) => void;
  sortBy?: SortByOption;
  onChangeSortBy?: (sortBy: SortByOption) => void;
}

export function ShowingFilterBar({
  filters,
  onChangeFilters,
  sortBy,
  onChangeSortBy,
}: ShowingFilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const primaryColor = usePrimaryColor();
  const toggleTag = (tagId: string) => {
    void Haptics.selectionAsync();
    const exists = filters.selectedTags.includes(tagId);
    const newTags = exists
      ? filters.selectedTags.filter((t) => t !== tagId)
      : [...filters.selectedTags, tagId];
    onChangeFilters({ ...filters, selectedTags: newTags });
  };

  const selectTime = (timeId: ShowingFilterOptions["timeWindow"]) => {
    void Haptics.selectionAsync();
    onChangeFilters({ ...filters, timeWindow: timeId });
  };

  const activeCount =
    filters.selectedTags.length + (filters.timeWindow !== "all" ? 1 : 0);

  const resetFilters = () => {
    void Haptics.selectionAsync();
    onChangeFilters({ selectedTags: [], timeWindow: "all" });
  };

  return (
    <View>
      <View className="mx-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => setExpanded(!expanded)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`Filter${activeCount ? `, ${activeCount} aktiv` : ""}`}
          style={{ minHeight: 44 }}
          className="flex-row items-center gap-1.5 active:opacity-70"
        >
          <AppIcon name="slider.horizontal.3" size={16} color={primaryColor} />
          <Text className="text-primary text-sm font-medium">
            Filter{activeCount ? ` (${activeCount})` : ""}
          </Text>
        </Pressable>
        {sortBy && onChangeSortBy && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sortierung: ${sortBy === "popularity" ? "Beliebtheit" : "Name"}. Zum Wechseln tippen`}
            onPress={() => {
              void Haptics.selectionAsync();
              onChangeSortBy(sortBy === "popularity" ? "name" : "popularity");
            }}
            style={{ minHeight: 44 }}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Text className="text-primary text-sm font-medium">
              {sortBy === "popularity" ? "Beliebtheit" : "Name"}
            </Text>
            <AppIcon
              name="arrow.up.arrow.down"
              size={12}
              color={primaryColor}
            />
          </Pressable>
        )}
      </View>
      {expanded && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {/* Reset / Active Badge */}
          {activeCount > 0 && (
            <Pressable
              onPress={resetFilters}
              accessibilityRole="button"
              accessibilityLabel={`${activeCount} aktive Filter zurücksetzen`}
              style={{ minHeight: 44 }}
              className="justify-center active:opacity-70"
            >
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  minHeight: 30,
                }}
                className="bg-primary/10 rounded-full"
              >
                <Text className="text-primary text-xs font-semibold">
                  Zurücksetzen ({activeCount})
                </Text>
              </View>
            </Pressable>
          )}

          {/* Format Tags */}
          {TAG_OPTIONS.map((opt) => {
            const isSelected = filters.selectedTags.includes(opt.id);
            return (
              <Pressable
                key={`filter-tag-${opt.id}`}
                onPress={() => toggleTag(opt.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={{ minHeight: 44, minWidth: 44 }}
                className="justify-center active:opacity-75"
              >
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    minHeight: 30,
                  }}
                  className={`items-center rounded-full ${
                    isSelected ? "bg-action" : "bg-card"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {/* Time Windows */}
          {TIME_OPTIONS.filter((t) => t.id !== "all").map((timeOpt) => {
            const isSelected = filters.timeWindow === timeOpt.id;
            return (
              <Pressable
                key={`filter-time-${timeOpt.id}`}
                onPress={() => selectTime(isSelected ? "all" : timeOpt.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={{ minHeight: 44 }}
                className="justify-center active:opacity-75"
              >
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    minHeight: 30,
                  }}
                  className={`rounded-full ${
                    isSelected ? "bg-action" : "bg-card"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-foreground"
                    }`}
                  >
                    {timeOpt.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
