import { useState } from "react";
import { Pressable } from "react-native";
import Stack from "expo-router/stack";
import { Ionicons } from "@expo/vector-icons";

import { SearchModal } from "@waslaeuftin/expo/components/search-modal";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function HomeLayout() {
  const primaryColor = usePrimaryColor();
  const [searchVisible, setSearchVisible] = useState(false);

  return (
    <>
      <Stack
        screenOptions={{
          headerLargeTitle: true,
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: primaryColor,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "wasläuft.in",
            headerRight: () => (
              <Pressable
                onPress={() => setSearchVisible(true)}
                hitSlop={12}
                style={{ padding: 4 }}
              >
                <Ionicons name="search" size={22} color={primaryColor} />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="(home,search,reminders,upcoming)/city/[citySlug]"
          options={{ title: "", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="(home,search,reminders,upcoming)/cinema/[cinemaSlug]"
          options={{ title: "", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="(home,search,reminders,upcoming)/movie/[movieName]"
          options={{ title: "", headerLargeTitle: false }}
        />
      </Stack>
      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
      />
    </>
  );
}
