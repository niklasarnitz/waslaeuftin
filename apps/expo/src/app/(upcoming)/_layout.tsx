import Stack from "expo-router/stack";

import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function UpcomingLayout() {
  const primaryColor = usePrimaryColor();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: primaryColor,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Demnächst" }} />
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
  );
}
