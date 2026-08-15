import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { ShowingFilterOptions } from "@waslaeuftin/expo/utils/showing-tags";

interface ShowingFilterBarProps {
  filters: ShowingFilterOptions;
  onChangeFilters: (filters: ShowingFilterOptions) => void;
}

const TAG_OPTIONS = [
  { id: "OV", label: "OV" },
  { id: "OmU", label: "OmU" },
  { id: "3D", label: "3D" },
  { id: "IMAX", label: "IMAX" },
  { id: "70mm/35mm", label: "70mm / 35mm" },
  { id: "Atmos", label: "Atmos" },
];

const TIME_OPTIONS: Array<{ id: ShowingFilterOptions["timeWindow"]; label: string }> = [
  { id: "all", label: "Alle Zeiten" },
  { id: "14", label: "Ab 14:00" },
  { id: "18", label: "Ab 18:00" },
  { id: "21", label: "Ab 21:00" },
];

export function ShowingFilterBar({
  filters,
  onChangeFilters,
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
                  ? "bg-amber-600 border-amber-600 dark:bg-amber-500 dark:border-amber-500"
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
