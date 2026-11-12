import { Pressable } from "react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import Stack from "expo-router/stack";

import { AppIcon } from "@waslaeuftin/expo/components/app-icon";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function HomeLayout() {
  const primaryColor = usePrimaryColor();
  const router = useRouter();

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
            headerRight: isLiquidGlassAvailable()
              ? undefined
              : () => (
                  <Pressable
                    onPress={() => router.navigate("/(search)")}
                    accessibilityRole="button"
                    accessibilityLabel="Suchen"
                    hitSlop={12}
                    className="p-1"
                  >
                    <AppIcon
                      name="magnifyingglass"
                      size={22}
                      color={primaryColor}
                    />
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
    </>
  );
}
