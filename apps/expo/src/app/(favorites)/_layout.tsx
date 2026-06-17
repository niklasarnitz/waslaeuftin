import Stack from "expo-router/stack";

import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function FavoritesLayout() {
  const primaryColor = usePrimaryColor();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: primaryColor,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Erinnerungen" }} />
      <Stack.Screen
        name="(home,search,favorites,upcoming)/city/[citySlug]"
        options={{ title: "", headerLargeTitle: false }}
      />
      <Stack.Screen
        name="(home,search,favorites,upcoming)/cinema/[cinemaSlug]"
        options={{ title: "", headerLargeTitle: false }}
      />
      <Stack.Screen
        name="(home,search,favorites,upcoming)/movie/[movieName]"
        options={{ title: "", headerLargeTitle: false }}
      />
    </Stack>
  );
}
