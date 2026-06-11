import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import {
  createScheduleDate,
  isSameScheduleDay,
  SCHEDULE_TIME_ZONE,
} from "@waslaeuftin/expo/utils/date";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

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
  const primaryColor = usePrimaryColor();
  // Generate next 10 days
  const days = React.useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < 10; i++) {
      list.push(createScheduleDate(i));
    }
    return list;
  }, []);

  const handlePress = (date: Date) => {
    Haptics.selectionAsync().catch(() => {
      /* noop */
    });
    onChange(date);
  };

  return (
    <View className="border-border bg-background border-b py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
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
              className="min-w-[70px] items-center justify-center rounded-xl px-4 py-2.5"
              style={{
                borderCurve: "continuous",
                backgroundColor: active ? primaryColor : undefined,
              }}
            >
              <Text
                className={`text-xs font-medium ${
                  active ? "text-white" : "text-muted-foreground"
                }`}
              >
                {dayName}
              </Text>
              <Text
                className={`mt-0.5 text-lg font-bold ${
                  active ? "text-white" : "text-foreground"
                }`}
              >
                {dayNumberFormatter.format(date)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
