import { useState } from "react";
import { Pressable } from "react-native";
import Stack from "expo-router/stack";
import { Ionicons } from "@expo/vector-icons";

import { glassSupported } from "@waslaeuftin/expo/components/glass";
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
            // On iOS 26 the tab-bar search button is the primary search entry,
            // so the redundant header button is hidden when glass is available.
            headerRight: glassSupported
              ? undefined
              : () => (
                  <Pressable
                    onPress={() => setSearchVisible(true)}
                    hitSlop={12}
                    className="p-1"
                  >
                    <Ionicons name="search" size={22} color={primaryColor} />
                  </Pressable>
                ),
          }}
        />
        <Stack.Screen
          name="city/[citySlug]"
          options={{ title: "", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="cinema/[cinemaSlug]"
          options={{ title: "", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="movie/[movieName]"
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
