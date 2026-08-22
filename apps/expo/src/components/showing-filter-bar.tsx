import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { ShowingFilterOptions } from "@waslaeuftin/core";
import type { SortByOption } from "@waslaeuftin/expo/utils/settings";
import { TAG_OPTIONS, TIME_OPTIONS } from "@waslaeuftin/core";

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
    <View className="mb-3 gap-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {/* Reset / Active Badge */}
        {activeCount > 0 && (
          <Pressable
            onPress={resetFilters}
            className="bg-primary/20 border-primary/40 flex-row items-center gap-1 rounded-full border px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-primary text-xs font-bold">
              ✕ Filter ({activeCount})
            </Text>
          </Pressable>
        )}

        {/* Sort Pill */}
        {sortBy && onChangeSortBy && (
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              onChangeSortBy(sortBy === "popularity" ? "name" : "popularity");
            }}
            className="bg-primary/15 border-primary/40 flex-row items-center gap-1 rounded-full border px-3 py-1.5 active:opacity-75"
          >
            <Text className="text-primary text-xs font-semibold">
              Sortierung:{" "}
              {sortBy === "popularity" ? "🔥 Beliebtheit" : "🔤 Name"}
            </Text>
          </Pressable>
        )}

        {/* Format Tags */}
        {TAG_OPTIONS.map((opt) => {
          const isSelected = filters.selectedTags.includes(opt.id);
          return (
            <Pressable
              key={`filter-tag-${opt.id}`}
              onPress={() => toggleTag(opt.id)}
              className={`rounded-full border px-3 py-1.5 active:opacity-75 ${
                isSelected
                  ? "bg-primary border-primary"
                  : "bg-muted/80 border-border/60"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isSelected ? "text-white" : "text-foreground"
                }`}
              >
                {opt.label}
              </Text>
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
              className={`rounded-full border px-3 py-1.5 active:opacity-75 ${
                isSelected
                  ? "border-amber-600 bg-amber-600 dark:border-amber-500 dark:bg-amber-500"
                  : "bg-muted/80 border-border/60"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isSelected ? "text-white" : "text-foreground"
                }`}
              >
                🕒 {timeOpt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
