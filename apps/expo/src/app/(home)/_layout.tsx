import Stack from "expo-router/stack";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function HomeLayout() {
  const primaryColor = usePrimaryColor();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: primaryColor,
      }}
    >
      <Stack.Screen name="index" options={{ title: "wasläuft.in" }} />
    </Stack>
  );
}
