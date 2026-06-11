import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { normalizeToStartOfDay } from "@waslaeuftin/expo/utils/date";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

interface DatePickerBarProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function DatePickerBar({ selectedDate, onChange }: DatePickerBarProps) {
  const primaryColor = usePrimaryColor();
  // Generate next 10 days
  const days = React.useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push(normalizeToStartOfDay(d));
    }
    return list;
  }, []);

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

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
          const active = isSameDay(date, selectedDate);

          let dayName = WEEKDAYS[date.getDay()];
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
                {date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
