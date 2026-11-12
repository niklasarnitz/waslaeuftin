import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import {
  createScheduleDate,
  isSameScheduleDay,
  SCHEDULE_TIME_ZONE,
} from "@waslaeuftin/core";

interface DatePickerBarProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

const dayNumberFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  timeZone: SCHEDULE_TIME_ZONE,
});
const weekdayFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  timeZone: SCHEDULE_TIME_ZONE,
});

export function DatePickerBar({ selectedDate, onChange }: DatePickerBarProps) {
  // Generate next 10 days
  const days = React.useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < 10; i++) {
      list.push(createScheduleDate(i));
    }
    return list;
  }, []);

  const handlePress = (date: Date) => {
    if (Platform.OS === "ios") void Haptics.selectionAsync();
    onChange(date);
  };

  return (
    <View className="pt-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}
      >
        {days.map((date, index) => {
          const active = isSameScheduleDay(date, selectedDate);

          let dayName = weekdayFormatter.format(date);
          if (index === 0) dayName = "Heute";
          if (index === 1) dayName = "Morgen";

          return (
            <Pressable
              key={index}
              onPress={() => handlePress(date)}
              accessibilityRole="button"
              accessibilityLabel={date.toLocaleDateString("de-DE", {
                dateStyle: "full",
                timeZone: SCHEDULE_TIME_ZONE,
              })}
              accessibilityState={{ selected: active }}
              className="justify-center active:opacity-70"
              style={{ minHeight: 44 }}
            >
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  minHeight: 32,
                }}
                className={`rounded-full ${active ? "bg-action" : ""}`}
              >
                <Text
                  className={`text-sm font-semibold tabular-nums ${
                    active ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  {dayName} {dayNumberFormatter.format(date)}.
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
