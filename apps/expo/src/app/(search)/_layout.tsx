import Stack from "expo-router/stack";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function SearchLayout() {
  const primaryColor = usePrimaryColor();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: primaryColor,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Kinos & Städte" }} />
    </Stack>
  );
}
