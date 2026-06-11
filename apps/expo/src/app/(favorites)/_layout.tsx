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
      <Stack.Screen name="index" options={{ title: "Meine Kinos" }} />
    </Stack>
  );
}
